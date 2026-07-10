import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { shiftsKey } from '@/features/roster/hooks';

type Shift = Tables<'shifts'>;
type TimeEntry = Tables<'time_entries'>;

/** Roster live-updates: shift status flips (in_progress / completed) land on the board. */
export function useShiftsRealtime(fromIso: string, toIso: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`shifts-${fromIso}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        (payload) => {
          const row = payload.new as Shift;
          if (!row?.id) return;
          if (row.starts_at < fromIso || row.starts_at >= toIso) return;
          queryClient.setQueryData<Shift[]>(shiftsKey(fromIso), (shifts) => {
            if (!shifts) return shifts;
            const exists = shifts.some((s) => s.id === row.id);
            if (payload.eventType === 'INSERT' && !exists) return [...shifts, row];
            if (exists) return shifts.map((s) => (s.id === row.id ? row : s));
            return shifts;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fromIso, toIso, queryClient]);
}

/**
 * MM1 plumbing: stream time_entries inserts/updates into the Timesheets page.
 * The payload is a raw table row; the caller maps it into the view shape (or
 * falls back to one targeted invalidate when it can't).
 */
export function useTimeEntriesRealtime(onEntry: (entry: TimeEntry, isInsert: boolean) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('time-entries-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'time_entries' },
        (payload) => onEntry(payload.new as TimeEntry, true),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'time_entries' },
        (payload) => onEntry(payload.new as TimeEntry, false),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // onEntry is intentionally captured once — callers pass a stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
