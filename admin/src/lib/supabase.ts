import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in admin/.env');
}

/** The one Supabase client for the admin console — never instantiate another. */
export const supabase = createClient<Database>(url, anonKey);

/**
 * Resolves a `photo_url` from shift_tasks / issues to something an <img> can
 * load. Worker uploads store an absolute public URL; the seed stores a storage
 * path (`seed/…jpg`) so a nightly reset_demo() needs no project URL in SQL.
 * MIRRORED — the same function lives in mobile/lib/supabase.ts.
 */
export function proofPhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${url}/storage/v1/object/public/task-proof/${photoUrl}`;
}
