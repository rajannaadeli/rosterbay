-- RosterBay — 0009 proof of work
-- Completes the shift-task lifecycle. Templates are snapshotted onto a shift at
-- creation (the app does the copy — see features/proof/task-instantiation.ts);
-- admins edit that snapshot until the shift completes; everything the worker
-- submits — ticks, photos, issues — becomes readable from the admin side.
-- Additive only: no column is dropped, no data destroyed.

-- 1 · shift_tasks: provenance + explicit ordering -----------------------------
alter table public.shift_tasks
  add column if not exists source text not null default 'template'
    check (source in ('template', 'adhoc')),
  add column if not exists added_by uuid references public.profiles (id) on delete set null,
  add column if not exists sort_order int not null default 0;

create index if not exists shift_tasks_shift_sort_idx on public.shift_tasks (shift_id, sort_order);

-- Rows written before this migration inherit their template's position.
update public.shift_tasks st
set sort_order = tt.sort_order
from public.task_templates tt
where tt.id = st.template_id and st.sort_order = 0;

-- 2 · issues: acknowledge trail ----------------------------------------------
alter table public.issues
  add column if not exists status text not null default 'open'
    check (status in ('open', 'acknowledged')),
  add column if not exists acknowledged_by uuid references public.profiles (id) on delete set null,
  add column if not exists acknowledged_at timestamptz;

create index if not exists issues_status_idx on public.issues (status);

-- Acknowledging is the *only* write an admin makes to an issue — the worker
-- owns the report itself, and there is deliberately no reply path (that would
-- be chat, spec §10 kill list).
drop policy if exists "admins and supervisors update company issues" on public.issues;
create policy "admins and supervisors update company issues"
  on public.issues for update
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- 3 · derived per-shift proof counts ------------------------------------------
-- Not stored: the roster chips, the shift sheet and the dashboard all read the
-- same numbers from one place, so they can never disagree.
create or replace view public.shift_proof_summary
with (security_invoker = true) as
select
  s.id as shift_id,
  s.company_id,
  s.site_id,
  s.worker_id,
  s.status as shift_status,
  s.starts_at,
  s.ends_at,
  t.tasks_total,
  t.tasks_done,
  t.photos_count,
  i.open_issues_count
from public.shifts s
left join lateral (
  select
    count(*)::int as tasks_total,
    count(*) filter (where st.done)::int as tasks_done,
    count(*) filter (where st.photo_url is not null)::int as photos_count
  from public.shift_tasks st
  where st.shift_id = s.id
) t on true
left join lateral (
  select count(*) filter (where iss.status = 'open')::int as open_issues_count
  from public.issues iss
  where iss.shift_id = s.id
) i on true;

-- 4 · incomplete_tasks joins the timesheet flag set ---------------------------
-- Same read-time pattern as missing_clock_out (0006). It is a review *signal*,
-- not a status change: effective_status is untouched, so Approve stays enabled
-- and Marcus decides — but the entry drops out of the blind bulk-approve set.
-- New columns are appended (create-or-replace can only add at the end).
create or replace view public.time_entries_with_status
with (security_invoker = true) as
select
  te.*,
  s.starts_at as shift_starts_at,
  s.ends_at as shift_ends_at,
  s.site_id,
  s.status as shift_status,
  (te.clock_out_at is null and now() > s.ends_at + interval '2 hours') as missing_clock_out,
  te.flags
    || case
         when te.clock_out_at is null and now() > s.ends_at + interval '2 hours'
           then array['missing_clock_out']
         else '{}'::text[]
       end
    || case
         when s.status = 'completed'
           and coalesce(t.tasks_total, 0) > 0
           and t.tasks_done < t.tasks_total
           then array['incomplete_tasks']
         else '{}'::text[]
       end as effective_flags,
  case
    when te.status = 'pending'
      and te.clock_out_at is null
      and now() > s.ends_at + interval '2 hours'
      then 'flagged'
    else te.status
  end as effective_status,
  coalesce(t.tasks_total, 0) as tasks_total,
  coalesce(t.tasks_done, 0) as tasks_done,
  (
    s.status = 'completed'
    and coalesce(t.tasks_total, 0) > 0
    and t.tasks_done < t.tasks_total
  ) as incomplete_tasks
from public.time_entries te
join public.shifts s on s.id = te.shift_id
left join lateral (
  select
    count(*)::int as tasks_total,
    count(*) filter (where st.done)::int as tasks_done
  from public.shift_tasks st
  where st.shift_id = te.shift_id
) t on true;

-- 5 · realtime: ad-hoc tasks reach the worker mid-shift, ticks reach the board -
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.shift_tasks;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.issues;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- 6 · seed: the proof-of-work layer -------------------------------------------
-- reset_demo() becomes a two-step. The Phase-1/2 base seed (0005) is renamed
-- rather than copied, so there is exactly one definition of each half and no
-- 400-line duplicate drifting out of sync.
do $$
begin
  if exists (
        select 1 from pg_proc
        where proname = 'reset_demo' and pronamespace = 'public'::regnamespace
      )
     and not exists (
        select 1 from pg_proc
        where proname = 'reset_demo_base' and pronamespace = 'public'::regnamespace
      )
  then
    alter function public.reset_demo() rename to reset_demo_base;
  end if;
end $$;

