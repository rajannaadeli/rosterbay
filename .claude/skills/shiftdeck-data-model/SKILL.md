---
name: shiftdeck-data-model
description: Postgres/Supabase schema, row-level security policies, multi-tenant scoping, auto-flag business rules, the compliance hard-block rule, offer-acceptance concurrency, and nightly seed/reset logic for ShiftDeck. Use whenever writing SQL, RLS policies, Supabase queries, database migrations, or any logic that touches shifts, time entries, certifications, or the demo reset function.
---

# ShiftDeck Data Model

This is the part of the demo that has to be *actually correct*, not just look correct — a prospect who works in workforce ops will mentally test the compliance-block logic and the geofence math within the first two minutes. Sloppy RLS or a wrong auto-flag threshold is the one category of bug that undermines the "this person understands my industry" pitch the whole demo exists to make.

## Multi-tenant foundation

Every table (except `companies` itself) carries `company_id` (FK → `companies.id`) and `created_at`. This is non-negotiable even though the demo seeds exactly one tenant (Torrens Facility Services) — the architecture being genuinely multi-tenant is a claim made in proposals and case studies, and it has to be true, not aspirational.

**RLS pattern — apply this shape to every table:**

```sql
alter table shifts enable row level security;

create policy "company members read own company shifts"
on shifts for select
using (company_id = (select company_id from profiles where id = auth.uid()));

create policy "admins and supervisors write shifts"
on shifts for all
using (
  company_id = (select company_id from profiles where id = auth.uid())
  and (select role from profiles where id = auth.uid()) in ('admin','supervisor')
);
```

Workers get a narrower read policy — own rows plus rows they're assigned or offered:

```sql
create policy "workers read own or assigned shifts"
on shifts for select
using (
  company_id = (select company_id from profiles where id = auth.uid())
  and (
    worker_id = auth.uid()
    or id in (select shift_id from shift_offers where status = 'open')
  )
);
```

Never write an admin screen that filters `company_id` client-side only — the filter must be enforced in the policy. Client-side filtering is a UX convenience layered on top of RLS, not a substitute for it.

## Schema reference

```
companies        id, name, timezone
profiles         id (auth.uid), company_id, role ('admin'|'supervisor'|'worker'),
                 full_name, phone, avatar_url, job_title ('Cleaner'|'Security Guard'|...)
cert_types       id, company_id, name, code, validity_months, requires_document
worker_certs     id, worker_id, cert_type_id, issued_on, expires_on, file_url,
                 status GENERATED ('valid'|'expiring_soon'|'expired')
job_sites        id, name, address, lat, lng, geofence_radius_m,
                 required_cert_type_ids uuid[], client_name
task_templates   id, site_id, title, requires_photo bool, sort_order
shifts           id, site_id, worker_id (nullable = unfilled), starts_at, ends_at,
                 role_required, status ('open'|'assigned'|'in_progress'|'completed'|'cancelled'), notes
shift_offers     id, shift_id, broadcast_at, status ('open'|'filled'|'expired')
offer_responses  id, offer_id, worker_id, responded_at, accepted bool
time_entries     id, shift_id, worker_id, clock_in_at, clock_out_at,
                 in_lat, in_lng, out_lat, out_lng, distance_from_site_m,
                 within_geofence bool, flags text[] ('late','out_of_zone','missing_clock_out'),
                 status ('pending'|'approved'|'flagged'|'rejected'), reviewed_by, reviewed_at
issues           id, shift_id, worker_id, note, photo_url, created_at
notifications    id, user_id, kind, title, body, ref_id, read bool
```

`worker_certs.status` should be a generated column or a view, not something recomputed ad hoc in each screen — the compliance pill (Workers table), the Wallet card color (mobile), and the roster hard-block check all read the *same* computed status. Three independent implementations of "is this cert valid" is how the demo ends up with a screen that contradicts another screen.

## Auto-flag rules — exact thresholds, do not approximate

| Condition | Flag |
|---|---|
| `clock_in_at` more than 15 minutes after `shifts.starts_at` | `late` |
| `distance_from_site_m > job_sites.geofence_radius_m` | `out_of_zone` |
| No `clock_out_at` 2 hours after `shifts.ends_at` | `missing_clock_out` |

Any entry carrying a flag gets `status = 'flagged'`; everything else lands as `'pending'` until an admin approves it. These three thresholds appear in the Timesheets screen, the seed data (§ below), and the worker app's clock-in confirmation copy — keep them as named constants in one shared module (e.g. `lib/compliance-rules.ts`), imported everywhere, not restated as magic numbers per screen.

## The compliance hard-block rule (the single most domain-literate interaction in the demo)

Assigning a worker to a shift, or a worker accepting a broadcast offer, at a site whose `required_cert_type_ids` aren't fully covered by that worker's **valid** certs (missing entirely, or expired) → **hard-block**. Show the explanatory UI (see `shiftdeck-ui-screens` for exact popover copy), and allow an admin to override *only this block* with a logged reason (store on the assignment — who overrode, when, why). This mirrors how real ops managers work: cert compliance is a judgment call they're allowed to make; double-booking a worker on two shifts at once is not — never build an override path for double-booking, ever, in any admin role.

## Offer / first-accept-wins concurrency

`shift_offers` broadcasts to all compliant workers. The first `offer_responses` row with `accepted = true` wins. Enforce this at the database level, not in application code, since two workers could tap Accept within the same second during MM2:

```sql
create unique index offer_responses_one_accept
on offer_responses (offer_id)
where accepted;
```

The losing worker's client should catch the resulting constraint violation (or a realtime status change on the offer) and flip their card to "Filled" gracefully — that graceful-loss moment is scripted as part of MM2, not an error state to hide.

## Seed data — the golden rule

**Every seeded date is generated relative to `now()` in `Australia/Adelaide`, at seed time — never a hardcoded date.** A demo where "Jack's First Aid expired 6 days ago" was true on the day you wrote the seed script but is now three months stale is worse than no demo at all; it's the first thing a technically literate prospect will notice.

Implement seeding as a single idempotent SQL function, `reset_demo()`: truncate all tenant-scoped tables, reinsert from the fixed cast (Torrens Facility Services, Marcus Webb as the admin entry account, 14 workers, 5 sites, 5 cert types) with every date computed off `now()`. Schedule it nightly via `pg_cron` at 03:00 ACST. Do not expose a manual "reset demo" control anywhere in the UI — it's automatic-only by design.

Specific seed states that must hold true on every run (compute these relative to `now()`, not as literals):
- One worker's cert expired **exactly 6 days ago** and visibly blocks them from the site that requires it.
- Two workers have certs expiring in **9 and 13 days** (amber, dashboard count = 2).
- One timesheet flagged `out_of_zone` (~410m), one flagged `late` (~22 min), the rest clean.
- One shift is **unfilled** and lands on the next Saturday night at the events venue — this is the shift MM2 broadcasts.
- One worker is seeded **mid-shift right now** (task progress partially complete) so the live map and dashboard are never empty at demo-open, even before the prospect clicks anything.

## Common mistakes to avoid

- Forgetting `company_id` on a new table — every table added later (e.g. if `shift_tasks` gets a new field) inherits this requirement without exception.
- Computing compliance or flag status independently in more than one place instead of one shared source (generated column, view, or shared module).
- Hardcoding any seed date instead of deriving it from `now()` at seed time.
- Building an override path for anything other than the single cert-compliance hard-block.