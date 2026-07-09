# ShiftDeck — Demo App Specification
### Workforce operations demo for the deskless-workforce freelance vertical

**Purpose (one line):** A sales asset that makes a staffing/facility-services ops manager see their own business on screen within 60 seconds — and doubles as the starter skeleton for every future client project in this vertical.

---

## 0. Brand & Costume

| Decision | Value |
|---|---|
| Demo product name | **ShiftDeck** (alternates: CrewBoard, RosterBay — quick-Google whichever you pick before buying the domain; avoid real products: Deputy, Tanda, Connecteam, ShiftCare, Skedulo) |
| Domain | `shiftdeck.app` / `.dev` / `getshiftdeck.com` — whichever is cheap; ~₹1,000/yr |
| Fictional company (tenant) | **Torrens Facility Services** — Adelaide, South Australia. Commercial cleaning + security guarding. ~14 field workers, 5 client sites |
| Timezone | `Australia/Adelaide` (ACST, UTC+9:30 — the half-hour offset is a quiet domain-knowledge flex; get it right everywhere) |
| Logo | Simple wordmark + one glyph (Phosphor `SquaresFour` or `CalendarCheck` restyled). One evening, no more |
| Tagline on landing | "Roster, verify, and track your field workforce." |

**Landing page footer (do not skip):** *"ShiftDeck is a demonstration platform built by Rajesh [surname] — full-stack developer specializing in workforce management software. → [Upwork profile] [Portfolio]"* — every prospect who explores the demo is one click from hiring you.

---

## 1. Tech Stack (your setup + the gaps filled)

### Web — Admin Console
| Layer | Choice | Notes |
|---|---|---|
| Framework | **React 19 + Vite + TypeScript** | Your call, and correct: a demo needs no SEO/SSR — Vite is simpler and deploys anywhere static |
| UI | **shadcn/ui + Tailwind v4** | Customize the preset once (see §6 design tokens) before building screens |
| Icons | **Phosphor** (`@phosphor-icons/react`) | Duotone weight for nav/status, regular elsewhere — consistent weight discipline |
| Routing | **TanStack Router** | Type-safe, pairs with Query; React Router v7 fine if you prefer familiarity |
| Server state | **TanStack Query v5** | Same as WhiteFleet mobile — patterns transfer |
| UI state | **Zustand** (sparingly) | Roster drag state, filters; keep almost everything in Query |
| Forms | **react-hook-form + zod** | Zod schemas shared with seed script types |
| Drag & drop | **dnd-kit** | Roster board drag-to-assign |
| Dates | **date-fns + @date-fns/tz** | All display logic in `Australia/Adelaide` |
| Map | **react-leaflet + OpenStreetMap tiles** | Free, no API key, no billing surprise. Used: dashboard live view, site geofence editor, timesheet GPS snippets |
| Charts | **recharts** | Dashboard sparklines only — resist chart sprawl |
| CSV export | **papaparse** (unparse) | Payroll-ready timesheet export |

