-- Product Reps migration v2 (written against the real supabase/schema.sql in the repo)
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- DO NOT re-run supabase/schema.sql afterwards: it drops the questions, votes,
-- answers and comments tables and would delete all community data.
--
-- What this does
--   1. Adds is_anonymous and round to questions (existing questions keep their names)
--   2. Makes "I was asked this too" reuse the existing question_votes table,
--      and blocks voting on your own question
--   3. Hides author_id for anonymous questions (table and question_feed view)
--   4. Auto-hides a question after 3 reports
--   5. Limits each user to 10 new questions per day

-- 1. New columns ------------------------------------------------------------
alter table public.questions
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists round text;

-- existing questions stay as they are; NEW questions default to anonymous
alter table public.questions alter column is_anonymous set default true;

alter table public.questions drop constraint if exists questions_round_check;
alter table public.questions add constraint questions_round_check
  check (round is null or round in ('OA','Screening','Product round','Final','HR'));

-- 2. "I was asked this too" = question_votes; block self-votes -----------------
create or replace function public.is_own_question(qid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.questions where id = qid and author_id = auth.uid())
$$;
grant execute on function public.is_own_question(uuid) to authenticated;

drop policy if exists "vote as yourself" on public.question_votes;
create policy "vote as yourself" on public.question_votes for insert to authenticated
  with check (user_id = auth.uid() and not public.is_own_question(question_id));

-- 3. Stop author_id leaking for anonymous questions ----------------------------
-- Clients can no longer read author_id straight from the table. Everything that
-- needs it goes through question_feed, which masks it.
revoke select on public.questions from anon, authenticated;
grant select (id, slug, is_library, body, category, difficulty, minutes, asked_at,
              hidden, created_at, is_anonymous, round)
  on public.questions to anon, authenticated;

-- The view now runs as its owner (not security_invoker) so it can read author_id,
-- so it repeats the "who can see hidden questions" rule itself.
drop view if exists public.question_feed;
create view public.question_feed as
select q.id,
       q.slug,
       q.is_library,
       case when q.is_anonymous and q.author_id is distinct from auth.uid()
            then null else q.author_id end                                   as author_id,
       q.body,
       q.category,
       q.difficulty,
       q.minutes,
       q.asked_at,
       q.hidden,
       q.created_at,
       q.is_anonymous,
       q.round,
       case when q.is_anonymous and q.author_id is distinct from auth.uid()
            then null else p.display_name end                                as author_name,
       case when q.is_anonymous and q.author_id is distinct from auth.uid()
            then null else p.avatar_url end                                  as author_avatar,
       (select count(*) from public.question_votes v where v.question_id = q.id)::int as votes,
       (select count(*) from public.answers a where a.question_id = q.id and not a.hidden)::int as answer_count,
       (select count(*) from public.comments c where c.question_id = q.id and not c.hidden)::int as comment_count
from public.questions q
left join public.profiles p on p.id = q.author_id
where not q.hidden or q.author_id = auth.uid() or public.is_admin();

grant select on public.question_feed to anon, authenticated;

-- 4. Auto-hide a question after 3 reports (admins can still unhide) ------------
create or replace function public.auto_hide_reported()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'question'
     and (select count(*) from public.reports
          where target_type = 'question' and target_id = new.target_id) >= 3 then
    update public.questions set hidden = true where id = new.target_id and not is_library;
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_hide_reported on public.reports;
create trigger trg_auto_hide_reported
  after insert on public.reports
  for each row execute function public.auto_hide_reported();

-- 5. Max 10 new community questions per user per day ----------------------------
create or replace function public.limit_daily_questions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_library
     and (select count(*) from public.questions
          where author_id = new.author_id and not is_library
            and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Daily limit reached: you can add up to 10 questions per day.';
  end if;
  return new;
end $$;

drop trigger if exists trg_limit_daily_questions on public.questions;
create trigger trg_limit_daily_questions
  before insert on public.questions
  for each row execute function public.limit_daily_questions();

-- ------------------------------------------------------------------------------
-- Quick checks after running (use the SQL editor's "role" switcher, or the app):
--   as anon:   select author_id from public.questions;          -> must fail (permission denied)
--   as anon:   select id, body from public.questions limit 1;   -> works
--   as anon:   select author_id, author_name from public.question_feed
--              where is_anonymous limit 5;                       -> author columns are null
--   in app:    sign in, post anonymously, see "You" on your own question
--              but Anonymous when signed out; voting on your own question is refused.
-- ------------------------------------------------------------------------------
