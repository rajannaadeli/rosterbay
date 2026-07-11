# RosterBay — Deploy Runbook

Manual, account-level steps in order. Everything code-side is already committed.
Items marked **[you]** need your accounts/credentials; nothing else proceeds until they're done.

## 0. Database (5 min) — prerequisite for everything

1. **[you]** Supabase SQL editor → paste and run `supabase/migrations/0007_offers.sql`, then `0008_pg_cron.sql`.
   (Live DB is currently on 0001–0006. Fresh projects can run `supabase/setup.sql` instead.)
2. **[you]** Dashboard → Database → Extensions → enable **pg_cron** → re-run `0008_pg_cron.sql`.
   Expect the notice `rosterbay-nightly-reset scheduled`. Verify: `select jobname, schedule from cron.job;`
3. **[you]** Dashboard → Database → Replication (or Publications) → confirm `supabase_realtime`
   includes: `time_entries`, `shifts`, `shift_offers`, `notifications`.

## 1. Vercel — admin console → rosterbay.com (15 min)

1. **[you]** vercel.com → Add New Project → import the GitHub repo → **Root Directory: `admin`**.
   Framework: Vite (auto). Build command / output dir come from `admin/vercel.json`.
2. **[you]** Project → Settings → Environment Variables (Production + Preview):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://pjlpfutdktviadtpimcc.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your anon (publishable) key |
   | `VITE_WORKER_APP_URL` | `https://worker.rosterbay.com` |
   | `VITE_APK_URL` | *(blank for now — step 4 fills it)* |
   | `VITE_PORTFOLIO_URL` | `https://rajanna.dev` |
   | `VITE_UPWORK_URL` | your Upwork profile URL |

3. **[you]** Deploy → Project → Settings → Domains → add `rosterbay.com` (+ `www` redirect).
   At your registrar: `A` record `@ → 76.76.21.21`, `CNAME` `www → cname.vercel-dns.com`.

## 2. Worker web export → worker.rosterbay.com (15 min)

1. Build the export locally (repo root):
   ```
   cd mobile && EXPO_PUBLIC_SUPABASE_URL=https://pjlpfutdktviadtpimcc.supabase.co \
     EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key> npx expo export --platform web
   ```
   Output lands in `mobile/dist/`.
2. **[you]** Second Vercel project → same repo → **Root Directory: `mobile`** →
   Build command: `npx expo export --platform web` → Output dir: `dist` →
   env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. **[you]** Domains → add `worker.rosterbay.com`; registrar: `CNAME` `worker → cname.vercel-dns.com`.
4. Sanity: `https://worker.rosterbay.com/?demo=1` should auto-sign-in as Liam;
   `https://rosterbay.com/worker` should show it inside the phone frame.

## 3. GitHub repo secrets (2 min)

**[you]** Repo → Settings → Secrets and variables → Actions → add:
- `SUPABASE_URL` = `https://pjlpfutdktviadtpimcc.supabase.co`
- `SUPABASE_ANON_KEY` = anon key

Then Actions tab → run **Supabase keep-alive** once manually to confirm green.

## 4. Android APK (20 min, mostly waiting)

1. **[you]** `cd mobile && npx eas login` (Expo account) → `npx eas build:configure` if prompted →
   `npx eas build -p android --profile preview`
2. When the build finishes, copy the **build artifact URL** from the EAS output/dashboard.
3. **[you]** Paste it into Vercel (admin project) as `VITE_APK_URL` → redeploy.
   The landing page's "Install the worker app (APK)" link goes live automatically.

## 5. UptimeRobot (5 min)

**[you]** uptimerobot.com → two HTTP(S) monitors, 5-min interval:
- `https://rosterbay.com`
- `https://worker.rosterbay.com`

## 6. Post-deploy verification (I do this once you say the steps above are done)

- Incognito → rosterbay.com → both entry buttons cold; OG unfurl via a link-preview checker.
- MM1 + MM2 rehearsals against production.
- Manually `select public.reset_demo();` in the SQL editor → app returns to pristine mess.
