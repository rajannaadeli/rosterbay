import { supabase } from '@/lib/supabase';
import { DEMO_ADMIN_EMAIL, DEMO_PASSWORD } from '@/lib/demo';

export async function signInAsAdmin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
