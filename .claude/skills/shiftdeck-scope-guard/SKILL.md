---
name: shiftdeck-scope-guard
description: The ShiftDeck feature kill-list and brand/costume constraints. Use before implementing any new feature, screen, or capability, whenever a request sounds like it's expanding scope beyond the build sequence, or when naming, branding, or referencing real competitor products. This is the cheapest, highest-leverage skill in the project — invoke it defensively, not just when asked to.
---

# ShiftDeck Scope Guard

This is a demo with a 3-week budget on limited Claude Code / Fable / Opus usage. The single biggest risk to that budget isn't a bug — it's an AI coding session that helpfully adds a feature that wasn't asked for. Every hour spent on a killed feature is an hour not spent on the two Magic Moments, which are the entire point of the build. **Treat this skill as a hard gate, not a suggestion.**

## The kill list — do not build these, in any partial form, ever

- **Payroll calculation.** CSV export of timesheets is in scope; computing actual payroll amounts, tax, or super is not.
- **Invoicing.**
- **Chat** (worker-to-admin, worker-to-worker, anything resembling a message thread).
- **Push-notification infrastructure.** An in-app notifications *list* is in scope (see `shiftdeck-ui-screens`); actual push delivery (APNs/FCM wiring) is not.
- **Leave / HR management** (time-off requests, HR records, disciplinary tracking).
- **Client portal** (an external login for Torrens' clients to view their own site's coverage).
- **Marketplace** (multiple agencies, a bidding/matching layer between agencies and workers).
- **Background location tracking.** `expo-location` foreground permission only — no background task, no location history beyond a single clock-in/out point pair.
- **Multi-company switching UI.** The backend is architected multi-tenant (see `shiftdeck-data-model`) — that's a real case-study claim — but the *product* only ever shows Torrens Facility Services. No tenant switcher, no "add a company" flow.

If a request — from the user or from your own initiative mid-session — would touch any of these, the correct response is: don't build it, name which kill-list item it falls under, and note that it's a one-sentence phase-2 line for future client proposals, not a demo feature. Do not build "just the read-only version" or "just the UI shell without the backend" of a killed feature either — a convincing-looking UI for a feature that doesn't work is worse for a sales demo than the feature simply not existing.

## Brand and costume constraints

- Demo product name: **ShiftDeck** (fallbacks CrewBoard / RosterBay only if the domain isn't available). Never let a session drift toward branding it as, or visually referencing, any real competitor product — explicitly avoid resembling **Deputy, Tanda, Connecteam, ShiftCare, or Skedulo** in naming, logo, or screenshots used in marketing.
- Fictional tenant: **Torrens Facility Services**, Adelaide, South Australia — commercial cleaning + security guarding, ~14 field workers, 5 client sites. Don't rename the tenant, change its industry, or change its location mid-build; every seeded date/timezone/AU-slang detail in the other skills assumes this exact tenant.
- Timezone is **`Australia/Adelaide`** (ACST, UTC+9:30) everywhere, in every display and every seed calculation — the half-hour offset is a deliberate domain-knowledge signal and getting it wrong anywhere (a shift time, a "clocked in at" timestamp, a countdown) undermines that signal rather than being a neutral bug.
- Landing page footer must credit the developer and link out (Upwork profile / portfolio) — this line exists because it's the actual commercial purpose of the whole project; don't let a design pass quietly remove or shrink it into invisibility.

## Self-check before ending any build session

Before wrapping up a session, check the work against this list:

1. Did anything just get built that's on the kill list, even partially?
2. Does every new screen/component map to a specific section in `shiftdeck-ui-screens`, or was something invented that isn't in the spec?
3. Do any new colors, fonts, or spacing values deviate from `shiftdeck-design-system`?
4. Do any new tables or queries skip `company_id` scoping, per `shiftdeck-data-model`?
5. Is the tenant still Torrens Facility Services, timezone still Australia/Adelaide, product name still ShiftDeck?

If any answer is "yes, something drifted," fix it before ending the session rather than leaving a note for later — drift compounds across sessions faster than it gets caught by a human review pass, especially given the `/clear`-between-sessions workflow this project uses.