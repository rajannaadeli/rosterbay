-- RosterBay — 0006 Phase 2: timesheet read-time flags, worker clock-in
-- permissions, realtime publication.

-- missing_clock_out is computed at read time (same server-side pattern as cert
-- status): no clock-out 2 hours past the shift end. late / out_of_zone are
-- stored at clock-in mutation time by the mobile app.
create or replace view public.time_entries_with_status
with (security_invoker = true) as
select
  te.*,
  s.starts_at as shift_starts_at,
  s.ends_at as shift_ends_at,
  s.site_id,
  s.status as shift_status,
  (te.clock_out_at is null and now() > s.ends_at + interval '2 hours') as missing_clock_out,
  case
    when te.clock_out_at is null and now() > s.ends_at + interval '2 hours'
      then array_append(te.flags, 'missing_clock_out')
    else te.flags
  end as effective_flags,
  case
    when te.status = 'pending'
      and te.clock_out_at is null
      and now() > s.ends_at + interval '2 hours'
      then 'flagged'
    else te.status
  end as effective_status
from public.time_entries te
join public.shifts s on s.id = te.shift_id;

-- Clock-in/out transitions the worker's own shift (assigned → in_progress →
-- completed). Admin/supervisor write policy already exists; this is the
-- worker-scoped complement.
create policy "workers update own shifts"
  on public.shifts for update
  using (company_id = public.auth_company_id() and worker_id = auth.uid())
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

-- On first clock-in the app materialises shift_tasks from the site's
-- task_templates; workers need insert on their own shift's tasks.
create policy "workers insert own shift tasks"
  on public.shift_tasks for insert
  with check (
    company_id = public.auth_company_id()
    and shift_id in (select id from public.shifts where worker_id = auth.uid())
  );

-- Realtime (MM1): stream time_entries + shifts changes. Guarded so the file
-- also runs on plain Postgres (local verification) where the publication
-- doesn't exist.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.time_entries;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.shifts;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
