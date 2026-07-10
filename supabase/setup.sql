-- RosterBay — consolidated setup
-- Paste this entire file into the Supabase SQL editor and run it once.
-- It is the exact concatenation of migrations/0001…0005, in order.
-- After it succeeds: add SUPABASE_SERVICE_ROLE_KEY to the root .env and run
--   npm run seed:auth   (from the repo root)
-- which creates the 16 auth users and then calls reset_demo().

-- ============================================================
-- migrations/0001_schema.sql
-- ============================================================
-- RosterBay — 0001 schema
-- Full spec §2 schema. Multi-tenant: every table (except companies) carries
-- company_id + created_at. All timestamps stored UTC (timestamptz).

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Australia/Adelaide',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null check (role in ('admin', 'supervisor', 'worker')),
  full_name text not null,
  phone text,
  avatar_url text,
  job_title text,
  availability_notes text,
  created_at timestamptz not null default now()
);
create index profiles_company_id_idx on public.profiles (company_id);

create table public.cert_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  code text not null,
  validity_months int, -- null = does not expire (e.g. White Card)
  requires_document boolean not null default true,
  created_at timestamptz not null default now()
);
create index cert_types_company_id_idx on public.cert_types (company_id);

create table public.worker_certs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  cert_type_id uuid not null references public.cert_types (id) on delete cascade,
  issued_on date not null,
  expires_on date not null,
  file_url text,
  created_at timestamptz not null default now()
);
create index worker_certs_company_id_idx on public.worker_certs (company_id);
create index worker_certs_worker_id_idx on public.worker_certs (worker_id);
create index worker_certs_cert_type_id_idx on public.worker_certs (cert_type_id);
create index worker_certs_expires_on_idx on public.worker_certs (expires_on);

create table public.job_sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  client_name text,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  geofence_radius_m int not null default 150
    check (geofence_radius_m between 50 and 500),
  required_cert_type_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index job_sites_company_id_idx on public.job_sites (company_id);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  site_id uuid not null references public.job_sites (id) on delete cascade,
  title text not null,
  requires_photo boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index task_templates_company_id_idx on public.task_templates (company_id);
create index task_templates_site_id_idx on public.task_templates (site_id);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  site_id uuid not null references public.job_sites (id) on delete cascade,
  worker_id uuid references public.profiles (id) on delete set null, -- null = unfilled
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role_required text,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  notes text,
  -- cert-compliance override trail (the only block admins may override; never double-booking)
  override_reason text,
  override_by uuid references public.profiles (id) on delete set null,
  override_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index shifts_company_id_idx on public.shifts (company_id);
create index shifts_starts_at_idx on public.shifts (starts_at);
create index shifts_site_id_idx on public.shifts (site_id);
create index shifts_worker_id_idx on public.shifts (worker_id);
create index shifts_status_idx on public.shifts (status);

create table public.shift_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  broadcast_at timestamptz not null default now(),
  status text not null default 'open'
    check (status in ('open', 'filled', 'expired')),
  created_at timestamptz not null default now()
);
create index shift_offers_company_id_idx on public.shift_offers (company_id);
create index shift_offers_shift_id_idx on public.shift_offers (shift_id);
create index shift_offers_status_idx on public.shift_offers (status);

create table public.offer_responses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  offer_id uuid not null references public.shift_offers (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  responded_at timestamptz not null default now(),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);
create index offer_responses_company_id_idx on public.offer_responses (company_id);
create index offer_responses_offer_id_idx on public.offer_responses (offer_id);
create index offer_responses_worker_id_idx on public.offer_responses (worker_id);
-- first accepted response wins — enforced by the database, not application code
create unique index offer_responses_one_accept
  on public.offer_responses (offer_id)
  where accepted;

