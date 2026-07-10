/**
 * Idempotent auth seeding for the 16 RosterBay demo users.
 *
 * Usage (from repo root, after supabase/setup.sql has been run):
 *   1. Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env
 *   2. npm install && npm run seed:auth
 *
 * Creates each auth user with its fixed UUID (profiles rows in reset_demo()
 * reference these exact ids), then calls reset_demo() to seed tenant data.
 * Safe to run repeatedly: existing users with the right id are left alone; a
 * user whose email exists under a different id is deleted and recreated.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DEMO_PASSWORD, DEMO_USERS } from './demo-ids';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.\n' +
      'Copy .env.example to .env and fill both in (service role key: Supabase dashboard → Settings → API keys).',
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllUsersByEmail(): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < 100) break;
  }
  return byEmail;
}

async function main(): Promise<void> {
  const existing = await listAllUsersByEmail();
  let created = 0;
  let skipped = 0;

  for (const user of DEMO_USERS) {
    const existingId = existing.get(user.email);

    if (existingId === user.id) {
      skipped++;
      continue;
    }

    if (existingId && existingId !== user.id) {
      console.warn(`~ ${user.email} exists under wrong id ${existingId} — recreating`);
      const { error: deleteError } = await admin.auth.admin.deleteUser(existingId);
      if (deleteError) throw new Error(`delete ${user.email}: ${deleteError.message}`);
    }

    const { data, error } = await admin.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: user.fullName, role: user.role },
    });
    if (error) throw new Error(`create ${user.email}: ${error.message}`);
    if (data.user.id !== user.id) {
      throw new Error(
        `create ${user.email}: server assigned id ${data.user.id}, expected ${user.id} — ` +
          'GoTrue ignored the fixed id; reset_demo() would not match. Aborting.',
      );
    }
    console.log(`+ created ${user.email} (${user.role})`);
    created++;
  }

  console.log(`\nAuth users: ${created} created, ${skipped} already correct.`);

  console.log('Calling reset_demo() to seed tenant data…');
  const { error: rpcError } = await admin.rpc('reset_demo');
  if (rpcError) {
    throw new Error(
      `reset_demo() failed: ${rpcError.message}\n` +
        'Has supabase/setup.sql been run in the SQL editor?',
    );
  }
  console.log('reset_demo() OK — demo data seeded.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
