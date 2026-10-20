-- Product Reps — Supabase schema
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: it drops and recreates the app's own objects (NOT your users).

-- ─────────────────────────────────────────────────────────────
-- 0. Clean slate for re-runs
-- ─────────────────────────────────────────────────────────────
drop view if exists public.comment_feed;
drop view if exists public.answer_feed;
drop view if exists public.question_feed;
drop table if exists public.reports, public.ai_usage, public.comments, public.answer_votes,
  public.answers, public.question_votes, public.questions cascade;
-- profiles is kept if it exists so people don't lose their names/admin flag.

-- ─────────────────────────────────────────────────────────────
-- 1. Profiles (one per signed-in Google user)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'PM aspirant' check (char_length(display_name) between 1 and 60),
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                  nullif(new.raw_user_meta_data ->> 'name', ''),
                  nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
                  'PM aspirant'), 60),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed up before this ran
insert into public.profiles (id, display_name, avatar_url)
select u.id,
       left(coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'PM aspirant'), 60),
       coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. Questions (library questions are seeded below; community questions are user-posted)
-- ─────────────────────────────────────────────────────────────
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  slug text unique,                                   -- library id like 'p1'; null for community
  is_library boolean not null default false,
  author_id uuid default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 15 and 400),
  category text not null check (category in ('product','metrics','rca','guess','strategy','execution','behavioral')),
  difficulty text not null check (difficulty in ('Easy','Medium','Hard')),
  minutes int not null default 15 check (minutes between 5 and 30),
  asked_at text check (asked_at is null or char_length(asked_at) <= 80),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (is_library or author_id is not null)
);
create index on public.questions (is_library, created_at desc);

create table public.question_votes (
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 3. Shared answers (one per person per question; re-sharing updates it)
-- ─────────────────────────────────────────────────────────────
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 40 and 8000),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, author_id)
);
create index on public.answers (question_id);

create table public.answer_votes (
  answer_id uuid not null references public.answers (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 4. Comments (on a question, or on one shared answer when answer_id is set)
-- ─────────────────────────────────────────────────────────────
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  answer_id uuid references public.answers (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.comments (question_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- 5. Reports (people flag spam; only admins can read them)
-- ─────────────────────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('question','answer','comment')),
  target_id uuid not null,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);

-- ─────────────────────────────────────────────────────────────
-- 6. AI usage counter (written only by the server function)
-- ─────────────────────────────────────────────────────────────
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);

create or replace function public.bump_ai_usage(p_user uuid, p_limit int)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ai_usage (user_id, day, calls) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
    where public.ai_usage.calls < p_limit
  returning calls into n;
  return n;   -- null means the daily limit is reached
end $$;
revoke all on function public.bump_ai_usage(uuid, int) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid, int) to service_role;

-- ─────────────────────────────────────────────────────────────
-- 7. Row-level security: who can read and write what
-- ─────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.questions      enable row level security;
alter table public.question_votes enable row level security;
alter table public.answers        enable row level security;
alter table public.answer_votes   enable row level security;
alter table public.comments       enable row level security;
alter table public.reports        enable row level security;
alter table public.ai_usage       enable row level security;   -- no policies: clients can't touch it

drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "edit own profile" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);
create policy "edit own profile"   on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Questions
create policy "read visible questions" on public.questions for select
  using (not hidden or author_id = auth.uid() or public.is_admin());
create policy "post own questions" on public.questions for insert to authenticated
  with check (author_id = auth.uid() and not is_library and slug is null and not hidden);
create policy "admins moderate questions" on public.questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "delete own questions" on public.questions for delete to authenticated
  using ((author_id = auth.uid() and not is_library) or public.is_admin());

create policy "votes are public" on public.question_votes for select using (true);
create policy "vote as yourself" on public.question_votes for insert to authenticated with check (user_id = auth.uid());
create policy "unvote yourself"  on public.question_votes for delete to authenticated using (user_id = auth.uid());

-- Answers
create policy "read visible answers" on public.answers for select
  using (not hidden or author_id = auth.uid() or public.is_admin());
create policy "share own answer" on public.answers for insert to authenticated
  with check (author_id = auth.uid() and not hidden);
create policy "edit own answer or moderate" on public.answers for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check ((author_id = auth.uid() and not hidden) or public.is_admin());
create policy "delete own answer" on public.answers for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "helpful votes are public" on public.answer_votes for select using (true);
create policy "mark helpful as yourself" on public.answer_votes for insert to authenticated with check (user_id = auth.uid());
create policy "unmark helpful yourself"  on public.answer_votes for delete to authenticated using (user_id = auth.uid());

-- Comments
create policy "read visible comments" on public.comments for select
  using (not hidden or author_id = auth.uid() or public.is_admin());
create policy "post own comments" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and not hidden);
create policy "admins moderate comments" on public.comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "delete own comments" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Reports
create policy "report as yourself" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "admins read reports" on public.reports for select to authenticated using (public.is_admin());
create policy "admins clear reports" on public.reports for delete to authenticated using (public.is_admin());

-- Column-level limits: people can only change their own name/photo, never is_admin
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8. Read-friendly views with counts and author names
--    security_invoker makes them obey the policies above.
-- ─────────────────────────────────────────────────────────────
create view public.question_feed with (security_invoker = on) as
select q.*,
       p.display_name as author_name,
       p.avatar_url  as author_avatar,
       (select count(*) from public.question_votes v where v.question_id = q.id)::int as votes,
       (select count(*) from public.answers a where a.question_id = q.id and not a.hidden)::int as answer_count,
       (select count(*) from public.comments c where c.question_id = q.id and not c.hidden)::int as comment_count