create table public.shift_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  template_id uuid references public.task_templates (id) on delete set null,
  title text not null,
  requires_photo boolean not null default false,
  done boolean not null default false,
  done_at timestamptz,
  photo_url text,
  created_at timestamptz not null default now()
);
create index shift_tasks_company_id_idx on public.shift_tasks (company_id);
create index shift_tasks_shift_id_idx on public.shift_tasks (shift_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  in_lat double precision,
  in_lng double precision,
  out_lat double precision,
  out_lng double precision,
  distance_from_site_m numeric,
  within_geofence boolean,
  flags text[] not null default '{}', -- 'late' | 'out_of_zone' | 'missing_clock_out'
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'flagged', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index time_entries_company_id_idx on public.time_entries (company_id);
create index time_entries_shift_id_idx on public.time_entries (shift_id);
create index time_entries_worker_id_idx on public.time_entries (worker_id);
create index time_entries_status_idx on public.time_entries (status);
create index time_entries_clock_in_at_idx on public.time_entries (clock_in_at);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  photo_url text,
  created_at timestamptz not null default now()
);
create index issues_company_id_idx on public.issues (company_id);
create index issues_shift_id_idx on public.issues (shift_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  ref_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_company_id_idx on public.notifications (company_id);
create index notifications_user_id_read_idx on public.notifications (user_id, read);

-- ============================================================
-- migrations/0002_rls.sql
-- ============================================================
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

-- ============================================================
-- migrations/0003_storage.sql
-- ============================================================
-- RosterBay — 0003 storage buckets
-- Public-read buckets for demo simplicity (spec §1). Uploads restricted to
-- authenticated company users.

insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('task-proof', 'task-proof', true)
on conflict (id) do nothing;

create policy "authenticated read demo buckets"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('certificates', 'task-proof'));

create policy "authenticated upload to demo buckets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('certificates', 'task-proof'));

create policy "authenticated update own uploads in demo buckets"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('certificates', 'task-proof') and owner = auth.uid());

-- ============================================================
-- migrations/0004_views.sql
-- ============================================================
-- RosterBay — 0004 computed status views
-- Cert status lives in Postgres so web and mobile can never disagree.
-- A generated column can't reference now(), so this is a stable function + views.
-- Thresholds: expired = past expiry, expiring_soon = within 30 days, else valid —
-- all evaluated against the current date in Australia/Adelaide.

create or replace function public.cert_status(expires_on date)
returns text
language sql stable
as $$
  select case
    when expires_on < (now() at time zone 'Australia/Adelaide')::date then 'expired'
    when expires_on <= (now() at time zone 'Australia/Adelaide')::date + 30 then 'expiring_soon'
    else 'valid'
  end
$$;

grant execute on function public.cert_status(date) to authenticated;

-- security_invoker: the underlying tables' RLS applies to whoever queries the view.
create or replace view public.worker_certs_with_status
with (security_invoker = true) as
select
  wc.*,
  public.cert_status(wc.expires_on) as status,
  (wc.expires_on - (now() at time zone 'Australia/Adelaide')::date)::int as days_until_expiry
from public.worker_certs wc;

-- One row per worker with the aggregates the Workers table needs:
-- compliance = worst cert status, shifts this ACST week (Mon–Sun), last clock-in.
create or replace view public.worker_overview
with (security_invoker = true) as
select
  p.id,
  p.company_id,
  p.role,
  p.full_name,
  p.phone,
  p.avatar_url,
  p.job_title,
  p.created_at,
  case
    when bool_or(public.cert_status(wc.expires_on) = 'expired') then 'expired'
    when bool_or(public.cert_status(wc.expires_on) = 'expiring_soon') then 'expiring_soon'
    else 'valid'
  end as compliance_status,
  (
    select count(*)::int
    from public.shifts s
    where s.worker_id = p.id
      and s.status <> 'cancelled'
      and s.starts_at >= date_trunc('week', now() at time zone 'Australia/Adelaide')
            at time zone 'Australia/Adelaide'
      and s.starts_at < (date_trunc('week', now() at time zone 'Australia/Adelaide')
            + interval '7 days') at time zone 'Australia/Adelaide'
  ) as shifts_this_week,
  (
    select max(te.clock_in_at)
    from public.time_entries te
    where te.worker_id = p.id
  ) as last_clock_in_at
from public.profiles p
left join public.worker_certs wc on wc.worker_id = p.id
where p.role = 'worker'
group by p.id;

-- ============================================================
-- migrations/0005_reset_demo.sql
-- ============================================================
-- RosterBay — 0005 reset_demo()
-- Idempotent seed: truncates all tenant data and reseeds everything relative to
-- now() in Australia/Adelaide. Zero hardcoded dates.
--
-- PREREQUISITE: the 16 auth.users rows must exist (scripts/seed-auth.ts creates
-- them with the same fixed UUIDs) before this runs, because profiles.id FKs
-- auth.users. seed-auth.ts creates users then calls this via RPC.
--
-- Fixed UUIDs mirror scripts/demo-ids.ts — change them in both places or not at all.

