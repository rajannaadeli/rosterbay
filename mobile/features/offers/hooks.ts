import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSession } from '@/features/auth/hooks';
import type { Tables } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import {
  acceptOffer,
  fetchMyNotifications,
  fetchOffers,
  markAllNotificationsRead,
  OFFER_TAKEN_CODE,
} from './api';

const OFFERS_KEY = ['offers'] as const;
const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useOffers() {
  return useQuery({ queryKey: OFFERS_KEY, queryFn: fetchOffers });
}

export type AcceptOutcome = 'won' | 'taken';

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  const session = useSession();

  return useMutation<AcceptOutcome, Error, { offerId: string; companyId: string }>({
    mutationFn: async ({ offerId, companyId }) => {
      const workerId = session.data?.user.id;
      if (!workerId) throw new Error('Not signed in');
      try {
        await acceptOffer(offerId, companyId, workerId);
        return 'won';
      } catch (error) {
        // Someone beat us to it — the graceful Filled state, not a failure.
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === OFFER_TAKEN_CODE
        ) {
          return 'taken';
        }
        throw error;
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['schedule'] });
      void queryClient.invalidateQueries({ queryKey: ['today'] });
    },
  });
}

/** Offers arrive and resolve live (MM2's mobile half). */
export function useOffersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('offers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_offers' }, () => {
        void queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Harmless presence garnish: how many other workers have Offers open. */
export function useOthersViewing(): number {
  const session = useSession();
  const userId = session.data?.user.id;
  const [others, setOthers] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('offers-presence', {
      config: { presence: { key: userId } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        setOthers(Math.max(0, Object.keys(channel.presenceState()).length - 1));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ at: Date.now() });
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return others;
}

export function useMyNotifications() {
  return useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchMyNotifications });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData<Tables<'notifications'>[]>(NOTIFICATIONS_KEY, (rows) =>
        rows?.map((row) => ({ ...row, read: true }))
      );
    },
  });
}

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
          queryClient.setQueryData<Tables<'notifications'>[]>(NOTIFICATIONS_KEY, (rows) => {
            if (!rows) return [row];
            if (rows.some((r) => r.id === row.id)) return rows;
            return [row, ...rows];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
