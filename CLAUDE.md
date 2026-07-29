# RosterBay — Project Instructions

**One-liner:** RosterBay (rosterbay.com) is a workforce-management sales demo — roster, verify, and track a fictional Adelaide facility-services company (Torrens Facility Services) — built as a portfolio anchor for the deskless-workforce freelance vertical. It must look and behave like a production SaaS, on a strict scope budget.

**Naming:** the product is **RosterBay** everywhere. Older material (spec, skills) may say "ShiftDeck" — treat every such reference as RosterBay. The tenant stays Torrens Facility Services; timezone stays `Australia/Adelaide` (ACST, UTC+9:30 — the half-hour offset must be correct everywhere).

Read the project skills before acting: `shiftdeck-data-model` (SQL/RLS/seed), `shiftdeck-design-system` (tokens/motion), `shiftdeck-ui-screens` (layout/copy), `shiftdeck-scope-guard` (kill list). `COMPLETE_SPECS.md` is the product source of truth; the active phase prompt takes precedence over it.

## Folder map

```
admin/     Web admin console — React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind v4
           + shadcn (base-maia style, @base-ui/react) + Phosphor icons.
           src/features/<module>/{api.ts,hooks.ts,components/} · src/components/ (shared)
           · src/components/ui/ (shadcn primitives) · src/lib/ (supabase, types, format)
mobile/    Worker app — Expo SDK 56 + expo-router + NativeWind v4 + react-native-reusables
           (@rn-primitives) + phosphor-react-native.
           app/ (routes) · features/<module>/ · components/ · lib/
supabase/  Numbered SQL migrations + setup.sql (consolidated, paste-into-SQL-editor)
scripts/   Node scripts (auth seeding). demo-ids.ts is the single source of fixed demo UUIDs.
```

Package manager: **npm** in both apps. Env: `admin/.env` uses `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; `mobile/.env` uses `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`. URLs are the **base** project URL (no `/rest/v1/`). Root `.env` holds `SUPABASE_SERVICE_ROLE_KEY` for scripts only — never committed, never imported by app code.

## Design tokens

**`admin/src/index.css` is the single source of truth for the web console** (rebuilt 2026-07-29, Visual Transformation Phase 1 — see DECISIONS.md). Never hardcode a color, font size, shadow or radius outside it; if a screen needs a value that isn't there, add it there first.

- **Both themes are designed.** Light is the product default; dark is a real design (layered near-blacks `#0A0B0D`→`#121418`→`#191C21`→`#21252B`, luminous teal `#2DD4BF`), not an inversion. Light keeps the spec §6 hues and gains the same ladder.
- **Ladders, not flat values:** surface 1/2/3 · border subtle/default/strong · text primary/secondary/tertiary · elevation `.e0`–`.e3`. Every shadcn token (`--card`, `--muted`, `--border`…) is an *alias* onto these — never an independent value.
- **One accent** still. `--accent-glow` is dark-only and permitted in exactly three places: primary actions, live indicators, active nav.
- **Radius ladder 6/8/12/16** (`rounded-xs`/`sm`/`lg`/`xl`) — this supersedes the old "10px everywhere" law.
- **Type:** ITC Avant Garde Gothic Std Medium (self-hosted from `admin/public/fonts`; no remote font imports) over Inter as the fallback, + **JetBrains Mono** for data. Scale `text-display/h2/h3/body/small/micro` — no ad-hoc sizes. Every numeral, time, duration, distance, count, code and ID uses `.num` (mono + tabular). `.label-micro` is the uppercase eyebrow.
- **Motion:** `--duration-*` / `--ease-*` + `fade-up`/`shimmer`/`live-pulse` keyframes and `.stagger` in CSS; `lib/motion.ts` for JS-driven cases. **No animation library** — so `prefers-reduced-motion` is honoured in one media query.

**Mobile has NOT been migrated** — it still runs the warm-Stone tokens in `mobile/global.css` + `lib/colors.ts` + `lib/theme.ts`. The two apps are knowingly divergent; porting the ladder is the first task of any mobile phase.