-- Positive modulo (Postgres mod() is negative for negative operands; the seed
-- generator indexes arrays with day offsets that go negative).
create or replace function public.pmod(a int, m int)
returns int
language sql immutable
as $$
  select ((a % m) + m) % m
$$;

create or replace function public.reset_demo()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  tz constant text := 'Australia/Adelaide';
  v_today date := (now() at time zone 'Australia/Adelaide')::date;

  cid constant uuid := 'c0000000-0000-4000-8000-000000000001';

  -- people (auth.users UUIDs — see scripts/demo-ids.ts)
  u_marcus constant uuid := '10000000-0000-4000-8000-000000000001';
  u_sofia  constant uuid := '10000000-0000-4000-8000-000000000002';
  w_liam   constant uuid := '20000000-0000-4000-8000-000000000001';
  w_priya  constant uuid := '20000000-0000-4000-8000-000000000002';
  w_jack   constant uuid := '20000000-0000-4000-8000-000000000003';
  w_fatima constant uuid := '20000000-0000-4000-8000-000000000004';
  w_ethan  constant uuid := '20000000-0000-4000-8000-000000000005';
  w_mei    constant uuid := '20000000-0000-4000-8000-000000000006';
  w_noah   constant uuid := '20000000-0000-4000-8000-000000000007';
  w_aisha  constant uuid := '20000000-0000-4000-8000-000000000008';
  w_dylan  constant uuid := '20000000-0000-4000-8000-000000000009';
  w_hannah constant uuid := '20000000-0000-4000-8000-000000000010';
  w_marco  constant uuid := '20000000-0000-4000-8000-000000000011';
  w_grace  constant uuid := '20000000-0000-4000-8000-000000000012';
  w_raj    constant uuid := '20000000-0000-4000-8000-000000000013';
  w_sarah  constant uuid := '20000000-0000-4000-8000-000000000014';

  -- cert types
  ct_white   constant uuid := '30000000-0000-4000-8000-000000000001';
  ct_firstaid constant uuid := '30000000-0000-4000-8000-000000000002';
  ct_police  constant uuid := '30000000-0000-4000-8000-000000000003';
  ct_sasl    constant uuid := '30000000-0000-4000-8000-000000000004';
  ct_heights constant uuid := '30000000-0000-4000-8000-000000000005';

  -- sites
  s_kingsford constant uuid := '40000000-0000-4000-8000-000000000001';
  s_marion    constant uuid := '40000000-0000-4000-8000-000000000002';
  s_hospital  constant uuid := '40000000-0000-4000-8000-000000000003';
  s_wingfield constant uuid := '40000000-0000-4000-8000-000000000004';
  s_riverbank constant uuid := '40000000-0000-4000-8000-000000000005';

  v_cleaners constant uuid[] := array[w_priya, w_jack, w_fatima, w_mei, w_aisha, w_hannah, w_grace, w_raj];
  v_guards   constant uuid[] := array[w_liam, w_ethan, w_noah, w_dylan, w_marco, w_sarah];

  def record;
  v_d int;
  v_day date;
  v_dow int;
  v_taken text[];
  v_pool uuid[];
  v_n int;
  v_k int;
  v_cand uuid;
  v_worker uuid;
  v_starts timestamptz;
  v_ends timestamptz;
  v_shift_id uuid;
  v_lat double precision;
  v_lng double precision;
  v_ci timestamptz;
  v_co timestamptz;
  v_sat date;
  v_days_to_sat int;
