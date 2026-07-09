# ShiftDeck — Agent Instructions

ShiftDeck is a sales/portfolio demo: a Connecteam-style workforce management SaaS for a fictional Adelaide facility-services company, built to anchor a freelance specialization in deskless-workforce software. It is not a real product with real users — every decision should optimize for **looking and behaving like a production SaaS product**, recorded in two scripted demo sequences, on a tight solo build budget.

This file holds what should always be loaded. Deeper reference material lives in on-demand skills — read the relevant one(s) before acting, don't ask the user to re-paste spec content that's already in a skill.

## Skills — read before acting, don't wait to be told

- **`shiftdeck-design-system`** — colors, tokens, spacing, motion. Read before building or styling *any* screen or component, on either platform.
- **`shiftdeck-data-model`** — schema, RLS, auto-flag thresholds, the compliance hard-block rule, seed logic. Read before writing any SQL, migration, or query.
- **`shiftdeck-ui-screens`** — screen-by-screen layout, interaction, and copy spec, plus the two Magic Moment choreographies. Read before building or reviewing a specific screen.
- **`shiftdeck-scope-guard`** — the feature kill-list and brand constraints. Read before implementing anything that isn't explicitly in the build sequence, and self-check against it before ending a session.

## Stack (fixed — do not substitute without being asked)

**Web admin console:** React 19 + Vite + TypeScript, shadcn/ui + Tailwind v4, Phosphor icons, TanStack Router + Query, Zustand (sparingly), react-hook-form + zod, dnd-kit, date-fns + @date-fns/tz, react-leaflet + OSM tiles, recharts, papaparse.

**Worker mobile app:** Expo (latest SDK) + expo-router, NativeWind v4 + react-native-reusables, phosphor-react-native, TanStack Query + supabase-js, expo-location (foreground only), expo-image-picker, expo-secure-store.

**Backend:** Supabase only — Postgres + RLS, email/password auth with seeded demo accounts, Storage (`certificates`, `task-proof` buckets), Realtime on `time_entries` / `shift_offers` / `shifts`, pg_cron for the nightly reset. No custom server. Edge Functions only if something genuinely can't run client-side.

**Deploy:** Web console + Expo web export → Vercel/Cloudflare Pages. Supabase free tier. UptimeRobot on both URLs.

## Conventions

- TypeScript strict mode, both repos.
- One `.env` per app, both read via a single `lib/supabase.ts` client file — never hardcode the Supabase URL/anon key elsewhere. `.env` is gitignored; `.env.example` ships with blank values.
- Named exports for components; colocate a component's types with the component unless shared across screens.
- Every list/table screen gets a real empty state — it's reused across every future client build off this skeleton, not a throwaway.
- Session discipline: one module per coding session, `/clear` between sessions. Run the `shiftdeck-scope-guard` self-check before ending a session.

## What this project is not

See `shiftdeck-scope-guard` for the full kill list and reasoning. In short: no payroll calculation, invoicing, chat, push infra, leave/HR, client portal, marketplace, background location tracking, or multi-company switching UI — regardless of how small or "just the UI" a version of one of these might seem in the moment.