from public.questions q
left join public.profiles p on p.id = q.author_id;

create view public.answer_feed with (security_invoker = on) as
select a.*,
       p.display_name as author_name,
       p.avatar_url  as author_avatar,
       (select count(*) from public.answer_votes v where v.answer_id = a.id)::int as helpful
from public.answers a
join public.profiles p on p.id = a.author_id;

create view public.comment_feed with (security_invoker = on) as
select c.*, p.display_name as author_name, p.avatar_url as author_avatar
from public.comments c
join public.profiles p on p.id = c.author_id;

-- ─────────────────────────────────────────────────────────────
-- 9. Grants for the Data API (explicit, in case auto-expose is off)
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.questions, public.question_votes, public.answers,
  public.answer_votes, public.comments, public.question_feed, public.answer_feed, public.comment_feed
  to anon, authenticated;
grant insert, delete on public.questions, public.question_votes, public.answers, public.answer_votes,
  public.comments, public.reports to authenticated;
grant update (hidden) on public.questions, public.comments to authenticated;
grant update (body, hidden, updated_at) on public.answers to authenticated;
grant select, delete on public.reports to authenticated;
revoke all on public.ai_usage from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 10. Seed the 33 library questions (so people can share answers and discuss them)
-- ─────────────────────────────────────────────────────────────
insert into public.questions (slug, is_library, author_id, body, category, difficulty, minutes) values
 ('p1',true,null,'Design a product that helps first-year college students land their first internship.','product','Easy',15),
 ('p2',true,null,'Improve Google Maps for two-wheeler riders in Indian cities.','product','Medium',20),
 ('p3',true,null,'Design an alarm clock for people who are hard of hearing.','product','Medium',15),
 ('p4',true,null,'Improve the Swiggy experience when a group of friends orders together.','product','Medium',20),
 ('p5',true,null,'What''s your favorite app, and what one thing would you change about it?','product','Easy',10),
 ('p6',true,null,'Design a feature that reduces food waste for a quick-commerce grocery app.','product','Medium',20),
 ('p7',true,null,'Build a product that helps elderly parents manage their daily medicines.','product','Medium',20),
 ('m1',true,null,'You''re the PM for Instagram Reels. What''s your north star metric, and why?','metrics','Medium',15),
 ('m2',true,null,'How would you measure the success of UPI AutoPay?','metrics','Medium',15),
 ('m3',true,null,'Spotify launches Blend, a shared playlist for two friends. Define its success metrics.','metrics','Easy',12),
 ('m4',true,null,'LinkedIn adds the “Open to Work” photo frame. How do you know it worked?','metrics','Medium',15),
 ('m5',true,null,'What would you track for a new food-delivery membership with free delivery?','metrics','Medium',15),
 ('r1',true,null,'Swiggy''s daily orders dropped 15% yesterday. Investigate.','rca','Medium',20),
 ('r2',true,null,'Driver cancellations on Uber rose 10% week over week. Why?','rca','Medium',20),
 ('r3',true,null,'YouTube''s daily active users are up, but total watch time is flat. What''s going on?','rca','Hard',20),
 ('r4',true,null,'Free-trial sign-ups for your SaaS product are up 30%, but paid conversion is down. Diagnose it.','rca','Hard',20),
 ('r5',true,null,'Your app''s store rating fell from 4.5 to 3.9 in two weeks. Where do you start?','rca','Easy',15),
 ('g1',true,null,'Estimate the number of cups of chai sold in Bengaluru every day.','guess','Medium',10),
 ('g2',true,null,'Estimate how many laptops are sold in India each year.','guess','Medium',10),
 ('g3',true,null,'Estimate the annual revenue of a single pizza delivery outlet in a metro city.','guess','Medium',12),
 ('g4',true,null,'Estimate how many people are riding the Delhi Metro at 6 PM on a weekday.','guess','Hard',12),
 ('g5',true,null,'How many cricket bats are sold in India in a year?','guess','Easy',10),
 ('s1',true,null,'Should Zomato launch 10-minute medicine delivery?','strategy','Hard',20),
 ('s2',true,null,'A streaming app is considering a ₹149/month mobile-only plan in India. Would you launch it?','strategy','Medium',15),
 ('s3',true,null,'Why do you think WhatsApp launched Channels?','strategy','Medium',12),
 ('s4',true,null,'You''re a PM at Notion. Should Notion build its own AI meeting-notes feature?','strategy','Medium',15),
 ('e1',true,null,'You have five feature requests and one sprint. How do you decide what ships?','execution','Easy',10),
 ('e2',true,null,'Engineering says launch will slip three weeks. Marketing already announced the date. What do you do?','execution','Medium',12),
 ('e3',true,null,'Write a short problem statement for a bill-splitting feature in a payments app.','execution','Easy',10),
 ('b1',true,null,'Tell me about a time you disagreed with a teammate.','behavioral','Easy',8),
 ('b2',true,null,'Tell me about a project that failed. What did you learn?','behavioral','Easy',8),
 ('b3',true,null,'Why product management, and why now?','behavioral','Easy',8),
 ('b4',true,null,'Tell me about a time you used data to change someone''s mind.','behavioral','Medium',8);

-- ─────────────────────────────────────────────────────────────
-- 11. Make yourself an admin (run AFTER you've signed in once on the site):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@gmail.com');
-- ─────────────────────────────────────────────────────────────
