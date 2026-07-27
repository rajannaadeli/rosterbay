import { supabase } from '@/lib/supabase';
import type { Tables, TablesInsert, Views } from '@/lib/database.types';

export type ShiftTask = Tables<'shift_tasks'>;
export type Issue = Tables<'issues'>;
export type ProofSummary = Views<'shift_proof_summary'>;

/** An issue plus the site it happened at — the shift is only an id on the row. */
export interface IssueWithSite extends Issue {
  site_id: string | null;
}

export async function fetchShiftTasks(shiftId: string) {
  const { data, error } = await supabase
    .from('shift_tasks')
    .select('*')
    .eq('shift_id', shiftId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchShiftIssues(shiftId: string) {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Per-shift task/photo/issue counts for a date range — one row per shift. */
export async function fetchProofSummaries(fromIso: string, toIso: string) {
  const { data, error } = await supabase
    .from('shift_proof_summary')
    .select('*')
    .gte('starts_at', fromIso)
    .lt('starts_at', toIso);
  if (error) throw error;
  return data;
}

/** Ticks and photo submissions on the given shifts, newest first (feed input). */
export async function fetchRecentTaskActivity(shiftIds: string[]) {
  if (shiftIds.length === 0) return [];
  const { data, error } = await supabase
    .from('shift_tasks')
    .select('*')
    .in('shift_id', shiftIds)
    .not('done_at', 'is', null)
    .order('done_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data;
}

/**
 * Open issues across the company. The site comes from a second lookup rather
 * than a PostgREST embed: `database.types.ts` is hand-written with empty
 * Relationships, so embedded selects don't type-infer.
 */
export async function fetchOpenIssues(): Promise<IssueWithSite[]> {
  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (data.length === 0) return [];

  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, site_id')
    .in('id', [...new Set(data.map((issue) => issue.shift_id))]);
  if (shiftsError) throw shiftsError;

  const siteByShift = new Map(shifts.map((s) => [s.id, s.site_id]));
  return data.map((issue) => ({ ...issue, site_id: siteByShift.get(issue.shift_id) ?? null }));
}

/**
 * template_id → number of upcoming shifts already carrying a copy of it. Reads
 * the snapshots, not the templates, which is what "used on N shifts" means once
 * templates are copied rather than live-linked.
 */
export async function fetchTemplateUsage(): Promise<Map<string, number>> {
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id')
    .gt('starts_at', new Date().toISOString())
    .in('status', ['open', 'assigned']);
  if (shiftsError) throw shiftsError;
  if (shifts.length === 0) return new Map();

  const { data, error } = await supabase
    .from('shift_tasks')
    .select('template_id')
    .in(
      'shift_id',
      shifts.map((s) => s.id),
    );
  if (error) throw error;

  const usage = new Map<string, number>();
  for (const row of data) {
    if (row.template_id === null) continue;
    usage.set(row.template_id, (usage.get(row.template_id) ?? 0) + 1);
  }
  return usage;
}

export async function addShiftTask(input: TablesInsert<'shift_tasks'>) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('shift_tasks')
    .insert({ ...input, source: 'adhoc', added_by: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeShiftTask(taskId: string) {
  const { error } = await supabase.from('shift_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function setTaskPhotoRequired(taskId: string, requiresPhoto: boolean) {
  const { error } = await supabase
    .from('shift_tasks')
    .update({ requires_photo: requiresPhoto })
    .eq('id', taskId);
  if (error) throw error;
}

/**
 * The only write an admin makes to an issue. There is deliberately no reply —
 * a message thread is on the spec §10 kill list.
 */
export async function acknowledgeIssue(issueId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('issues')
    .update({
      status: 'acknowledged',
      acknowledged_by: userData.user?.id ?? null,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', issueId);
  if (error) throw error;
}