-- Photo proof points at real objects in the task-proof bucket. Rows store the
-- storage *path*; proofPhotoUrl() (mirrored in both apps) resolves it against
-- the project URL, so a nightly reset never needs that URL baked into SQL.
-- scripts/seed-auth.ts uploads the committed JPEGs before calling reset_demo().
create or replace function public.seed_proof_of_work()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  tz constant text := 'Australia/Adelaide';
  v_today date := (now() at time zone 'Australia/Adelaide')::date;

  cid constant uuid := 'c0000000-0000-4000-8000-000000000001';
  u_marcus constant uuid := '10000000-0000-4000-8000-000000000001';
  w_priya  constant uuid := '20000000-0000-4000-8000-000000000002';
  w_fatima constant uuid := '20000000-0000-4000-8000-000000000004';

  s_kingsford constant uuid := '40000000-0000-4000-8000-000000000001';
  s_marion    constant uuid := '40000000-0000-4000-8000-000000000002';
  s_hospital  constant uuid := '40000000-0000-4000-8000-000000000003';
  s_wingfield constant uuid := '40000000-0000-4000-8000-000000000004';
  s_riverbank constant uuid := '40000000-0000-4000-8000-000000000005';

  v_shift_id uuid;
  v_worker uuid;
  v_at timestamptz;
begin
  -- This function owns the whole task/issue layer; the base seed's partial
  -- in-progress checklist is replaced wholesale. truncate, not delete: Supabase
  -- loads pg_safeupdate for API roles, which rejects an unqualified DELETE when
  -- reset_demo() is invoked over RPC.
  truncate table public.shift_tasks, public.issues;

  -- Every live shift carries a snapshot of its site's checklist, taken at
  -- creation. Editing a template later never reaches back into these rows.
  insert into public.shift_tasks (
    company_id, shift_id, template_id, title, requires_photo, sort_order, source)
  select s.company_id, s.id, tt.id, tt.title, tt.requires_photo, tt.sort_order, 'template'
  from public.shifts s
  join public.task_templates tt on tt.site_id = s.site_id
  where s.status <> 'cancelled';

  -- Completed shifts read as finished work: everything ticked through the
  -- shift, photo tasks carrying a real image.
  update public.shift_tasks st
  set done = true,
      done_at = s.starts_at + make_interval(mins => 25 * st.sort_order),
      photo_url = case
        when st.requires_photo then
          case s.site_id
            when s_kingsford then 'seed/kingsford-lobby.jpg'
            when s_marion    then 'seed/marion-food-court.jpg'
            when s_hospital  then 'seed/hospital-ward.jpg'
            when s_wingfield then 'seed/wingfield-dock.jpg'
            else                  'seed/riverbank-gates.jpg'
          end
      end
  from public.shifts s
  where s.id = st.shift_id and s.status = 'completed';

  -- The story shift: yesterday at Kingsford, Priya finished 4 of 6 and skipped
  -- both photo tasks. Drives the amber "2 tasks not completed" note, the
  -- incomplete_tasks flag and the dashboard attention row.
  select id into v_shift_id
  from public.shifts
  where site_id = s_kingsford and worker_id = w_priya and status = 'completed'
    and (starts_at at time zone tz)::date = v_today - 1
  order by starts_at
  limit 1;

  if v_shift_id is not null then
    update public.shift_tasks
    set done = false, done_at = null, photo_url = null
    where shift_id = v_shift_id and sort_order in (4, 6);
  end if;

  -- The live shift: Mei is two hours into Westfield Marion, 3 ticked (one with
  -- a photo) and an ad-hoc task Marcus added after she started.
  select id into v_shift_id
  from public.shifts
  where status = 'in_progress'
  order by starts_at
  limit 1;

  if v_shift_id is not null then
    update public.shift_tasks
    set done = false, done_at = null, photo_url = null
    where shift_id = v_shift_id;

    update public.shift_tasks
    set done = true,
        done_at = now() - make_interval(mins => 100 - sort_order * 25),
        photo_url = case when requires_photo then 'seed/marion-food-court.jpg' end
    where shift_id = v_shift_id and sort_order <= 3;

    insert into public.shift_tasks (
      company_id, shift_id, title, requires_photo, sort_order, source, added_by, created_at)
    values (
      cid, v_shift_id, 'Spot-clean the north entry spill — centre management request',
      false, 7, 'adhoc', u_marcus, now() - interval '35 minutes');
  end if;

  -- Open issue with photo proof: Fatima, yesterday at Wingfield.
  select id into v_shift_id
  from public.shifts
  where site_id = s_wingfield and worker_id = w_fatima and status = 'completed'
    and (starts_at at time zone tz)::date = v_today - 1
  order by starts_at
  limit 1;

  if v_shift_id is not null then
    insert into public.issues (
      company_id, shift_id, worker_id, note, photo_url, status, created_at)
    values (
      cid, v_shift_id, w_fatima,
      'Loading dock roller door damaged — bottom seal is torn and it won''t latch. '
        || 'Chained the bay shut and let the site contact know.',
      'seed/roller-door.jpg', 'open',
      (v_today - 1 + time '11:20') at time zone tz);
  end if;

  -- One already-acknowledged issue, so both states exist on both platforms.
  select id, worker_id into v_shift_id, v_worker
  from public.shifts
  where site_id = s_marion and status = 'completed' and worker_id is not null
    and (starts_at at time zone tz)::date = v_today - 3
  order by starts_at
  limit 1;

  if v_shift_id is not null then
    v_at := (v_today - 3 + time '09:40') at time zone tz;
    insert into public.issues (
      company_id, shift_id, worker_id, note, photo_url,
      status, acknowledged_by, acknowledged_at, created_at)
    values (
      cid, v_shift_id, v_worker,
      'Bin enclosure lock in the east concourse is sticking — needs a locksmith.',
      null, 'acknowledged', u_marcus, v_at + interval '3 hours', v_at);
  end if;
end;
$fn$;

create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  perform public.reset_demo_base();
  perform public.seed_proof_of_work();
end;
$fn$;

-- Only the service role / postgres may reset the demo.
revoke execute on function public.reset_demo() from public, anon, authenticated;
revoke execute on function public.seed_proof_of_work() from public, anon, authenticated;
