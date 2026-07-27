import { supabase } from '@/lib/supabase';
import { computeClockInFlags } from '@/lib/compliance';
import type { Tables } from '@/lib/database.types';

export type Shift = Tables<'shifts'>;
export type TimeEntry = Tables<'time_entries'>;
export type ShiftTask = Tables<'shift_tasks'>;

/** The worker's current (in-progress) or next assigned shift. */
export async function fetchMyCurrentOrNextShift(userId: string) {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .eq('worker_id', userId)
    .in('status', ['assigned', 'in_progress'])
    .gt('ends_at', new Date().toISOString())
    .order('starts_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSite(siteId: string) {
  const { data, error } = await supabase.from('job_sites').select('*').eq('id', siteId).single();
  if (error) throw error;
  return data;
}

export async function fetchActiveEntry(shiftId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('shift_id', shiftId)
    .is('clock_out_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface Coords {
  lat: number;
  lng: number;
}

export interface ClockInInput {
  shift: Shift;
  site: Tables<'job_sites'>;
  coords: Coords | null;
  /** Haversine distance, pre-computed with the shared util. Null = no location. */
  distanceM: number | null;
}

/**
 * Clock in: insert the time entry (flags computed by the shared compliance
 * module) and flip the shift to in_progress.
 *
 * The shift's checklist is *not* built here — it was snapshotted from the
 * site's templates when the shift was created (admin side). Copying at
 * clock-in would silently re-link an old shift to today's templates.
 */
export async function clockIn({ shift, site, coords, distanceM }: ClockInInput) {
  const { flags, withinGeofence, status } = computeClockInFlags({
    shiftStartsAt: shift.starts_at,
    clockInAt: new Date(),
    distanceM,
    geofenceRadiusM: site.geofence_radius_m,
  });

  // Clean up any orphaned time entries from previous failed clock-in attempts.
  // These can accumulate when the shift status update fails (e.g. missing RLS
  // policy) leaving entries with no clock_out that block .maybeSingle() reads.
  const { data: orphans } = await supabase
    .from('time_entries')
    .select('id')
    .eq('shift_id', shift.id)
    .is('clock_out_at', null);
  if (orphans && orphans.length > 0) {
    await supabase
      .from('time_entries')
      .update({ clock_out_at: new Date().toISOString() })
      .in(
        'id',
        orphans.map((o) => o.id)
      );
  }

  const { data: entry, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: shift.company_id,
      shift_id: shift.id,
      worker_id: shift.worker_id!,
      clock_in_at: new Date().toISOString(),
      in_lat: coords?.lat ?? null,
      in_lng: coords?.lng ?? null,
      distance_from_site_m: distanceM,
      within_geofence: withinGeofence,
      flags,
      status,
    })
    .select()
    .single();
  if (error) throw error;

  // Use .select() to verify the update actually took effect (RLS can silently
  // make .update() affect 0 rows without raising an error).
  const { data: updatedShift, error: shiftError } = await supabase
    .from('shifts')
    .update({ status: 'in_progress' })
    .eq('id', shift.id)
    .select('status')
    .single();
  if (shiftError) throw shiftError;
  if (updatedShift?.status !== 'in_progress') {
    throw new Error('Failed to update shift status — check RLS policies');
  }

  return entry;
}

export interface ClockOutInput {
  entryId: string;
  shiftId: string;
  coords: Coords | null;
}

export async function clockOut({ entryId, shiftId, coords }: ClockOutInput) {
  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_out_at: new Date().toISOString(),
      out_lat: coords?.lat ?? null,
      out_lng: coords?.lng ?? null,
    })
    .eq('id', entryId);
  if (error) throw error;

  const { error: shiftError } = await supabase
    .from('shifts')
    .update({ status: 'completed' })
    .eq('id', shiftId);
  if (shiftError) throw shiftError;
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

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadTaskProof(shiftId: string, base64: string, mimeType: string) {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${shiftId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from('task-proof')
    .upload(path, base64ToBytes(base64).buffer as ArrayBuffer, { contentType: mimeType });
  if (error) throw error;
  return supabase.storage.from('task-proof').getPublicUrl(path).data.publicUrl;
}

export async function setTaskDone(taskId: string, done: boolean, photoUrl?: string) {
  const { error } = await supabase
    .from('shift_tasks')
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
      ...(photoUrl !== undefined && { photo_url: photoUrl }),
    })
    .eq('id', taskId);
  if (error) throw error;
}

export interface ReportIssueInput {
  companyId: string;
  shiftId: string;
  workerId: string;
  note: string;
  photoBase64?: string;
  mimeType?: string;
}

export async function reportIssue(input: ReportIssueInput) {
  let photoUrl: string | null = null;
  if (input.photoBase64) {
    photoUrl = await uploadTaskProof(
      input.shiftId,
      input.photoBase64,
      input.mimeType ?? 'image/jpeg'
    );
  }
  const { error } = await supabase.from('issues').insert({
    company_id: input.companyId,
    shift_id: input.shiftId,
    worker_id: input.workerId,
    note: input.note,
    photo_url: photoUrl,
  });
  if (error) throw error;
}
