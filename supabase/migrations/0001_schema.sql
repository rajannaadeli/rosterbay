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
