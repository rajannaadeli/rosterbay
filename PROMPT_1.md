# ROSTERBAY — BUILD PHASE 1 of 3: Foundation, Workers & Job Sites

You are building **RosterBay**, a workforce-management demo application. The attached [`COMPLETE_SPECS.md`](COMPLETE_SPECS.md) is the **single source of truth** for product scope, data model, UX, and design language. This prompt defines *which slice* of that spec you build now, and the engineering standards for building it.

**Precedence:** this prompt > the spec > your judgment. Naming note: if the spec says "ShiftDeck" anywhere, the product is now named **RosterBay** (domain: rosterbay.com) — update all references. If you hit genuine ambiguity, choose the simplest spec-compliant option, record it in `DECISIONS.md`, and keep moving — do not stall on questions unless something is truly blocking.

---

## 0. Current state — DO NOT re-scaffold

- An **admin web app** already exists: React + Vite + TypeScript + Tailwind + shadcn/ui initialized, Phosphor icons installed, `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- A **mobile app** already exists: Expo + expo-router + NativeWind + react-native-reusables initialized (via `@react-native-reusables/cli`), Phosphor icons installed, `.env` contains the Supabase URL and anon key.
- A **hosted Supabase project** exists and is empty.

**Your first action:** explore the workspace. Identify the actual folder names, package managers, and installed dependency versions of both apps. Adapt every command and import in this prompt to what actually exists. Never regenerate or overwrite the existing scaffolds.

---

## 1. Phase 1 scope — build ONLY this

| # | Deliverable |
|---|---|
| A | Repo hygiene: root `CLAUDE.md` + `DECISIONS.md` |
| B | Database: full schema, RLS, storage buckets, `reset_demo()` seed (spec §2, §7) |
| C | Auth seeding script for the 16 demo users |
| D | Shared TypeScript types + Supabase client/query layer in both apps |
| E | Design tokens installed in both apps (spec §6) |
| F | Web: entry flow + app shell + **Workers module** (spec §4.2) + **Job Sites module** (spec §4.3), complete |
| G | Mobile: auth bootstrap + tab shell + **Wallet screen** (spec §5.4), complete |
| H | Self-verification + final report |

**Explicitly OUT of Phase 1** (do not build, stub, or scaffold): Roster board, shifts, clock-in/timesheets, shift offers, notifications, dashboard, realtime channels, landing page polish, deployment config, dark mode. Navigation items for future modules may exist in the sidebar/tabs but must route to a single minimal "Coming in this demo" placeholder — nothing more.

---

## 2. Deliverable details

### A. CLAUDE.md + DECISIONS.md
Create a root `CLAUDE.md` that future sessions will inherit. It must capture: project one-liner; folder map; stack + versions (as discovered); design-token rules and the semantic status-color law (green/amber/red per spec §6 — no status may ever be communicated with an off-system color); TypeScript conventions (strict, no `any`, zod at boundaries); data-fetch pattern (TanStack Query hooks per feature, no fetch-in-component); commit convention; the Phase 1/2/3 boundary map; and the standing order: **no features beyond the spec, ever — the kill list in spec §10 is law.** `DECISIONS.md` starts empty with a date-stamped log format.

### B. Database (spec §2 for schema, §7 for seed)
- Write numbered SQL migration files under `/supabase/migrations/`. Include: all tables from spec §2 with FKs and sensible indexes (notably on `company_id` everywhere, `shifts(starts_at)`, `worker_certs(expires_on)`); the partial unique index enforcing first-accept-wins on `offer_responses`; storage buckets `certificates` and `task-proof` (public-read); RLS enabled on every table with policies per spec (admins/supervisors: full company scope; workers: own rows + shifts/offers addressed to them). Even though Phase 1 UI doesn't touch shifts/offers/time_entries, **create the full schema now** — Phases 2–3 must never migrate-with-regret.
- Cert status (`valid` / `expiring_soon` ≤30d / `expired`) implemented as a Postgres **view or generated logic**, not client-side math, so web and mobile can never disagree.
- `reset_demo()`: one idempotent SQL function that truncates tenant data and reseeds **everything in spec §7** — Torrens Facility Services, 14 workers + admin (Marcus Webb) + supervisor, 5 Adelaide sites with geofences/required certs/task templates, the full "deliberate mess" (Jack O'Connell's expired First Aid, the two amber certs, flagged + late timesheet history rows, the unfilled Saturday-night shift, one shift in progress *right now*, 3 weeks history + 1 week ~80%-filled future roster). **All dates computed relative to `now()` in `Australia/Adelaide`** — zero hardcoded dates. Yes, seed the shift/timesheet data even though its UI is Phase 2: the seed must be finished once, correctly.
- **Applying migrations:** if a Supabase CLI login is available in this environment, use it. If not, produce a single consolidated `supabase/setup.sql` (migrations + function, in order), then **pause and ask me to paste it into the Supabase SQL editor**, and wait for my confirmation before continuing to steps that need live data.

### C. Auth seeding (`scripts/seed-auth.ts`)
`auth.users` cannot be seeded by plain SQL. Write a small idempotent Node script using `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` (ask me to add it to a root `.env` — never commit it, add to `.gitignore` immediately) that creates the 16 demo users with **fixed, hardcoded UUIDs** exported from a shared `demo-ids.ts` constants file; `reset_demo()` references those same UUIDs for `profiles`. Demo credentials: `marcus@rosterbay.demo` / `liam@rosterbay.demo` etc., one shared demo password, documented in the final report.

### D. Types + data layer
Hand-write `database.types.ts` matching the schema exactly (or generate via CLI if available), shared or mirrored across both apps — your call, log it. Each app gets a typed Supabase client singleton and a `features/<module>/` structure: `api.ts` (queries/mutations), `hooks.ts` (TanStack Query), `components/`. React Query defaults: sensible `staleTime`, no refetch-on-focus storms.

### E. Design tokens (spec §6 — exact values)
Web: Tailwind/shadcn CSS variables set to the spec palette (surface `#FAFAF9`, ink stone-900, accent teal `#0F766E`, semantic green/amber/red), radius 10px, Inter loaded. Mobile: same palette through the NativeWind theme + react-native-reusables tokens. Build one shared-looking `StatusPill` component in each app (Compliant / Expiring / Expired and the generic status variants) — these two components are the visual contract between the apps.

