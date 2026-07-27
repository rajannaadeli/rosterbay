import { supabase } from '@/lib/supabase';
import { instantiateShiftTasks } from '@/features/proof/task-instantiation';
import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

export async function fetchShiftsRange(fromIso: string, toIso: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso)
    .order('starts_at');
  if (error) throw error;
  return data;
}

/** Every worker's certs with server-computed status — conflict-engine input. */
export async function fetchAllWorkerCerts() {
  const { data, error } = await supabase.from('worker_certs_with_status').select('*');
  if (error) throw error;
  return data;
}

export interface AssignShiftInput {
  shiftId: string;
  workerId: string;
  /** Present only on a cert override — stored in shifts.notes as `OVERRIDE: …`. */
  overrideReason?: string;
}

export async function assignShift({ shiftId, workerId, overrideReason }: AssignShiftInput) {
  const patch: TablesUpdate<'shifts'> = { worker_id: workerId, status: 'assigned' };
  if (overrideReason) {
    patch.notes = `OVERRIDE: ${overrideReason}`;
    patch.override_reason = overrideReason;
    patch.override_at = new Date().toISOString();
    const { data: userData } = await supabase.auth.getUser();
    patch.override_by = userData.user?.id ?? null;
  }
  const { data, error } = await supabase
    .from('shifts')
    .update(patch)
    .eq('id', shiftId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function unassignShift(shiftId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .update({ worker_id: null, status: 'open' })
    .eq('id', shiftId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates the shift and immediately snapshots the site's task checklist onto
 * it. The copy happens here — at creation — so a later template edit can never
 * change a shift that already exists (spec §1).
 */
export async function createShift(input: TablesInsert<'shifts'>) {
  const { data, error } = await supabase.from('shifts').insert(input).select().single();
  if (error) throw error;

  const { data: templates, error: templatesError } = await supabase
    .from('task_templates')
    .select('id, title, requires_photo, sort_order')
    .eq('site_id', data.site_id)
    .order('sort_order');
  if (templatesError) throw templatesError;

  const tasks = instantiateShiftTasks({
    templates: templates ?? [],
    shiftId: data.id,
    companyId: data.company_id,
  });
  if (tasks.length > 0) {
    const { error: tasksError } = await supabase.from('shift_tasks').insert(tasks);
    if (tasksError) throw tasksError;
  }
  return data;
}

export async function updateShift(shiftId: string, patch: TablesUpdate<'shifts'>) {
  const { data, error } = await supabase
    .from('shifts')
    .update(patch)
    .eq('id', shiftId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cancelShift(shiftId: string) {
  return updateShift(shiftId, { status: 'cancelled' });
}
