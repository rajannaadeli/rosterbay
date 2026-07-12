import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

export async function fetchSites() {
  const { data, error } = await supabase.from('job_sites').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function fetchSite(siteId: string) {
  const { data, error } = await supabase.from('job_sites').select('*').eq('id', siteId).single();
  if (error) throw error;
  return data;
}

export async function createSite(input: TablesInsert<'job_sites'>) {
  const { data, error } = await supabase.from('job_sites').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateSite(siteId: string, patch: TablesUpdate<'job_sites'>) {
  const { data, error } = await supabase
    .from('job_sites')
    .update(patch)
    .eq('id', siteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSite(siteId: string) {
  const { error } = await supabase.from('job_sites').delete().eq('id', siteId);
  if (error) throw error;
}

export async function fetchTaskTemplates(siteId: string) {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchTaskCounts() {
  const { data, error } = await supabase.from('task_templates').select('site_id');
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.site_id, (counts.get(row.site_id) ?? 0) + 1);
  }
  return counts;
}

export async function createTaskTemplate(input: TablesInsert<'task_templates'>) {
  const { data, error } = await supabase.from('task_templates').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateTaskTemplate(id: string, patch: TablesUpdate<'task_templates'>) {
  const { data, error } = await supabase
    .from('task_templates')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaskTemplate(id: string) {
  const { error } = await supabase.from('task_templates').delete().eq('id', id);
  if (error) throw error;
}

/** Persist a full drag-reordered list — sort_order becomes 1-based position. */
export async function reorderTaskTemplates(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('task_templates')
        .update({ sort_order: index + 1 })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
        }),
    ),
  );
}