### F. Web app — entry, shell, Workers, Job Sites
1. **Entry (spec §3, minimal Phase-1 version):** a clean `/` page with the RosterBay wordmark (text is fine this phase), tagline, and two buttons — "Explore as Agency Admin" and "Explore as Worker (Liam)". Admin button signs in via `signInWithPassword` with Marcus's seeded credentials → `/app`. Worker button can link to a short "the worker experience lives in the mobile app" note this phase. Include the dismissible "Demo data resets nightly — click anything" banner inside the shell.
2. **Shell (spec §4):** left sidebar (Dashboard, Roster, Workers, Timesheets, Job Sites — Phosphor duotone icons), topbar with company name + today's date in ACST. Non-Phase-1 items route to the single placeholder.
3. **Workers module — complete per spec §4.2:** table (avatar+name, job title, phone, computed compliance pill, shifts-this-week from seeded data, last clock-in), role/compliance filters, search; worker detail (sheet or route — pick and log): profile header, **Document Wallet** cert-card grid with expiry states and file preview links, drag-drop upload to the `certificates` bucket (creates a `worker_certs` row), shift history list from seed, availability notes. Implement the red-border expired-cert card with the *"Blocking assignment at: <site> (requires <cert>)"* line computed from `job_sites.required_cert_type_ids`.
4. **Job Sites module — complete per spec §4.3:** card grid (name, client, address, required-cert chips, task count, mini-map thumbnail via react-leaflet + OSM tiles); site detail: leaflet map with **draggable pin and radius circle bound to a 50–500m slider**, required-certs multi-select, **task template editor** (add/edit/delete/reorder, per-item `requires_photo` toggle). Full CRUD for sites.
5. Every list gets a designed empty state and loading skeletons — no spinner-only screens (spec §6).

### G. Mobile app — auth, shell, Wallet
1. Auth: a minimal branded sign-in screen prefilled with Liam's demo credentials + a "Use demo worker" one-tap; session persisted via expo-secure-store.
2. Tab shell (spec §5): Today · Schedule · Offers · Wallet + bell icon. Today/Schedule/Offers render a clean branded placeholder this phase.
3. **Wallet — complete per spec §5.4:** cert cards mirroring the web states exactly (same colors, same computed status), expiry countdown text ("expires in 12 days"), **Add document** via expo-image-picker (camera or library) uploading to `certificates` and inserting the row. This screen must look finished — it's the phase's mobile proof.

### H. Verification + report
Before declaring done: typecheck + build pass in both apps; `reset_demo()` runs twice cleanly (idempotency proof); lint clean. Commit per milestone (A→G) with conventional messages. Then produce a final report: what was built; exact run commands for both apps; the demo credentials; a **manual QA checklist for me** (must include: entry button lands Marcus on `/app`; Workers table shows 14 workers with correct pills; Jack O'Connell opens with the expired-First-Aid blocking line naming the hospital site; site geofence slider visibly resizes the circle and persists; mobile signs in as Liam and Wallet shows his certs with states matching the web); and a list of anything deferred, with reasons, mapped to Phase 2 or 3.

---

## 3. Engineering standards (binding)

- TypeScript strict everywhere; zod validation on every form; no `any`, no `@ts-ignore` without a `DECISIONS.md` entry.
- No packages beyond the spec §1 stack without logging the reason. No UI library other than shadcn/reusables primitives.
- Components small and feature-scoped; pages compose features, they don't contain them.
- All timestamps stored UTC, all display formatting through a single `formatACST()` util per app.
- Accessibility floor: real buttons/labels, focus-visible states, table semantics.
- Never invent product features. If a screen feels sparse, the answer is seeded data density and polish — not new features.

Begin with the workspace exploration, then read the attached spec end-to-end, then post a short build plan (files you'll create, order of work) before writing code.