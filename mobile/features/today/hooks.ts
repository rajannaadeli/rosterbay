import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/features/auth/hooks';
import { distanceMeters } from '@/lib/compliance';
import type { Tables } from '@/lib/database.types';
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

export function useClockIn() {
  const invalidate = useInvalidateToday();
  return useMutation({
    mutationFn: (input: ClockInInput) => clockIn(input),
    onSuccess: invalidate,
  });
}

export function useClockOut() {
  const invalidate = useInvalidateToday();
  return useMutation({
    mutationFn: (input: ClockOutInput) => clockOut(input),
    onSuccess: invalidate,
  });
}

export function useSetTaskDone(shiftId: string) {
  const queryClient = useQueryClient();
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['today', 'tasks', shiftId] }),
  });
}

export function useReportIssue() {
  return useMutation({ mutationFn: (input: ReportIssueInput) => reportIssue(input) });
}
