---
name: shiftdeck-ui-screens
description: Screen-by-screen UX specification for the ShiftDeck admin console (Dashboard, Workers, Job Sites, Roster Board, Timesheets) and worker mobile app (Today, Schedule, Offers, Wallet), including exact interaction copy and the choreography of the two scripted "Magic Moments." Use when building, laying out, or reviewing any specific screen, or when wiring the live clock-in / broadcast-and-fill demo sequences.
---

# ShiftDeck Screens & Interaction Spec

Read `shiftdeck-design-system` alongside this skill — tokens and status colors are defined there; this skill is layout, interaction, and copy. Read `shiftdeck-data-model` for what each screen is actually querying.

## Entry (no signup wall)

One landing screen: wordmark, tagline "Roster, verify, and track your field workforce," two large buttons — **"Explore as Agency Admin"** and **"Explore as Worker (Liam, Security Guard)"** — plus a quiet "Install the worker app (APK)" link and the hire-me footer. Both buttons auto-sign-in to seeded accounts (no credential entry) and land directly on Dashboard / Today. Inside both apps, a dismissible banner: *"Demo data resets nightly. Everything you click is editable — go ahead."* — this line is explicit permission to poke at things, don't cut it for brevity.

## Admin Console shell

Left sidebar: Dashboard, Roster, Workers, Timesheets, Job Sites. Topbar: company name + current date. Content max-width ~1440px. Every list screen gets a real, designed empty state even though the seed data means it'll rarely appear — it gets reused as-is on every future client project built off this skeleton, so it's not wasted effort.

### Dashboard — "the ops manager's 7am"

- **KPI row**, 4 stat cards: On Site Now · Unfilled Shifts Today · Certs Expiring ≤30d · Timesheets Awaiting Review. Each card is a link into its filtered detail view — not decorative.
- **Live map** (react-leaflet): site markers, green pulsing dots for clocked-in workers, driven by Supabase Realtime. This is the stage for Magic Moment 1.
- **Needs Attention list**, sorted by urgency: unfilled shifts (red, inline **Broadcast** button) → flagged timesheets (amber) → expired certs (red). Every row is directly actionable, not a link-out.
- **Live activity feed**: realtime inserts, e.g. "Liam N. clocked in at Westfield Marion — 6:58 AM," "Shift offer accepted by Priya S." — animate in per the 200ms slide+fade rule.

### Workers

