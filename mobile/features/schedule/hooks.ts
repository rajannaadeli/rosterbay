import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks';
import { fetchMyShifts, fetchShift, fetchSites } from './api';

export function useMyShifts() {
  const session = useSession();
  const userId = session.data?.user.id ?? '';
  return useQuery({
    queryKey: ['schedule', 'shifts', userId],
    queryFn: () => fetchMyShifts(userId),
    enabled: userId !== '',
  });
}

export function useShift(shiftId: string) {
  return useQuery({
    queryKey: ['schedule', 'shift', shiftId],
    queryFn: () => fetchShift(shiftId),
    enabled: shiftId !== '',
  });
}

export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: fetchSites, staleTime: Infinity });
}
