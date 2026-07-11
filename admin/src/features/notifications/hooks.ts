import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { fetchMyNotifications, markAllRead } from './api';

const KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({ queryKey: KEY, queryFn: fetchMyNotifications });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.setQueryData<Tables<'notifications'>[]>(KEY, (rows) =>
        rows?.map((row) => ({ ...row, read: true })),
      );
    },
  });
}

/** New notifications land in the list live (RLS filters to own rows). */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const row = payload.new as Tables<'notifications'>;
          queryClient.setQueryData<Tables<'notifications'>[]>(KEY, (rows) => {
            if (!rows) return rows;
            if (rows.some((r) => r.id === row.id)) return rows;
            return [row, ...rows];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
