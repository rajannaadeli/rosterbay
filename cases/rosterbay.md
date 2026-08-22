# RosterBay

A live workforce-operations platform — shift rostering, GPS clock-in, and certification compliance — built for staffing and facility-services companies and running as a fully explorable public demo.

**Role:** Solo — data model, design system, web + mobile, ops · **Timeline:** ~6 weeks of evenings and weekends, mid-2026 · **Stack:** React 19 · Postgres/Supabase · Expo SDK 56 · TanStack Query · Tailwind v4 · **Status:** Live public demo, no real users, resets nightly · **Links:** [rosterbay.com](https://rosterbay.com) · [worker.rosterbay.com](https://worker.rosterbay.com)

---

- 3 app surfaces (admin console, worker app, landing) on a 13-table multi-tenant Postgres schema with row-level security
- A phone clock-in shows up on the admin dashboard in under a second
- 43 unit tests pinning the two rules I refused to get wrong: 23 for the assignment conflict engine, 20 for the DST-aware time axis

## Why this exists

I built a multi-tenant workforce platform for an Australian labour-hire company first. That's where I learned the shape of the problem. Then I kept seeing the same three failures everywhere in deskless work — rosters living in spreadsheets, certifications expiring with nobody watching, timesheets chased over WhatsApp on a Sunday night.

Nobody asked me to build RosterBay. It's my own opinionated answer to a problem I'd already been paid to solve once, and it does double duty. It's a real product a prospect can open and click instead of scrolling a screenshot gallery. And it's the skeleton I now start client projects from, which is where my fixed-price delivery speed actually comes from.

The tenant is a fictional Adelaide cleaning-and-security company — Torrens Facility Services, 14 seeded workers, 5 sites. You can open it with no signup and break anything you like. The data resets every night.

> [SCREENSHOT: the admin dashboard with the live map and KPI strip — this is the one-click "it's a real product" first impression]

## The three problems that were actually hard

Most of the build was ordinary CRUD. Three things weren't, and they're the reason the demo holds up under a developer's scrutiny instead of falling apart on the second click.

## Night shifts belong to two days at once

A 10pm–6am shift is one shift and two calendar days. Every naive roster grid renders it wrong — clipped at midnight, or drawn twice as if it were two separate shifts.

I rebuilt the roster as a proportional time grid: shifts drawn to scale on a 24-hour axis, and a shift that crosses midnight rendered as paired bars with chevron caps, hover-linked so both halves light up together. Then the part that's easy to miss — a day in South Australia is not 1440 minutes. On the two DST transition days each year it's 23 or 25 hours, and every bar's position is a fraction of the *real* length of that day. Twenty tests pin the axis, because the two mornings a scheduler is least forgiven for being wrong are exactly the two this math protects.

> [SCREENSHOT: the roster time grid showing an overnight shift as two chevron-capped bars, hover-linked — the case every generated roster UI fails]

## Compliance had to block, not warn

Every site requires specific certifications — White Card, police check, First Aid, an SA security licence. Assigning a worker with an expired cert to a hospital isn't a cosmetic error. It's a liability.

So I wrote the assignment check as a pure, unit-tested function — cert coverage, double-booking, weekly-hours ceiling — and then made its verdict physical. While you drag a worker over a shift, the target rings teal if they're eligible and red if they're blocked, before you ever drop. Certs can be overridden with a logged reason; a double-booking can't be overridden at all, anywhere. The seeded worker with a lapsed First Aid cert is visibly locked out of the hospital roster — you can feel the rule with your cursor. Twenty-three tests cover the engine, and they passed unchanged when I later swapped the whole roster surface underneath them, which is the evidence the rule and the UI are genuinely separate.

> [SCREENSHOT: a drag-in-progress with the drop target ringed red and the conflict reason showing — the domain rule as an interaction]

## A public demo that's alive whenever you click it

Most demos are dead within a week. Visitors rename the workers, delete the shifts, and the seeded dates drift into the past.

The whole dataset is one idempotent SQL function that generates everything relative to `now()` in Australia/Adelaide — zero hardcoded dates. It includes one shift computed to be in progress at whatever moment you open the page, so the live map is never empty and someone is always mid-shift. A pg_cron job resets it nightly at 03:00 ACST, and a keep-alive job pings the database so the free tier never pauses. Whenever anyone lands on it, it's a Tuesday afternoon at a working facility-services company.

> [SCREENSHOT: the worker app mid-shift with the in-progress task checklist — the "someone is always clocked in" state]

## First-accept-wins, decided in the database

The detail I'm proudest of. When a shift goes unfilled, an admin can broadcast it to eligible workers, and several of them can tap Accept in the same second. That's a real race.

I didn't arbitrate it in application code. The arbiter is a partial unique index in Postgres — `unique (offer_id) where accepted` — so the second accepted insert fails at the database with a constraint violation before any of my logic runs. The winner's response fires a security-definer trigger that fills the offer, assigns the shift, and notifies everyone. The losers watch their card flip to "Filled" in realtime. No error, no crash, no lost update, no matter how many people tap at once.

> [SCREENSHOT: two worker phones side by side, one showing "Accepted" and the other flipping to "Filled" — the race resolved in realtime]

## Under the hood

Two independent npm apps — a React 19 / Vite / Tailwind v4 admin console and an Expo SDK 56 worker app that also runs in the browser inside a phone frame — talking to one Supabase Postgres. The database does the domain-heavy work on purpose: certification status is a Postgres view computing `valid`/`expiring_soon`/`expired` against Adelaide time, so no client ever recomputes it; the offer race is settled by an index; row-level security scopes every query to the tenant. Data fetching is TanStack Query per feature, forms and every external boundary are validated with zod, and the shared types are hand-mirrored between the two apps because a monorepo workspace would've been more infrastructure than one file is worth. The realtime path — a phone clock-in appearing on the admin map in under a second — rides Supabase's own streams and presence, not a bespoke socket layer.

## What shipped, honestly

A working, deployed, three-surface product with no real users, and it doesn't pretend otherwise. That's the point of it. It's the anchor of how I sell freelance work in this vertical — a live thing a prospect reaches in one click — and it's the codebase I fork to start real client projects, which is the actual return on the six weeks. What it demonstrates isn't scale. It's the quality of the decisions: which rules get enforced by the database, which numbers get their own tests, and which interactions carry a domain rule instead of just describing it.

## Looking back

For a stretch in the middle, everything worked and the whole thing still looked generated — flat default components, broken map markers, no depth. The honest admission is that I let it get there by chasing features while the interface stayed an afterthought. Fixing it wasn't a retune; it took two full passes of stopping all feature work to rebuild the visual system from the tokens up — layered dark theme, mono numerals on every operational figure, and hand-drawn SVG components no library ships. If I did it again I'd treat the design system as load-bearing from week one, not something to bolt on once the logic was proven. A demo whose entire job is to look like a product can't afford to look like a prototype first.

---

## GAPS

- [ ] **"Sub-second" clock-in latency is a claim from notes, not measured.** I verified the realtime path exists (Supabase streams), but there's no benchmark in the repo. Confirm the number or soften to "near-instant."
- [ ] **Worker count: notes say 14 seeded workers, but also "5 sites" in one place and the seed defines only 3–5 job sites.** The schema seed I read lists 5 sites (Kingsford, Hospital, Riverbank + others). Confirm the exact site count for the deck ("5 sites" used).
- [ ] **Coverage heat-ribbon and certification-expiry runway** are named in notes as signature SVG components and confirmed present in the code (`coverage-ribbon.tsx`, `week-coverage-ribbon.tsx`), but they don't have their own case-study section. Decide whether to add a screenshot for them under the design section.
- [ ] **Landing page APK download** (worker app as sideloadable Android APK, built from CI) is a real shipped feature I left out to keep the case study focused on product, not ops. Add if you want the "it's a real distributable app" angle.
- [ ] **Prior client** is referred to only as "an Australian labour-hire company" per the MUST NOT CLAIM constraint — verify I didn't leak anything more specific anywhere.
- [ ] No revenue, user, or adoption numbers are claimed. Confirm that's the intended positioning for this portfolio (it matches the notes).

## CAPTURE LIST

1. [ ] The admin dashboard with the live map and KPI strip — the one-click "it's a real product" first impression.
2. [ ] The roster time grid showing an overnight shift as two chevron-capped bars, hover-linked.
3. [ ] A drag-in-progress with the drop target ringed red and the conflict reason showing.
4. [ ] The worker app mid-shift with the in-progress task checklist.
5. [ ] Two worker phones side by side — one "Accepted", one flipping to "Filled" — the race resolved in realtime.