### Mobile — Worker App
| Layer | Choice | Notes |
|---|---|---|
| Framework | **Expo (latest SDK) + expo-router** | Your `react-native-reusables` init is right; New Architecture on |
| UI | **NativeWind v4 + react-native-reusables** | Same design tokens as web (§6) |
| Icons | **phosphor-react-native** | Match web weights |
| Server state | **TanStack Query v5 + supabase-js** | |
| Location | **expo-location** | Foreground permission only. Geofence check is client-side distance math (haversine) — no background tracking (kill-list: it's a demo) |
| Camera/photos | **expo-image-picker** | Task photo proof, cert uploads |
| Session | **expo-secure-store** | Reuse your SecureStore chunking adapter pattern |
| Web export | `npx expo export --platform web` | Hosted at `app.shiftdeck.xxx` inside a phone-frame page — desktop prospects try the worker app instantly. Browser geolocation + file-input fallbacks make clock-in and photo proof work on web too |
| Native build | **EAS free tier → APK** | Link on landing for serious prospects |

### Backend — Supabase (entire backend)
| Piece | Use |
|---|---|
| Postgres + **RLS** | Multi-tenant via `company_id` on every table; RLS policies per role (admin / supervisor / worker). One seeded tenant, but the *architecture* is multi-tenant — that's a case-study claim you can defend |
| Auth | Email/password, seeded demo accounts. Entry buttons call `signInWithPassword` with known demo creds — acceptable for a demo, never for production (say exactly this if a prospect asks; it's a competence signal) |
| Storage | Buckets: `certificates`, `task-proof` (public-read for demo simplicity) |
| Realtime | Channels on `time_entries`, `shift_offers`, `shifts` — powers both magic moments |
| Edge Functions | Only if truly needed; conflict-checking runs client-side against fetched data. Keep zero custom servers |
| **pg_cron** | Nightly reset: one SQL function truncates + reseeds (see §7). No GitHub Action needed for reset — but keep a GH Action daily ping as free-tier keep-alive |

### Deploy
Web console → **Vercel** (or Cloudflare Pages). Expo web export → same host, subdomain/route. Supabase free tier. **UptimeRobot** (free) on both URLs. Cash cost: domain only.

---

## 2. Data Model (tables → key fields)

All tables carry `company_id` (FK → companies) + `created_at`. RLS: admins see company rows; workers see own rows + offered/assigned shifts.

```
companies        id, name, timezone
profiles         id (auth.uid), company_id, role ('admin'|'supervisor'|'worker'),
                 full_name, phone, avatar_url, job_title ('Cleaner'|'Security Guard'|...)
cert_types       id, company_id, name, code, validity_months, requires_document
worker_certs     id, worker_id, cert_type_id, issued_on, expires_on, file_url,
                 status GENERATED ('valid'|'expiring_soon'|'expired')  -- view or computed client-side
job_sites        id, name, address, lat, lng, geofence_radius_m,
                 required_cert_type_ids uuid[], client_name
task_templates   id, site_id, title, requires_photo bool, sort_order
shifts           id, site_id, worker_id (nullable = unfilled), starts_at, ends_at,
                 role_required, status ('open'|'assigned'|'in_progress'|'completed'|'cancelled'),
                 notes
shift_offers     id, shift_id, broadcast_at, status ('open'|'filled'|'expired')
offer_responses  id, offer_id, worker_id, responded_at, accepted bool
                 -- first accepted response wins; enforce with unique partial index on (offer_id) where accepted
shift_tasks      id, shift_id, template_id, title, requires_photo, done bool,
                 done_at, photo_url
time_entries     id, shift_id, worker_id, clock_in_at, clock_out_at,
                 in_lat, in_lng, out_lat, out_lng, distance_from_site_m,
                 within_geofence bool, flags text[] ('late','out_of_zone','missing_clock_out'),
                 status ('pending'|'approved'|'flagged'|'rejected'), reviewed_by, reviewed_at
issues           id, shift_id, worker_id, note, photo_url, created_at
notifications    id, user_id, kind, title, body, ref_id, read bool
```

**Auto-flag rules (client/db logic):** clock-in >15 min after `starts_at` → `late`. `distance_from_site_m > geofence_radius_m` → `out_of_zone`. No clock-out 2h after `ends_at` → `missing_clock_out`. Flagged entries land `status='flagged'`, others `pending`.

**Compliance rule (the money interaction):** assigning/accepting a worker whose certs don't cover `job_sites.required_cert_type_ids` (missing or expired) → hard-block with explanatory UI, admin can override with a logged reason. This single rule is the most domain-literate thing in the demo.

---

## 3. Entry Experience (no signup wall)

**Landing page (one screen):** wordmark, tagline, two large buttons — **"Explore as Agency Admin"** / **"Explore as Worker (Liam, Security Guard)"** — a third quiet link "Install the worker app (APK)", and the hire-me footer. Buttons auto-sign-in to seeded accounts and land on Dashboard / Today respectively. A dismissible banner inside both apps: *"Demo data resets nightly. Everything you click is editable — go ahead."* (Explicit permission to play = engagement.)

---

## 4. Admin Console — Screens & UX

Shell: left sidebar (Dashboard, Roster, Workers, Timesheets, Job Sites), topbar with company name + date, content max-width ~1440. Every list has a real empty state designed anyway (you'll reuse this skeleton for clients).

### 4.1 Dashboard — "the ops manager's 7am"
- **KPI row (4 stat cards):** On Site Now · Unfilled Shifts Today · Certs Expiring ≤30d · Timesheets Awaiting Review. Each card clicks through to the filtered view.
- **Live map (leaflet):** site markers; green pulsing dots = clocked-in workers (Realtime-driven). This is Magic Moment #1's stage.
- **Needs Attention list:** unfilled shifts (red, with **Broadcast** button inline), flagged timesheets (amber), expired certs (red). Sorted by urgency, each row actionable.
- **Live activity feed:** "Liam N. clocked in at Westfield Marion — 6:58 AM", "Shift offer accepted by Priya S." — Realtime inserts animate in.

### 4.2 Workers
- Table: avatar+name, job title, phone, **compliance pill** (✓ Compliant / ⚠ Expiring / ✕ Expired — the pill is computed across all their certs), shifts this week, last clock-in. Filter: role, compliance state. Search.
- **Worker detail (sheet or page):** profile header; **Document Wallet** — cert cards in a grid, each showing type, expiry date, status color, file preview; upload button (drag-drop); shift history; availability notes.
- UX detail that sells: expired cert card gets a red left-border and a line — *"Blocking assignment at: CBD Tower (requires First Aid)"* — connecting the document to its operational consequence.

### 4.3 Job Sites
- Card grid: site name, client, address, mini-map thumb, required-cert chips, tasks count.
- **Site detail:** leaflet map with **draggable pin + radius circle bound to a slider** (50–500m) — editing a geofence visually is a screenshot star; required certs multi-select; **task template editor** (sortable checklist, per-item `requires_photo` toggle).

### 4.4 Roster Board (the centerpiece screen)
- **Week grid: sites as rows × days as columns.** Shift chips inside cells: filled = worker avatar + name + time; **unfilled = dashed red outline chip** with time + "Broadcast" icon-button.
- Left panel: worker list (drag source) with compliance pills, filterable by role.
- **Drag worker → shift chip:** on drop, run conflict check →
  - ✕ **hard-block popover** (red): "Sarah's Security Licence expired 12 Mar — required at this site" / "Already assigned 6–2 at CBD Tower" — with override-with-reason for cert only, never for double-booking.
  - ⚠ soft warn (amber): ">38 hrs this week".
- Shift create: click empty cell → modal (time presets: Morning 6–2, Arvo 2–10, Night 10–6 — AU shift slang in the presets).
- **Broadcast** on unfilled chip → confirms eligible-worker count ("7 compliant workers will be notified") → creates offer → chip shows radar-pulse animation until filled. Magic Moment #2's stage.

### 4.5 Timesheets
- Grouped by day → rows per entry: worker, site, scheduled vs actual times, **variance badge**, flags as small icons (clock = late, map-pin-slash = out of zone), status chip.
- Row expand: mini-map with site circle + clock-in point + **distance ("clocked in 340m from site")**, timestamps, flag explanations.
- Actions: Approve / Flag per row; **bulk-approve clean entries** (one click clears the pending pile — ops managers will audibly sigh with relief); **Export CSV** — columns: worker, site, date, sched start/end, actual start/end, break, total hrs, status. Header comment row: "payroll-ready".

---

## 5. Worker App — Screens & UX

Tab bar: **Today · Schedule · Offers · Wallet** (+ bell icon top-right → notifications list). Thumb-zone: primary actions bottom 40% of screen.

### 5.1 Today
- **Next-shift card:** site, address, time, countdown ("starts in 1h 20m"), distance to site ("2.3 km away"), site cert requirements as met/unmet ticks.
- **Clock In** — giant button. Behavior: *always allowed*, but if outside geofence → confirm sheet: "You're 340m from Westfield Marion. Clock in anyway? Your entry will be flagged for review." (This is the realistic behavior — hard-blocking GPS clock-in causes real-world worker rage; *knowing that* is domain knowledge, and it's also how the demo's flagged-entry seed data gets a live sibling.)
- **In-shift mode** (after clock-in, card transforms): elapsed timer, **task checklist** — tap to tick; camera-required tasks open capture → thumbnail attaches; progress ring (4/6). **Report Issue** button → note + photo → lands in admin feed. **Clock Out** at bottom.

### 5.2 Schedule — upcoming shifts grouped by day; shift detail shows site map-free info block (address, requirements, notes, task preview).

### 5.3 Offers — open broadcast cards: site, day/time, "3 others viewing" (harmless realtime garnish), **Accept Shift** button. First accept wins: winner gets success + shift added; others see card flip to "Filled" in realtime. Losing gracefully is part of the demo choreography.

### 5.4 Wallet — cert cards mirroring admin's states (green/amber/red), expiry countdowns ("expires in 12 days"), **Add document** → camera/file. The worker-owns-their-documents framing from your WhiteFleet thinking, distilled.

---

## 6. Design Language (both apps — set tokens before first screen)

- **Base:** near-white surface `#FAFAF9`, ink `#1C1917` (stone scale). **One accent:** deep teal `#0F766E` (differentiates from the sea of indigo dashboards). Font: **Inter** (web) / system (mobile).
- **Semantic status colors — used with total consistency:** green `#16A34A` = compliant/approved/on-site · amber `#D97706` = expiring/pending/warning · red `#DC2626` = expired/unfilled/flagged. A user should learn the color system in 10 seconds and never be surprised again.
- Radius 10px, shadows whisper-quiet, 1px borders do the separating. Density: comfortable in cards, compact in tables.
- **Micro-interactions (cheap, high-signal):** realtime rows animate in (200ms slide+fade); broadcast chips pulse; task ticks spring; KPI numbers count up on load. Skeletons everywhere loading happens; no spinner-only screens.
- Light mode is canonical (screenshots, video). Dark mode: only if it costs nothing at the end (shadcn tokens make it cheap — but it's polish-day work, not build-week work).

---

## 7. Seed Data — "realistic, slightly messy, never stale"

**Golden rule: all dates generated relative to `now()` in Australia/Adelaide.** The seed is a SQL function `reset_demo()` (idempotent: truncate tenant data → reinsert), scheduled nightly at 03:00 ACST via pg_cron. Manual "Reset demo" also exposed nowhere in UI — it's automatic only.

- **Company:** Torrens Facility Services, Adelaide.
- **People:** 1 admin (Marcus Webb, Ops Manager — the account prospects enter as), 1 supervisor, **14 workers** — realistic multicultural AU names (Liam Nguyen, Priya Sharma, Jack O'Connell, Fatima Hassan, Ethan Walker, Mei Chen…), 8 cleaners / 6 security guards, avatars from a consistent generated set.
- **Cert types:** White Card (CPCWHS1001), First Aid (HLTAID011), National Police Check, SA Security Agents Licence, Working at Heights. Validity months set realistically.
- **Sites (5):** CBD office tower (King William St), Westfield-style shopping centre (Marion), private hospital (North Adelaide), logistics warehouse (Wingfield), events venue (riverbank). Geofences 80–250m. Each: required certs (hospital → Police Check + First Aid; all → White Card; security roles → SA licence) + 4–6 task templates (2 requiring photos: "Photograph secured loading dock", "Photo of cleaned lobby floor").
- **Deliberate mess (the domain-knowledge stanza):**
  - Jack O'Connell's First Aid **expired 6 days ago** → he's visibly blocked from the hospital roster.
  - Two workers with certs **expiring in 9 and 13 days** → amber pills, dashboard count = 2.
  - One timesheet from yesterday flagged **out_of_zone (410m)**, one flagged **late (22 min)**, six clean pending, a page of approved history.
  - **Saturday night security shift at the events venue: unfilled** → the red chip Marcus sees immediately; it's also the shift the video broadcasts.
  - **One shift in progress right now:** seed computes current ACST time and plants a worker mid-shift, 2 tasks done of 5 — so the live map is never empty and the dashboard breathes even before the prospect touches anything.
  - 3 weeks of shift history (for worker profiles + timesheet pages to feel lived-in), 1 week of future roster ~80% filled.

---

## 8. The Two Magic Moments (scripted)

**MM1 — Live clock-in (the video centerpiece):** phone (or phone-frame web) as Liam → Today → Clock In → admin Dashboard on screen simultaneously: green dot appears on Marion, activity feed slides in, On-Site KPI ticks up, Timesheets pending +1. Target: <1s perceived. *Rehearse this before recording; realtime channels warm on first subscribe.*

**MM2 — Broadcast & fill:** admin Roster → red Saturday chip → Broadcast ("7 compliant workers will be notified") → chip pulses → worker phone: offer card arrives → Accept → chip resolves to Liam's avatar live; other logged-in worker sees "Filled". Sequence: ~20 seconds, no cuts needed.

These two moments are the video intro's spine and the first thing your proposals link to with timestamps.

---

## 9. Build Sequence (~3 weeks @ 20–25 h/wk, Claude Code sessions)

| Phase | Sessions | Deliverable |
|---|---|---|
| **P0 — Foundation** (days 1–2) | Supabase schema + RLS + `reset_demo()` seed v1; repos wired to Supabase; design tokens installed in both apps | Data exists; both apps show a themed "hello, Torrens" |
| **P1 — Workers & Sites** (days 3–5) | Web: Workers table + detail + wallet + uploads; Job Sites + geofence editor + task templates | First screenshot-worthy screens |
| **P2 — Roster** (days 6–9) | Week grid, drag-assign, conflict engine (cert-block, double-book), shift CRUD, broadcast creation | The centerpiece works |
| **P3 — Mobile core + Realtime** (days 10–13) | Expo: auth, Today, clock-in w/ geofence confirm, in-shift tasks + photo, Wallet; web Timesheets + flags + approve + CSV; **MM1 live end-to-end** | The demo *demos* |
| **P4 — Offers + Dashboard** (days 14–16) | Offers tab + first-accept-wins; notifications list; Dashboard (KPIs, live map, feed); **MM2 live** | Feature-complete |
| **P5 — Polish & Ship** (days 17–20) | Empty states, skeletons, micro-interactions, seed mess-tuning, landing page + hire-me footer, Expo web export in phone-frame, EAS APK, deploy, pg_cron + keep-alive + UptimeRobot, dark mode *only if free* | Live at the domain; screenshots + 3 short screen recordings captured for the profile flip |

**Session discipline:** one module per Claude Code session, `/clear` between; keep `CLAUDE.md` in each repo (stack conventions, design tokens, status-color rules, "never invent features beyond spec §4–5") — you already know this workflow from WhiteFleet.

---

## 10. Kill List (unchanged — defend it against yourself)
Payroll *calculation* (export only) · invoicing · chat · push-notification infra (in-app list only) · leave/HR · client portal · marketplace · background location tracking · multi-company switching UI. Each kill = a phase-2 sentence in proposals, not a demo feature.

---

*Next artifacts after the build starts: portfolio write-ups (all 6 items), proposal templates per costume, video-intro shot list against the live demo.*