-- RosterBay — 0002 row-level security
-- Helpers are security definer so policies on profiles don't recurse into
-- themselves. RLS is the enforcement layer; client-side filters are UX only.

create or replace function public.auth_company_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select company_id from profiles where id = auth.uid()
$$;

create or replace function public.auth_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

revoke execute on function public.auth_company_id() from anon;
revoke execute on function public.auth_role() from anon;
grant execute on function public.auth_company_id() to authenticated;
grant execute on function public.auth_role() to authenticated;

-- companies ------------------------------------------------------------------
alter table public.companies enable row level security;

create policy "members read own company"
  on public.companies for select
  using (id = public.auth_company_id());

-- profiles -------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "admins and supervisors read company profiles"
  on public.profiles for select
  using (
    company_id = public.auth_company_id()
    and (public.auth_role() in ('admin', 'supervisor') or id = auth.uid())
  );

create policy "admins update company profiles"
  on public.profiles for update
  using (company_id = public.auth_company_id() and public.auth_role() = 'admin')
  with check (company_id = public.auth_company_id());

-- cert_types -----------------------------------------------------------------
alter table public.cert_types enable row level security;

create policy "members read company cert types"
  on public.cert_types for select
  using (company_id = public.auth_company_id());

create policy "admins and supervisors write cert types"
  on public.cert_types for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- worker_certs ---------------------------------------------------------------
alter table public.worker_certs enable row level security;

create policy "admins and supervisors read company certs"
  on public.worker_certs for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own certs"
  on public.worker_certs for select
  using (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "admins and supervisors insert company certs"
  on public.worker_certs for insert
  with check (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers insert own certs"
  on public.worker_certs for insert
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "admins and supervisors update company certs"
  on public.worker_certs for update
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

create policy "admins and supervisors delete company certs"
  on public.worker_certs for delete
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

-- job_sites ------------------------------------------------------------------
alter table public.job_sites enable row level security;

create policy "members read company sites"
  on public.job_sites for select
  using (company_id = public.auth_company_id());

create policy "admins and supervisors write sites"
  on public.job_sites for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- task_templates -------------------------------------------------------------
alter table public.task_templates enable row level security;

create policy "members read company task templates"
  on public.task_templates for select
  using (company_id = public.auth_company_id());

create policy "admins and supervisors write task templates"
  on public.task_templates for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- shifts ---------------------------------------------------------------------
alter table public.shifts enable row level security;

create policy "admins and supervisors read company shifts"
  on public.shifts for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own or offered shifts"
  on public.shifts for select
  using (
    company_id = public.auth_company_id()
    and (
      worker_id = auth.uid()
      or id in (select shift_id from public.shift_offers where status = 'open')
    )
  );

create policy "admins and supervisors write shifts"
  on public.shifts for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- shift_offers ---------------------------------------------------------------
alter table public.shift_offers enable row level security;

create policy "admins and supervisors read company offers"
  on public.shift_offers for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read open or responded offers"
  on public.shift_offers for select
  using (
    company_id = public.auth_company_id()
    and (
      status = 'open'
      or id in (select offer_id from public.offer_responses where worker_id = auth.uid())
    )
  );

create policy "admins and supervisors write offers"
  on public.shift_offers for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- offer_responses ------------------------------------------------------------
alter table public.offer_responses enable row level security;

create policy "admins and supervisors read company responses"
  on public.offer_responses for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own responses"
  on public.offer_responses for select
  using (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "workers insert own responses"
  on public.offer_responses for insert
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

-- shift_tasks ----------------------------------------------------------------
alter table public.shift_tasks enable row level security;

create policy "admins and supervisors read company shift tasks"
  on public.shift_tasks for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own shift tasks"
  on public.shift_tasks for select
  using (
    company_id = public.auth_company_id()
    and shift_id in (select id from public.shifts where worker_id = auth.uid())
  );

create policy "workers update own shift tasks"
  on public.shift_tasks for update
  using (
    company_id = public.auth_company_id()
    and shift_id in (select id from public.shifts where worker_id = auth.uid())
  )
  with check (company_id = public.auth_company_id());

create policy "admins and supervisors write shift tasks"
  on public.shift_tasks for all
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- time_entries ---------------------------------------------------------------
alter table public.time_entries enable row level security;

create policy "admins and supervisors read company time entries"
  on public.time_entries for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own time entries"
  on public.time_entries for select
  using (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "workers insert own time entries"
  on public.time_entries for insert
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "workers update own time entries"
  on public.time_entries for update
  using (company_id = public.auth_company_id() and worker_id = auth.uid())
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "admins and supervisors update company time entries"
  on public.time_entries for update
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  )
  with check (company_id = public.auth_company_id());

-- issues ---------------------------------------------------------------------
alter table public.issues enable row level security;

create policy "admins and supervisors read company issues"
  on public.issues for select
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'supervisor')
  );

create policy "workers read own issues"
  on public.issues for select
  using (company_id = public.auth_company_id() and worker_id = auth.uid());

create policy "workers insert own issues"
  on public.issues for insert
  with check (company_id = public.auth_company_id() and worker_id = auth.uid());

-- notifications ----------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  using (company_id = public.auth_company_id() and user_id = auth.uid());

create policy "users update own notifications"
  on public.notifications for update
  using (company_id = public.auth_company_id() and user_id = auth.uid())
  with check (company_id = public.auth_company_id() and user_id = auth.uid());

create policy "members insert company notifications"
  on public.notifications for insert
  with check (company_id = public.auth_company_id());
