-- RosterBay — 0007 Phase 3: offers resolution, notifications, realtime.

-- Offer cards need shift context; open offers past shift start read as expired
-- (same derived pattern as cert status / missing_clock_out).
create or replace view public.shift_offers_with_status
with (security_invoker = true) as
select
  o.*,
  s.starts_at as shift_starts_at,
  s.ends_at as shift_ends_at,
  s.site_id,
  s.role_required,
  case
    when o.status = 'open' and now() >= s.starts_at then 'expired'
    else o.status
  end as effective_status
from public.shift_offers o
join public.shifts s on s.id = o.shift_id;

-- First-accept-wins resolution. The partial unique index
-- offer_responses_one_accept is the race arbiter: the second accepted insert
-- fails with 23505 before this trigger ever runs. The winner's transaction
-- (security definer — workers can't update unassigned shifts directly) marks
-- the offer filled, assigns the shift, and notifies winner + admins.
create or replace function public.handle_offer_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer shift_offers%rowtype;
  v_shift shifts%rowtype;
  v_worker_name text;
  v_site_name text;
  v_when text;
begin
  if new.accepted is not true then
    return new;
  end if;

  select * into v_offer from shift_offers where id = new.offer_id for update;
  if v_offer.status <> 'open' then
    raise exception 'offer is already %', v_offer.status using errcode = '23505';
  end if;

  update shift_offers set status = 'filled' where id = new.offer_id;
  update shifts
    set worker_id = new.worker_id, status = 'assigned'
    where id = v_offer.shift_id
    returning * into v_shift;

  select full_name into v_worker_name from profiles where id = new.worker_id;
  select name into v_site_name from job_sites where id = v_shift.site_id;
  v_when := to_char(v_shift.starts_at at time zone 'Australia/Adelaide', 'Dy DD Mon, HH12:MIam');

  insert into notifications (company_id, user_id, kind, title, body, ref_id)
  values (
    new.company_id, new.worker_id, 'offer_won',
    'You''re confirmed',
    'You''re confirmed for ' || v_site_name || ' — ' || v_when || '.',
    v_shift.id
  );

  insert into notifications (company_id, user_id, kind, title, body, ref_id)
  select new.company_id, p.id, 'offer_filled',
         'Shift offer filled',
         v_worker_name || ' accepted ' || v_site_name || ' — ' || v_when || '.',
         v_shift.id
  from profiles p
  where p.company_id = new.company_id and p.role = 'admin';

  return new;
end;
$$;

drop trigger if exists offer_accept_trigger on public.offer_responses;
create trigger offer_accept_trigger
  after insert on public.offer_responses
  for each row execute function public.handle_offer_accept();

-- Realtime for MM2 + notifications.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.shift_offers;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.notifications;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