**Semantic status colors are unchanged and still law** (green/amber/red, below).

**Semantic status-color law:** green = compliant/approved/on-site/filled · amber = expiring/pending/warning · red = expired/unfilled/flagged/blocked. Each is tuned per theme (`--success`/`--warning`/`--danger` plus a `*-muted` fill) — the *meaning* is fixed, the hex is not. **No status may ever be communicated with an off-system color.** No new hex values in components; no blue "info" badge; neutrals come from the surface/text ladders. `StatusPill` (one per app) is the canonical rendering, and on web it maps straight onto the matching `Badge` variant — reuse it, don't re-implement.

Skeletons wherever loading happens — no spinner-only screens; web skeletons shimmer (`.shimmer`), never spin. Every list gets a designed empty state — on web, `EmptyState` with a drawn `glyph`.

## TypeScript & data conventions

- Strict mode, no `any`, no `@ts-ignore` without a DECISIONS.md entry. zod validates every form and every external boundary.
- Data fetching: TanStack Query hooks per feature (`features/<module>/hooks.ts` wrapping `api.ts`). **No fetch-in-component, no useEffect fetching.** Query defaults: `staleTime` 60s, `refetchOnWindowFocus: false`.
- One typed Supabase client singleton per app (`lib/supabase.ts`) — never instantiate elsewhere, never hardcode URL/keys.
- `database.types.ts` is hand-written and **mirrored** in `admin/src/lib/` and `mobile/lib/` — when the schema changes, update both in the same session.
- Cert status (`valid`/`expiring_soon`/`expired`) is computed **in Postgres** (view `worker_certs_with_status`) — clients read it, never recompute it.
- All timestamps stored UTC; all display formatting goes through each app's single `formatACST()` util (`lib/format.ts`). Never call date-fns format with a timezone inline in a component.
- Named exports for components; components small and feature-scoped; pages compose features, they don't contain them.
- UI primitives are **installed via CLI**, never hand-written: `npx shadcn@latest add <component>` (admin) / `npx @react-native-reusables/cli@latest add <component>` (mobile). Only product-specific components (StatusPill, empty states, feature components) are custom, and they build on the installed primitives.
- Accessibility floor: real `<button>`/`<label>`, focus-visible states, proper table semantics.

## Commits

Conventional commits: `feat(scope): …`, `fix(scope): …`, `chore(scope): …`, `docs: …`. Scope = `db`, `admin`, `mobile`, `scripts`, `repo`. One commit per milestone minimum.

## Phase boundaries

- **Phase 1 (done):** schema + RLS + seed, auth seeding, tokens, web entry/shell + Workers + Job Sites, mobile auth/tabs + Wallet.
- **Phase 2 (done):** Roster board (week grid, drag-assign, conflict engine + vitest, shift CRUD), web Timesheets (flags, review, bulk approve, CSV), mobile Today (geofence clock-in, in-shift tasks/photos, report issue) + Schedule, realtime MM1-lite (live timesheet rows + roster chips). Broadcast affordances deliberately absent — Phase 3.
- **Phase 3 (done):** Offers (first-accept-wins via DB trigger) + broadcast from roster/dashboard, notifications (both surfaces), Dashboard (KPIs, live map, feed — MM1 staged), landing final + OG meta, phone-frame worker web, ops (pg_cron, keep-alive, vercel configs, DEPLOY.md). Deploy itself follows the DEPLOY.md runbook (account-level steps are manual).

Placeholder rule: future-phase nav items route to the single "Coming in this demo" placeholder — never stub partial screens.

## Standing order

**No features beyond the spec, ever — the kill list in spec §10 is law:** no payroll calculation, invoicing, chat, push infra, leave/HR, client portal, marketplace, background location, or multi-company UI — not even "just the UI shell." If a screen feels sparse, the answer is seeded-data density and polish, not new features. Run the `shiftdeck-scope-guard` self-check before ending any session.
