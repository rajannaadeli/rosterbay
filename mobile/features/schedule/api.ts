import { supabase } from '@/lib/supabase';

export async function fetchMyShifts(userId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('worker_id', userId)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchShift(shiftId: string) {
  const { data, error } = await supabase.from('shifts').select('*').eq('id', shiftId).single();
  if (error) throw error;
  return data;
}

export async function fetchSites() {
  const { data, error } = await supabase.from('job_sites').select('*');
  if (error) throw error;
  return data;
}

export async function fetchSiteTemplates(siteId: string) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order');
  if (error) throw error;
  return data;
}
