-- RosterBay — 0008 nightly reset via pg_cron.
-- 17:30 UTC = 03:00 ACST (next day). Requires the pg_cron extension, enabled
-- from the Supabase dashboard (Database → Extensions) — see DEPLOY.md. This
-- file is safe to run before that: it schedules only when the extension exists.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'rosterbay-nightly-reset') then
      perform cron.schedule('rosterbay-nightly-reset', '30 17 * * *', 'select public.reset_demo()');
    end if;
    raise notice 'rosterbay-nightly-reset scheduled (03:00 ACST daily)';
  else
    raise notice 'pg_cron not enabled — enable the extension, then re-run this file';
  end if;
end $$;
