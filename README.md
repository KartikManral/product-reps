# Product Reps

PM interview practice for interns, built to be shared. It works on phones and laptops.

- **Practice:** a 33-question library across 7 question types, a framework hint for each type, a timer, and a self-check rubric.
- **AI:** feedback on your answer (a score, a rubric, a likely follow-up and a stronger outline), plus unlimited new questions. It runs on Google Gemini's free tier.
- **Weak spots:** questions that scored 6/10 or lower come back for a redo. Your recurring gaps are listed in Progress.
- **Community:** anyone signed in with Google can post questions they were asked, upvote questions, share their own answers, mark answers helpful, and comment on any question or answer.
- **Moderation:** people can report posts. Admins can hide posts. Everyone can delete their own posts.

**Stack:** React + Vite on Vercel, Supabase for the database and Google sign-in, and a Vercel serverless function (`api/ai.js`) that calls Gemini.

---

## Setup (about 20 minutes, all free tiers)

### 1. Supabase (database + sign-in)
1. Create a project at [supabase.com](https://supabase.com). Pick the Mumbai region (`ap-south-1`) if most of your users are in India.
2. Open **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**. This creates the tables, the security rules and the 33 library questions.
3. Go to **Settings → API Keys** and copy three things:
   - your **Project URL**
   - the **Publishable key** (`sb_publishable_…`)
   - the **Secret key** (`sb_secret_…`). Never put this one in browser code.

### 2. Google sign-in
1. In the [Google Cloud console](https://console.cloud.google.com/), create a project.
2. Open **Google Auth Platform**. Set the audience to **External** and add the `openid` scope.
3. Go to **Clients → Create client** and choose **Web application**.
   - **Authorized JavaScript origins:** add `https://YOUR-APP.vercel.app` and `http://localhost:3000`.
   - **Authorized redirect URIs:** paste the callback URL shown in Supabase under **Authentication → Sign In / Providers → Google**. It looks like `https://YOUR-REF.supabase.co/auth/v1/callback`.
4. Back in Supabase, open that Google provider, turn it on, and paste the Client ID and Client Secret.
5. In Supabase, open **Authentication → URL Configuration**:
   - Set **Site URL** to `https://YOUR-APP.vercel.app`.
   - Add these **Redirect URLs**: `https://YOUR-APP.vercel.app/**` and `http://localhost:3000/**`.

> You'll only know your exact Vercel URL after step 4. Deploy once, then come back and fill it in.

### 3. Gemini API key (free)
Go to [Google AI Studio](https://aistudio.google.com/), click **Get API key**, and create a key.
The server picks the newest stable Flash model your key can use. To pin a specific model, set `GEMINI_MODEL`; the model IDs are listed in AI Studio.

### 4. GitHub + Vercel
1. Push this folder to a new GitHub repo:
   ```bash
   git init && git add . && git commit -m "Product Reps"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/product-reps.git
   git push -u origin main
   ```
2. In [Vercel](https://vercel.com), choose **Add New → Project** and import the repo. Vercel detects Vite automatically.
3. Under **Environment Variables**, add the following:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` |
   | `GEMINI_API_KEY` | your AI Studio key |
   | `AI_DAILY_LIMIT` *(optional)* | AI requests per person per day (default 20) |

4. Click **Deploy**. If you add or change variables later, redeploy so they take effect.

### 5. Make yourself an admin
Sign in on the live site once. Then run this in the Supabase SQL Editor:
```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@gmail.com');
```
Admins see **Hide** buttons on posts. Reports land in the `reports` table, which you can view in Supabase's Table Editor.

---

## Run it on your laptop
```bash
npm install
cp .env.example .env.local   # fill in the values
npx vercel dev               # runs the site and /api/ai on http://localhost:3000
```
`npm run dev` also works, but it skips the `/api/ai` function, so AI features will error locally.

## Where the data lives
- **Answers, drafts, streaks and scores:** stored in each person's own browser (localStorage). Nothing is uploaded unless they choose **Share my answer**.
- **Community posts:** questions, shared answers, comments and votes are in Supabase and public to everyone. Only signed-in users can post. The database's row-level security makes sure people can only edit or delete their own posts.
- **AI requests:** they go through `api/ai.js`. The prompts are built on the server, so the endpoint can't be used as a general-purpose free AI. Each person gets a daily cap, counted in the `ai_usage` table.

## Free-tier limits worth knowing
- **Gemini free tier:** it has per-minute and per-day limits that Google sets per project. When they're hit, people see "The free AI quota is used up for now." Raise `AI_DAILY_LIMIT` carefully.
- **Supabase free projects:** they can pause after a period of inactivity. Open the dashboard to resume.

## Project structure
```
api/ai.js                  Gemini calls, sign-in check, daily cap
supabase/schema.sql        tables, security rules, feed views, library seed
src/App.jsx                state, sign-in, data loading, navigation
src/components/
  Practice.jsx             answer sheet, timer, AI feedback, self-check
  Discussion.jsx           shared answers, helpful votes, comments
  Community.jsx            question board, posting, voting, moderation
  QuestionList.jsx         library / weak spots / AI / community list
  Progress.jsx, Frameworks.jsx
src/data.js                question library and frameworks
src/lib.js                 Supabase client, local storage, helpers
```