begin
  -- 1 · wipe tenant data ------------------------------------------------------
  truncate table
    public.notifications,
    public.issues,
    public.time_entries,
    public.shift_tasks,
    public.offer_responses,
    public.shift_offers,
    public.shifts,
    public.task_templates,
    public.job_sites,
    public.worker_certs,
    public.cert_types,
    public.profiles,
    public.companies;

  -- 2 · company + people ------------------------------------------------------
  insert into public.companies (id, name, timezone)
  values (cid, 'Torrens Facility Services', tz);

  insert into public.profiles (id, company_id, role, full_name, phone, avatar_url, job_title, availability_notes) values
    (u_marcus, cid, 'admin',      'Marcus Webb',        '0400 118 224', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=MarcusWebb',        'Operations Manager', null),
    (u_sofia,  cid, 'supervisor', 'Sofia Marino',       '0400 271 903', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=SofiaMarino',       'Site Supervisor', null),
    (w_liam,   cid, 'worker',     'Liam Nguyen',        '0401 334 566', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=LiamNguyen',        'Security Guard', 'Prefers arvo and night shifts. Studying Tue/Thu mornings.'),
    (w_priya,  cid, 'worker',     'Priya Sharma',       '0402 445 677', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=PriyaSharma',       'Cleaner', 'Mornings only — school pickup at 3pm.'),
    (w_jack,   cid, 'worker',     'Jack O''Connell',    '0403 556 788', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=JackOConnell',      'Cleaner', 'Renewing First Aid — booked in for a course next week.'),
    (w_fatima, cid, 'worker',     'Fatima Hassan',      '0404 667 899', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=FatimaHassan',      'Cleaner', 'Not available Fridays.'),
    (w_ethan,  cid, 'worker',     'Ethan Walker',       '0405 778 900', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=EthanWalker',       'Security Guard', null),
    (w_mei,    cid, 'worker',     'Mei Chen',           '0406 889 011', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=MeiChen',           'Cleaner', 'Happy to pick up extra weekend shifts.'),
    (w_noah,   cid, 'worker',     'Noah Taylor',        '0407 990 122', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=NoahTaylor',        'Security Guard', null),
    (w_aisha,  cid, 'worker',     'Aisha Okafor',       '0408 101 233', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=AishaOkafor',       'Cleaner', 'Max 30 hrs/week.'),
    (w_dylan,  cid, 'worker',     'Dylan Murphy',       '0409 212 344', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=DylanMurphy',       'Security Guard', null),
    (w_hannah, cid, 'worker',     'Hannah Kim',         '0410 323 455', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=HannahKim',         'Cleaner', null),
    (w_marco,  cid, 'worker',     'Marco Rossi',        '0411 434 566', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=MarcoRossi',        'Security Guard', 'No Sundays.'),
    (w_grace,  cid, 'worker',     'Grace Papadopoulos', '0412 545 677', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=GracePapadopoulos', 'Cleaner', null),
    (w_raj,    cid, 'worker',     'Raj Patel',          '0413 656 788', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=RajPatel',          'Cleaner', 'Also holds Working at Heights — good for Wingfield racking.'),
    (w_sarah,  cid, 'worker',     'Sarah Bennett',      '0414 767 899', 'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=SarahBennett',      'Security Guard', null);

  -- 3 · cert types ------------------------------------------------------------
  insert into public.cert_types (id, company_id, name, code, validity_months, requires_document) values
    (ct_white,    cid, 'White Card',                'CPCWHS1001', null, true),  -- doesn't expire in AU
    (ct_firstaid, cid, 'First Aid',                 'HLTAID011',  36,   true),
    (ct_police,   cid, 'National Police Check',     'NPC',        12,   true),
    (ct_sasl,     cid, 'SA Security Agents Licence','SA-SAL',     12,   true),
    (ct_heights,  cid, 'Working at Heights',        'RIIWHS204E', 24,   true);

  -- 4 · job sites -------------------------------------------------------------
  insert into public.job_sites (id, company_id, name, client_name, address, lat, lng, geofence_radius_m, required_cert_type_ids) values
    (s_kingsford, cid, 'Kingsford Corporate Tower',       'Meridian Property Group',     '25 King William St, Adelaide SA 5000',    -34.92350, 138.59950, 120, array[ct_white]),
    (s_marion,    cid, 'Westfield Marion',                'Marion Retail Management',    '297 Diagonal Rd, Oaklands Park SA 5046',  -35.01460, 138.54460, 250, array[ct_white]),
    (s_hospital,  cid, 'North Adelaide Private Hospital', 'Adelaide Health Partners',    '61 Kermode St, North Adelaide SA 5006',   -34.90660, 138.59340, 150, array[ct_white, ct_firstaid, ct_police]),
    (s_wingfield, cid, 'Wingfield Logistics Hub',         'SouthGate Freight',           '12 Cormack Rd, Wingfield SA 5013',        -34.84940, 138.55800, 200, array[ct_white, ct_heights]),
    (s_riverbank, cid, 'Riverbank Events Centre',         'Riverbank Precinct Authority','Festival Dr, Adelaide SA 5000',           -34.92000, 138.58900,  80, array[ct_white, ct_sasl]);

  -- 5 · task templates (4–6 per site, 2 requiring photos) -----------------------
  insert into public.task_templates (company_id, site_id, title, requires_photo, sort_order) values
    (cid, s_kingsford, 'Vacuum lobby & level-1 corridors',      false, 1),
    (cid, s_kingsford, 'Empty bins — all levels',               false, 2),
    (cid, s_kingsford, 'Clean & restock restrooms',             false, 3),
    (cid, s_kingsford, 'Photo of cleaned lobby floor',          true,  4),
    (cid, s_kingsford, 'Polish lift doors & mirrors',           false, 5),
    (cid, s_kingsford, 'Photograph secured loading dock',       true,  6),

    (cid, s_marion, 'Food court tables & seating wipe-down',    false, 1),
    (cid, s_marion, 'Clean & restock restrooms',                false, 2),
    (cid, s_marion, 'Photo of cleaned food court seating',      true,  3),
    (cid, s_marion, 'Empty bins — east concourse',              false, 4),
    (cid, s_marion, 'Spot-clean entrance glass doors',          false, 5),
    (cid, s_marion, 'Photograph secured loading dock',          true,  6),

    (cid, s_hospital, 'Sanitise ward touchpoints',              false, 1),
    (cid, s_hospital, 'Mop theatre corridor',                   false, 2),
    (cid, s_hospital, 'Photo of sanitised waiting area',        true,  3),
    (cid, s_hospital, 'Restock PPE stations',                   false, 4),
    (cid, s_hospital, 'Photo of cleaned nurses station',        true,  5),

    (cid, s_wingfield, 'Sweep loading bays',                    false, 1),
    (cid, s_wingfield, 'Photograph secured loading dock',       true,  2),
    (cid, s_wingfield, 'Check racking aisles clear',            false, 3),
    (cid, s_wingfield, 'Empty compactor-area bins',             false, 4),
    (cid, s_wingfield, 'Photo of locked chemical store',        true,  5),

    (cid, s_riverbank, 'Patrol riverside promenade',            false, 1),
    (cid, s_riverbank, 'Check emergency exits',                 false, 2),
    (cid, s_riverbank, 'Photo of secured main gates',           true,  3),
    (cid, s_riverbank, 'Crowd-barrier inspection',              false, 4),
    (cid, s_riverbank, 'Photo of cleared function lawn',        true,  5);

  -- 6 · worker certs ----------------------------------------------------------
  -- Deliberate mess: Jack's First Aid expired 6 days ago (blocks the hospital);
  -- exactly two amber certs — Priya's Police Check in 9 days, Ethan's SA licence
  -- in 13 days. Every other expiry is > 30 days out.
  insert into public.worker_certs (company_id, worker_id, cert_type_id, issued_on, expires_on) values
    -- White Card — everyone, never expires (100-year horizon keeps the view happy)
    (cid, w_liam,   ct_white, v_today - 820, v_today + 36500),
    (cid, w_priya,  ct_white, v_today - 640, v_today + 36500),
    (cid, w_jack,   ct_white, v_today - 910, v_today + 36500),
    (cid, w_fatima, ct_white, v_today - 505, v_today + 36500),
    (cid, w_ethan,  ct_white, v_today - 770, v_today + 36500),
    (cid, w_mei,    ct_white, v_today - 430, v_today + 36500),
    (cid, w_noah,   ct_white, v_today - 690, v_today + 36500),
    (cid, w_aisha,  ct_white, v_today - 350, v_today + 36500),
    (cid, w_dylan,  ct_white, v_today - 580, v_today + 36500),
    (cid, w_hannah, ct_white, v_today - 260, v_today + 36500),
    (cid, w_marco,  ct_white, v_today - 720, v_today + 36500),
    (cid, w_grace,  ct_white, v_today - 490, v_today + 36500),
    (cid, w_raj,    ct_white, v_today - 830, v_today + 36500),
    (cid, w_sarah,  ct_white, v_today - 310, v_today + 36500),
    -- First Aid (36 months)
    (cid, w_jack,   ct_firstaid, (v_today - 6 - interval '36 months')::date,   v_today - 6),   -- EXPIRED 6 days ago
    (cid, w_priya,  ct_firstaid, (v_today + 200 - interval '36 months')::date, v_today + 200),
    (cid, w_fatima, ct_firstaid, (v_today + 320 - interval '36 months')::date, v_today + 320),
    (cid, w_mei,    ct_firstaid, (v_today + 150 - interval '36 months')::date, v_today + 150),
    (cid, w_aisha,  ct_firstaid, (v_today + 400 - interval '36 months')::date, v_today + 400),
    (cid, w_hannah, ct_firstaid, (v_today + 90  - interval '36 months')::date, v_today + 90),
    (cid, w_grace,  ct_firstaid, (v_today + 260 - interval '36 months')::date, v_today + 260),
    (cid, w_raj,    ct_firstaid, (v_today + 480 - interval '36 months')::date, v_today + 480),
    (cid, w_liam,   ct_firstaid, (v_today + 310 - interval '36 months')::date, v_today + 310),
    (cid, w_noah,   ct_firstaid, (v_today + 140 - interval '36 months')::date, v_today + 140),
    (cid, w_marco,  ct_firstaid, (v_today + 520 - interval '36 months')::date, v_today + 520),
    (cid, w_sarah,  ct_firstaid, (v_today + 60  - interval '36 months')::date, v_today + 60),
    -- National Police Check (12 months)
    (cid, w_priya,  ct_police, (v_today + 9   - interval '12 months')::date, v_today + 9),    -- AMBER: 9 days
    (cid, w_jack,   ct_police, (v_today + 100 - interval '12 months')::date, v_today + 100),
    (cid, w_fatima, ct_police, (v_today + 230 - interval '12 months')::date, v_today + 230),
    (cid, w_mei,    ct_police, (v_today + 180 - interval '12 months')::date, v_today + 180),
    (cid, w_aisha,  ct_police, (v_today + 40  - interval '12 months')::date, v_today + 40),
    (cid, w_hannah, ct_police, (v_today + 300 - interval '12 months')::date, v_today + 300),
    (cid, w_grace,  ct_police, (v_today + 140 - interval '12 months')::date, v_today + 140),
    (cid, w_raj,    ct_police, (v_today + 75  - interval '12 months')::date, v_today + 75),
    (cid, w_liam,   ct_police, (v_today + 280 - interval '12 months')::date, v_today + 280),
    (cid, w_sarah,  ct_police, (v_today + 190 - interval '12 months')::date, v_today + 190),
    -- SA Security Agents Licence (12 months) — all guards
    (cid, w_liam,   ct_sasl, (v_today + 240 - interval '12 months')::date, v_today + 240),
    (cid, w_ethan,  ct_sasl, (v_today + 13  - interval '12 months')::date, v_today + 13),     -- AMBER: 13 days
    (cid, w_noah,   ct_sasl, (v_today + 310 - interval '12 months')::date, v_today + 310),
    (cid, w_dylan,  ct_sasl, (v_today + 120 - interval '12 months')::date, v_today + 120),
    (cid, w_marco,  ct_sasl, (v_today + 200 - interval '12 months')::date, v_today + 200),
    (cid, w_sarah,  ct_sasl, (v_today + 95  - interval '12 months')::date, v_today + 95),
    -- Working at Heights (24 months)
    (cid, w_fatima, ct_heights, (v_today + 400 - interval '24 months')::date, v_today + 400),
    (cid, w_raj,    ct_heights, (v_today + 600 - interval '24 months')::date, v_today + 600),
    (cid, w_ethan,  ct_heights, (v_today + 350 - interval '24 months')::date, v_today + 350),
    (cid, w_dylan,  ct_heights, (v_today + 280 - interval '24 months')::date, v_today + 280);

  -- 7 · generated roster: 3 weeks history + this week + 1 future week ----------
  -- Daily slot matrix; yesterday (d = -1) is hand-seeded below for exact
  -- flagged/pending counts. Future days are ~80% filled.
  for v_d in -21..7 loop
    continue when v_d = -1;
    v_day := v_today + v_d;
    v_dow := extract(isodow from v_day)::int; -- 1 Mon … 7 Sun
    v_taken := '{}';

    for def in
      select * from (values
        (1,  s_kingsford, 'Cleaner',        'morning', 'weekdays'),
        (2,  s_kingsford, 'Cleaner',        'arvo',    'weekdays'),
        (3,  s_kingsford, 'Security Guard', 'night',   'daily'),
        (4,  s_marion,    'Cleaner',        'morning', 'daily'),
        (5,  s_marion,    'Security Guard', 'arvo',    'daily'),
        (6,  s_hospital,  'Cleaner',        'morning', 'daily'),
        (7,  s_hospital,  'Cleaner',        'arvo',    'daily'),
        (8,  s_wingfield, 'Cleaner',        'morning', 'weekdays'),
        (9,  s_riverbank, 'Security Guard', 'arvo',    'fri_sun'),
        (10, s_riverbank, 'Cleaner',        'morning', 'weekend')
      ) as t(slot, sid, role_name, timeslot, cadence)
    loop
      continue when def.cadence = 'weekdays' and v_dow > 5;
      continue when def.cadence = 'fri_sun'  and v_dow < 5;
      continue when def.cadence = 'weekend'  and v_dow < 6;

      -- AU shift presets: Morning 6–2, Arvo 2–10, Night 10–6
      if def.timeslot = 'morning' then
        v_starts := (v_day + time '06:00') at time zone tz;
        v_ends   := (v_day + time '14:00') at time zone tz;
      elsif def.timeslot = 'arvo' then
        v_starts := (v_day + time '14:00') at time zone tz;
        v_ends   := (v_day + time '22:00') at time zone tz;
      else
        v_starts := (v_day + time '22:00') at time zone tz;
        v_ends   := ((v_day + 1) + time '06:00') at time zone tz;
      end if;

      -- future week: leave ~20% unfilled (the red chips Phase 2 renders)
      if v_d > 0 and public.pmod(v_d * 7 + def.slot, 5) = 0 then
        insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status)
        values (cid, def.sid, null, v_starts, v_ends, def.role_name, 'open');
        continue;
      end if;

      -- deterministic rotation with no same-day double-booking; Jack is kept
      -- off the hospital once his First Aid lapses; Mei is reserved for the
      -- bespoke in-progress shift today.
      v_pool := case when def.role_name = 'Cleaner' then v_cleaners else v_guards end;
      v_n := array_length(v_pool, 1);
      v_worker := null;
      for v_k in 0..v_n - 1 loop
        v_cand := v_pool[1 + public.pmod(v_d + def.slot + v_k, v_n)];
        continue when v_cand = w_jack and def.sid = s_hospital and v_d >= -6;
        continue when v_cand = w_mei and v_d = 0;
        continue when (v_cand::text || ':' || v_d::text) = any (v_taken);
        v_worker := v_cand;
        exit;
      end loop;
      continue when v_worker is null;
      v_taken := v_taken || (v_worker::text || ':' || v_d::text);

      if v_ends <= now() then
        -- completed shift with a clean, approved timesheet entry
        insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status)
        values (cid, def.sid, v_worker, v_starts, v_ends, def.role_name, 'completed')
        returning id into v_shift_id;

        select lat, lng into v_lat, v_lng from public.job_sites where id = def.sid;
        v_ci := v_starts + make_interval(mins => public.pmod(v_d * 5 + def.slot * 3, 13) - 5);
        v_co := v_ends + make_interval(mins => public.pmod(v_d + def.slot, 9));

        insert into public.time_entries (
          company_id, shift_id, worker_id, clock_in_at, clock_out_at,
          in_lat, in_lng, out_lat, out_lng,
          distance_from_site_m, within_geofence, flags, status, reviewed_by, reviewed_at)
        values (
          cid, v_shift_id, v_worker, v_ci, v_co,
          v_lat + 0.0002, v_lng - 0.0002, v_lat + 0.0001, v_lng - 0.0003,
          12 + public.pmod(v_d * 11 + def.slot * 7, 55), true, '{}', 'approved',
          u_marcus, least(v_co + interval '10 hours', now()));
      else
        insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status)
        values (cid, def.sid, v_worker, v_starts, v_ends, def.role_name, 'assigned');
      end if;
    end loop;
  end loop;

  -- 8 · yesterday, hand-seeded: 1 late (22 min), 1 out-of-zone (410 m),
  --     6 clean pending — exact dashboard numbers, every run ------------------
  declare
    y date := v_today - 1;
    r record;
  begin
    for r in
      select * from (values
        -- (site, worker, start, finish, role, flags, status, ci_offset_min, dist_m, within)
        (s_marion,    w_dylan,  time '14:00', time '22:00', 'Security Guard', array['late']::text[],        'flagged', 22, 35,  true),
        (s_wingfield, w_fatima, time '06:00', time '14:00', 'Cleaner',        array['out_of_zone']::text[], 'flagged', -3, 410, false),
        (s_kingsford, w_priya,  time '06:00', time '14:00', 'Cleaner',        '{}'::text[],                 'pending', -4, 28,  true),
        (s_kingsford, w_raj,    time '14:00', time '22:00', 'Cleaner',        '{}'::text[],                 'pending',  2, 41,  true),
        (s_marion,    w_hannah, time '06:00', time '14:00', 'Cleaner',        '{}'::text[],                 'pending', -6, 66,  true),
        (s_hospital,  w_aisha,  time '06:00', time '14:00', 'Cleaner',        '{}'::text[],                 'pending',  5, 22,  true),
        (s_hospital,  w_grace,  time '14:00', time '22:00', 'Cleaner',        '{}'::text[],                 'pending', -2, 37,  true),
        (s_riverbank, w_liam,   time '14:00', time '22:00', 'Security Guard', '{}'::text[],                 'pending',  1, 18,  true)
      ) as t(sid, wid, t_start, t_end, role_name, flags, entry_status, ci_offset_min, dist_m, within)
    loop
      insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status)
      values (cid, r.sid, r.wid, (y + r.t_start) at time zone tz, (y + r.t_end) at time zone tz, r.role_name, 'completed')
      returning id into v_shift_id;

      select lat, lng into v_lat, v_lng from public.job_sites where id = r.sid;

      insert into public.time_entries (
        company_id, shift_id, worker_id, clock_in_at, clock_out_at,
        in_lat, in_lng, out_lat, out_lng,
        distance_from_site_m, within_geofence, flags, status)
      values (
        cid, v_shift_id, r.wid,
        (y + r.t_start) at time zone tz + make_interval(mins => r.ci_offset_min),
        (y + r.t_end) at time zone tz + make_interval(mins => 3),
        v_lat + (r.dist_m / 111320.0), v_lng, v_lat + (r.dist_m / 111320.0), v_lng,
        r.dist_m, r.within, r.flags, r.entry_status);
    end loop;
  end;

  -- 9 · one shift in progress RIGHT NOW (live map is never empty) -------------
  insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status, notes)
  values (cid, s_marion, w_mei, now() - interval '2 hours', now() + interval '6 hours',
          'Cleaner', 'in_progress', 'Centre management asked for extra attention to the food court.')
  returning id into v_shift_id;

  insert into public.time_entries (
    company_id, shift_id, worker_id, clock_in_at,
    in_lat, in_lng, distance_from_site_m, within_geofence, flags, status)
  select cid, v_shift_id, w_mei, now() - interval '116 minutes',
         lat + 0.0003, lng - 0.0001, 45, true, '{}', 'pending'
  from public.job_sites where id = s_marion;

  -- 2 of 5 tasks done, mid-shift
  insert into public.shift_tasks (company_id, shift_id, template_id, title, requires_photo, done, done_at)
  select cid, v_shift_id, tt.id, tt.title, tt.requires_photo,
         tt.sort_order <= 2,
         case when tt.sort_order <= 2 then now() - make_interval(mins => 95 - tt.sort_order * 25) end
  from public.task_templates tt
  where tt.site_id = s_marion and tt.sort_order <= 5
  order by tt.sort_order;

  -- 10 · the unfilled Saturday-night security shift at the events venue --------
  v_days_to_sat := public.pmod(6 - extract(isodow from v_today)::int, 7);
  if v_days_to_sat = 0 then
    v_days_to_sat := 7;
  end if;
  v_sat := v_today + v_days_to_sat;

  insert into public.shifts (company_id, site_id, worker_id, starts_at, ends_at, role_required, status, notes)
  values (cid, s_riverbank, null,
          (v_sat + time '22:00') at time zone tz,
          ((v_sat + 1) + time '06:00') at time zone tz,
          'Security Guard', 'open',
          'River festival bump-out — gate security required.');
end;
$fn$;

-- Only the service role / postgres may reset the demo.
revoke execute on function public.reset_demo() from public, anon, authenticated;

-- Nightly reset at 03:00 ACST (17:30 UTC). Uncomment once pg_cron is enabled
-- on the project (Database → Extensions → pg_cron) at deploy time (Phase 3):
-- select cron.schedule('rosterbay-nightly-reset', '30 17 * * *', 'select public.reset_demo()');
