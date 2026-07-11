import { supabase } from '@/lib/supabase';

/** RLS scopes rows to the signed-in user. */
export async function fetchMyNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export async function markAllRead() {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false);
  if (error) throw error;
}
