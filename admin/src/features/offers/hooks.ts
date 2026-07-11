import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { broadcastOffer, fetchOpenOffers, type BroadcastInput } from './api';

export const OPEN_OFFERS_KEY = ['offers', 'open'] as const;

export function useOpenOffers() {
  return useQuery({ queryKey: OPEN_OFFERS_KEY, queryFn: fetchOpenOffers });
}

export function useBroadcastOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BroadcastInput) => broadcastOffer(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: OPEN_OFFERS_KEY }),
  });
}

/** Keeps open-offer state live so roster chips pulse/resolve in realtime. */
export function useOffersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('shift-offers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_offers' }, () => {
        void queryClient.invalidateQueries({ queryKey: OPEN_OFFERS_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
