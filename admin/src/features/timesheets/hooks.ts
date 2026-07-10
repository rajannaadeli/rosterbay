import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useTimeEntriesRealtime } from '@/features/realtime/hooks';
import type { Tables, Views } from '@/lib/database.types';
import { bulkApprove, fetchTimesheetRow, fetchTimesheets, reviewEntry } from './api';

export type TimesheetRow = Views<'time_entries_with_status'>;

export const TIMESHEETS_KEY = ['timesheets'] as const;

export function useTimesheets() {
  return useQuery({ queryKey: TIMESHEETS_KEY, queryFn: fetchTimesheets });
}

export function useReviewEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      reviewEntry(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TIMESHEETS_KEY }),
  });
}

export function useBulkApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkApprove(ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TIMESHEETS_KEY }),
  });
}

/**
 * MM1 (lite): realtime inserts/updates merge into the cache via one targeted
 * single-row fetch (correct view shape, no refetch storm). Fresh inserts are
 * tracked so rows can animate in.
 */
export function useLiveTimesheets() {
  const queryClient = useQueryClient();
  const [liveIds, setLiveIds] = useState<ReadonlySet<string>>(new Set());

  const onEntry = useCallback(
    (entry: Tables<'time_entries'>, isInsert: boolean) => {
      void fetchTimesheetRow(entry.id)
        .then((row) => {
          queryClient.setQueryData<TimesheetRow[]>(TIMESHEETS_KEY, (rows) => {
            if (!rows) return rows;
            const exists = rows.some((r) => r.id === row.id);
            if (exists) return rows.map((r) => (r.id === row.id ? row : r));
            return [row, ...rows];
          });
          if (isInsert) {
            setLiveIds((prev) => new Set(prev).add(row.id));
          }
        })
        .catch(() => {
          // Row not visible yet (or transient failure) — one targeted refetch.
          void queryClient.invalidateQueries({ queryKey: TIMESHEETS_KEY });
        });
    },
    [queryClient],
  );

  useTimeEntriesRealtime(onEntry);
  return liveIds;
}