- Table columns: avatar+name, job title, phone, **compliance pill** (✓ Compliant / ⚠ Expiring / ✕ Expired — computed across *all* of that worker's certs, see data-model skill), shifts this week, last clock-in. Filters: role, compliance state. Search by name.
- **Worker detail** (sheet or page): profile header; **Document Wallet** as a grid of cert cards (type, expiry date, status color, file preview, drag-drop upload); shift history; availability notes.
- The detail that sells this screen: an expired cert card gets a red left border and a line under it — *"Blocking assignment at: CBD Tower (requires First Aid)"* — the document is shown causing a real operational consequence, not sitting inert.

### Job Sites

- Card grid: site name, client, address, mini-map thumbnail, required-cert chips, task count.
- **Site detail**: Leaflet map with a **draggable pin + radius circle bound to a slider (50–500m)** — this screenshot is a deliberate portfolio asset, get the drag interaction smooth. Required-certs multi-select. **Task template editor**: sortable checklist, per-item `requires_photo` toggle.

### Roster Board — the centerpiece screen

- **Week grid**: sites as rows, days as columns. Shift chips inside cells — filled chips show worker avatar + name + time; **unfilled chips are a dashed red outline** with time + a small Broadcast icon-button.
- Left panel: draggable worker list with compliance pills, filterable by role.
- **Drag a worker onto a shift chip → conflict check runs on drop:**
  - **Hard-block popover (red)**, no override for double-booking, override-with-reason allowed only for cert issues. Exact tone to match: *"Sarah's Security Licence expired 12 Mar — required at this site"* or *"Already assigned 6–2 at CBD Tower."*
  - **Soft warn (amber)**: e.g. *">38 hrs this week"* — informational, does not block the drop.
- Shift creation: clicking an empty cell opens a modal with AU shift-slang time presets — **Morning (6–2), Arvo (2–10), Night (10–6)** — keep these exact labels, they're a deliberate local-knowledge detail.
- **Broadcast** on an unfilled chip: confirm dialog states the eligible count, e.g. *"7 compliant workers will be notified"* → creates the offer → chip switches to the pulsing radar animation until filled. This is the stage for Magic Moment 2.

### Timesheets

- Grouped by day, rows per entry: worker, site, scheduled vs. actual times, variance badge, flag icons (clock glyph = late, map-pin-slash = out of zone), status chip.
- Row expand: mini-map showing the site's geofence circle, the clock-in point, and the literal distance — e.g. *"clocked in 340m from site"* — plus timestamps and a plain-language flag explanation.
- Actions: Approve / Flag per row, **bulk-approve all clean (non-flagged) entries** in one click, and **Export CSV** with columns worker/site/date/scheduled start-end/actual start-end/break/total hrs/status, with a header comment row noting "payroll-ready."

## Worker mobile app

Tab bar: **Today · Schedule · Offers · Wallet**, bell icon top-right for notifications. Keep primary actions in the bottom 40% of the screen (thumb zone) — this isn't a suggestion, it's the difference between a demo that feels like a real field-worker tool and one that feels like a web page squeezed onto a phone.

### Today

- **Next-shift card**: site, address, time, countdown ("starts in 1h 20m"), live distance to site ("2.3 km away"), and the site's cert requirements shown as met/unmet ticks.
- **Clock In** — large primary button, *always tappable*. If the worker is outside the geofence, don't hard-block — show a confirm sheet: *"You're 340m from Westfield Marion. Clock in anyway? Your entry will be flagged for review."* Hard-blocking GPS clock-in causes real worker frustration in production systems; allowing it while flagging it is the realistic behavior, and it's also how a flagged timesheet gets a live sibling during the demo rather than only existing in seed data.
- **In-shift mode** (card transforms after clock-in): elapsed timer, tap-to-tick task checklist, camera-required tasks open the picker and attach a thumbnail, a progress ring (e.g. 4/6). **Report Issue** button (note + photo, lands directly in the admin activity feed). **Clock Out** at the bottom.

### Schedule

Upcoming shifts grouped by day; tapping a shift shows an info block — address, requirements, notes, task preview — deliberately without an embedded map (keep this screen light; the map lives on Today and Job Sites).

### Offers

Open broadcast cards: site, day/time, a harmless realtime garnish like "3 others viewing," and a prominent **Accept Shift** button. First accept wins (see data-model skill's concurrency section) — the winner gets a success state and the shift added to Schedule; everyone else sees the card flip to "Filled" in realtime. The losing state should feel like a clean, graceful UI transition, not an error — it's a scripted beat in MM2, not a failure path.

### Wallet

Cert cards mirroring the admin Document Wallet's color states, with expiry countdowns ("expires in 12 days"), and an **Add document** action (camera or file). Frame this screen as the worker owning their own compliance documents, not the admin pushing paperwork at them.

## The two Magic Moments — build these to be literally rehearsable

**MM1 — Live clock-in.** Worker app (phone or phone-frame web) as Liam → Today → Clock In, with the admin Dashboard visible simultaneously: a green dot appears on Marion on the live map, the activity feed slides a new row in, the On-Site KPI ticks up, Timesheets-pending increments. Target perceived latency: under 1 second. Realtime channels need to be warmed (subscribed at least once) before this is recorded, or the first clock-in of a session will lag.

**MM2 — Broadcast and fill.** Admin Roster → the red Saturday-night chip → Broadcast ("7 compliant workers will be notified") → chip starts pulsing → worker phone: an offer card arrives → Accept → chip resolves to Liam's avatar live, and a second logged-in worker session sees "Filled" appear on their card. Should run as one continuous ~20-second sequence with no cuts needed — if a screen requires a manual refresh anywhere in this chain, that's a bug in the realtime wiring, not an acceptable edit-around for the video.

These two sequences are the spine of the video intro and the first thing every outreach proposal links to with a timestamp — when in doubt about polish priority on any given screen, ask whether it's on the direct path of MM1 or MM2 first.