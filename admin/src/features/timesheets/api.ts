import { supabase } from '@/lib/supabase';
import type { TimeEntryStatus } from '@/lib/database.types';

/** Demo data volumes — the whole view loads once; filters are client-side. */
export async function fetchTimesheets() {
  const { data, error } = await supabase
    .from('time_entries_with_status')
    .select('*')
    .order('clock_in_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Single-row fetch used by the realtime handler (correct view shape). */
export async function fetchTimesheetRow(id: string) {
  const { data, error } = await supabase
    .from('time_entries_with_status')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function reviewEntry(id: string, status: Extract<TimeEntryStatus, 'approved' | 'rejected'>) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('time_entries')
    .update({
      status,
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function bulkApprove(ids: string[]) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('time_entries')
    .update({
      status: 'approved',
      reviewed_by: userData.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', ids);
  if (error) throw error;
}
