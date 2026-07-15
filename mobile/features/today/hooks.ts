import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/hooks';
import { computeClockInFlags, distanceMeters } from '@/lib/compliance';
import type { Tables } from '@/lib/database.types';
import { toast } from '@/lib/toast';
import {
  clockIn,
  clockOut,
  fetchActiveEntry,
  fetchMyCurrentOrNextShift,
  fetchShiftTasks,
  fetchSite,
  reportIssue,
  setTaskDone,
  type ClockInInput,
  type ClockOutInput,
  type Coords,
  type ReportIssueInput,
} from './api';

export function useMyShift() {
  const session = useSession();
  const userId = session.data?.user.id ?? '';
  return useQuery({
    queryKey: ['today', 'shift', userId],
    queryFn: () => fetchMyCurrentOrNextShift(userId),
    enabled: userId !== '',
    refetchInterval: 60_000,
  });
}

export function useSite(siteId: string | undefined) {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => fetchSite(siteId!),
    enabled: siteId !== undefined,
  });
}

export function useActiveEntry(shiftId: string | undefined) {
  return useQuery({
    queryKey: ['today', 'entry', shiftId],
    queryFn: () => fetchActiveEntry(shiftId!),
    enabled: shiftId !== undefined,
  });
}

export function useShiftTasks(shiftId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['today', 'tasks', shiftId],
    queryFn: () => fetchShiftTasks(shiftId!),
    enabled: shiftId !== undefined && enabled,
  });
}

export type LocationStatus = 'loading' | 'ready' | 'denied' | 'unavailable';

export interface LocationReading {
  status: LocationStatus;
  coords: Coords | null;
  /** Fresh one-shot reading (used at the clock-in moment). */
  read: () => Promise<Coords | null>;
}

/**
 * Foreground-only location (kill list: no background tracking). Degrades
 * politely on web or denial — callers treat null coords as "no location".
 */
export function useLocation(): LocationReading {
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [coords, setCoords] = useState<Coords | null>(null);

  const read = useCallback(async (): Promise<Coords | null> => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        return null;
      }
      // Fast path: the OS's last-known fix returns almost instantly, so `coords`
      // is warm well before the worker taps Clock In. We then refine it with a
      // fresh reading in the background (never blocking the tap).
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setCoords({ lat: last.coords.latitude, lng: last.coords.longitude });
        setStatus('ready');
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCoords(next);
      setStatus('ready');
      return next;
    } catch {
      setStatus('unavailable');
      return null;
    }
  }, []);

  useEffect(() => {
    void read();
  }, [read]);

  return { status, coords, read };
}

export function distanceToSite(coords: Coords | null, site: Tables<'job_sites'> | undefined) {
  if (!coords || !site) return null;
  return distanceMeters(coords.lat, coords.lng, site.lat, site.lng);
}

function useInvalidateToday() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['today'] });
    void queryClient.invalidateQueries({ queryKey: ['schedule'] });
  };
}

type Entry = Tables<'time_entries'>;
type ShiftRow = Tables<'shifts'>;

/**
 * Build the entry the worker should see the instant they tap Clock In — same
 * flags/geofence the server will compute, so nothing shifts under them when the
 * real row lands. The id is a temp sentinel; onSettled swaps in the real row.
 */
function optimisticEntry(input: ClockInInput): Entry {
  const { flags, withinGeofence, status } = computeClockInFlags({
    shiftStartsAt: input.shift.starts_at,
    clockInAt: new Date(),
    distanceM: input.distanceM,
    geofenceRadiusM: input.site.geofence_radius_m,
  });
  const now = new Date().toISOString();
  return {
    id: `optimistic-${input.shift.id}`,
    company_id: input.shift.company_id,
    shift_id: input.shift.id,
    worker_id: input.shift.worker_id!,
    clock_in_at: now,
    clock_out_at: null,
    in_lat: input.coords?.lat ?? null,
    in_lng: input.coords?.lng ?? null,
    out_lat: null,
    out_lng: null,
    distance_from_site_m: input.distanceM,
    within_geofence: withinGeofence,
    flags,
    status,
    reviewed_by: null,
    reviewed_at: null,
    created_at: now,
  };
}

/**
 * Clock in feels instant: we flip the shift to in_progress and drop an
 * optimistic entry into the cache on tap, so the screen becomes the in-shift
 * view immediately even while the multi-step write runs. Rolls back on error.
 */
export function useClockIn() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateToday();
  return useMutation({
    mutationFn: (input: ClockInInput) => clockIn(input),
    onMutate: async (input) => {
      const shiftKey = ['today', 'shift', input.shift.worker_id ?? ''];
      const entryKey = ['today', 'entry', input.shift.id];
      await Promise.all([
        queryClient.cancelQueries({ queryKey: shiftKey }),
        queryClient.cancelQueries({ queryKey: entryKey }),
      ]);
      const prevShift = queryClient.getQueryData<ShiftRow | null>(shiftKey);
      const prevEntry = queryClient.getQueryData<Entry | null>(entryKey);
      queryClient.setQueryData(entryKey, optimisticEntry(input));
      queryClient.setQueryData<ShiftRow | null>(shiftKey, (s) =>
        s ? { ...s, status: 'in_progress' } : s
      );
      return { shiftKey, entryKey, prevShift, prevEntry };
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(ctx.shiftKey, ctx.prevShift);
      queryClient.setQueryData(ctx.entryKey, ctx.prevEntry);
    },
    onSettled: invalidate,
  });
}

/**
 * Clock out is likewise optimistic: end the entry and complete the shift in the
 * cache on tap so the button never sits on a spinner waiting for the round trip.
 */
export function useClockOut() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateToday();
  return useMutation({
    mutationFn: (input: ClockOutInput) => clockOut(input),
    onMutate: async (input) => {
      const entryKey = ['today', 'entry', input.shiftId];
      await queryClient.cancelQueries({ queryKey: entryKey });
      const prevEntry = queryClient.getQueryData<Entry | null>(entryKey);
      queryClient.setQueryData<Entry | null>(entryKey, (e) =>
        e ? { ...e, clock_out_at: new Date().toISOString() } : e
      );
      return { entryKey, prevEntry };
    },
    onError: (_err, _input, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.entryKey, ctx.prevEntry);
    },
    onSettled: invalidate,
  });
}

type ShiftTask = Tables<'shift_tasks'>;

export function useSetTaskDone(shiftId: string) {
  const queryClient = useQueryClient();
  const key = ['today', 'tasks', shiftId];
  return useMutation({
    mutationFn: ({
      taskId,
      done,
      photoUrl,
    }: {
      taskId: string;
      done: boolean;
      photoUrl?: string;
    }) => setTaskDone(taskId, done, photoUrl),
    // Flip the checkbox instantly; the write runs in the background.
    onMutate: async ({ taskId, done, photoUrl }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ShiftTask[]>(key);
      queryClient.setQueryData<ShiftTask[]>(key, (rows) =>
        (rows ?? []).map((t) =>
          t.id === taskId
            ? {
                ...t,
                done,
                done_at: done ? new Date().toISOString() : null,
                ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
              }
            : t
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
      toast.error("Couldn't update the task — try again.");
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useReportIssue() {
  return useMutation({ mutationFn: (input: ReportIssueInput) => reportIssue(input) });
}
