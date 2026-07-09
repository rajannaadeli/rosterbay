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
