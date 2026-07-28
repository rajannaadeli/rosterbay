# RosterBay — press & portfolio kit

Screenshots in `/capture`, dark theme, seeded at a photogenic moment: mid-morning
now-line, one shift in progress (Mei Chen at Westfield Marion, 1–9am), the
unfilled Thursday/Friday/Saturday windows visible, and Jack O'Connell's expired
First Aid certificate on screen.

**Live demo:** [rosterbay.com](https://rosterbay.com) · admin and worker entry
points on the landing page, no signup.

**One-liner:** Roster, verify, and track a deskless workforce — shift scheduling,
geofenced clock-in, photo proof of work, and certification compliance for a
14-person facility-services crew across five Adelaide sites.

**Stack:** React 19 · Vite 8 · TypeScript (strict) · Tailwind v4 · Supabase
(Postgres + RLS + Realtime) · TanStack Query/Table · dnd-kit · Leaflet ·
Expo/React Native for the worker app.

---

## Shot list

| File | Caption |
|---|---|
| `01-roster-day-view.png` | **The roster as a real time axis.** Shifts are bars whose width is their duration and whose position is their start — a 6am–2pm and a 10pm–6am shift are no longer identical rectangles. Night hours carry a darker wash, the accent line is the live current time, and the strip above is half-hourly coverage. |
| `02-roster-week-view.png` | **Seven days, with the week's thin patches called out first.** The coverage matrix above the grid is 7 columns × 12 two-hour rows; the red bands on Thursday, Friday and Saturday are unfilled shifts. Each chip carries a 2px rail showing where in the day its shift sits. |
| `03-dashboard.png` | **The ops manager's 7am.** Every KPI carries a drawn micro-visual — a presence strip of one tick per worker, a 24-hour track marking unfilled windows, a compressed certification runway, pending-vs-flagged review split. Live map, attention queue, and a ticking activity feed. |
| `04-compliance-runway.png` | **Certification as a fuel gauge.** A twelve-month timeline per worker: distance from the TODAY line is the runway remaining. Expired documents render left of today with a hatched stub and the site they block named inline. |
| `05-landing-hero.png` | **Landing page.** Dark product shot in a browser frame over an accent-derived wash. |
| `06-og-image.png` | **Open Graph card**, 1200×630, generated from the dark UI by `scripts/make-og.mjs`. |

## Talking points

- **The time grid is bespoke.** No scheduling library — the axis geometry,
  midnight-wrap clipping, overlap-lane packing and coverage histogram are a pure
  module (`admin/src/features/roster/time-axis.ts`) with 20 unit tests behind it.
- **Night shifts wrap correctly.** A 22:00–06:00 shift draws as a chevron-capped
  pair across two days and highlights both halves together. Off-the-shelf
  calendars generally do not handle this.
- **Daylight saving is handled.** South Australia's transition days are 23 and 25
  hours long, and the axis measures the real length of each day rather than
  assuming 1440 minutes — so bars stay aligned on the two days a year most
  schedulers quietly break.
- **Unfilled state is not colour-only.** It carries a drawn diagonal hatch, so it
  survives a colour-blind reader and a greyscale print.
- **Everything is derived, nothing is added.** The coverage ribbon, all four KPI
  micro-visuals and the runway read from data already in the query cache — no
  extra round trips.

## Not in this folder

- **Mobile shots** (worker Today mid-shift, Offers) — these need the Expo dev
  server running alongside the admin app; capture them from `/worker` or a
  device before the portfolio upload.
- **Timesheets expanded** and **Site drawer** — both shipped and working, just
  not captured in the dark set here.
- Captures are **1× DPI** (browser window resolution). For print or a
  high-density portfolio grid, re-shoot at 2× with the browser zoomed or via a
  headless capture at `deviceScaleFactor: 2`.
