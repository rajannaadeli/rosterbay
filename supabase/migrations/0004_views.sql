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
