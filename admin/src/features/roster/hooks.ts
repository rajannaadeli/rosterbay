import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types';
import {
  assignShift,
  cancelShift,
  createShift,
  fetchAllWorkerCerts,
  fetchShiftsRange,
  unassignShift,
  updateShift,
  type AssignShiftInput,
} from './api';

export const shiftsKey = (fromIso: string) => ['shifts', fromIso] as const;

export function useShiftsRange(fromIso: string, toIso: string) {
  return useQuery({
    queryKey: shiftsKey(fromIso),
    queryFn: () => fetchShiftsRange(fromIso, toIso),
  });
}

export function useAllWorkerCerts() {
  return useQuery({ queryKey: ['worker-certs', 'all'], queryFn: fetchAllWorkerCerts });
}

type Shift = Tables<'shifts'>;

/** Optimistically patch one shift in the week cache; roll back on failure. */
function useOptimisticShiftPatch(fromIso: string) {
  const queryClient = useQueryClient();
  const key = shiftsKey(fromIso);

  return {
    apply: async (shiftId: string, patch: Partial<Shift>) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Shift[]>(key);
      queryClient.setQueryData<Shift[]>(key, (shifts) =>
        shifts?.map((s) => (s.id === shiftId ? { ...s, ...patch } : s)),
      );
      return { previous };
    },
    rollback: (context: { previous?: Shift[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    settle: () => void queryClient.invalidateQueries({ queryKey: key }),
  };
}

export function useAssignShift(fromIso: string) {
  const optimistic = useOptimisticShiftPatch(fromIso);
  return useMutation({
    mutationFn: (input: AssignShiftInput) => assignShift(input),
    onMutate: (input) =>
      optimistic.apply(input.shiftId, { worker_id: input.workerId, status: 'assigned' }),
    onError: (_err, _input, context) => optimistic.rollback(context),
    onSettled: () => optimistic.settle(),
  });
}

export function useUnassignShift(fromIso: string) {
  const optimistic = useOptimisticShiftPatch(fromIso);
  return useMutation({
    mutationFn: (shiftId: string) => unassignShift(shiftId),
    onMutate: (shiftId) => optimistic.apply(shiftId, { worker_id: null, status: 'open' }),
    onError: (_err, _input, context) => optimistic.rollback(context),
    onSettled: () => optimistic.settle(),
  });
}

export function useCreateShift(fromIso: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TablesInsert<'shifts'>) => createShift(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: shiftsKey(fromIso) }),
  });
}

export function useUpdateShift(fromIso: string) {
  const optimistic = useOptimisticShiftPatch(fromIso);
  return useMutation({
    mutationFn: ({ shiftId, patch }: { shiftId: string; patch: TablesUpdate<'shifts'> }) =>
      updateShift(shiftId, patch),
    onMutate: ({ shiftId, patch }) => optimistic.apply(shiftId, patch as Partial<Shift>),
    onError: (_err, _input, context) => optimistic.rollback(context),
    onSettled: () => optimistic.settle(),
  });
}

export function useCancelShift(fromIso: string) {
  const optimistic = useOptimisticShiftPatch(fromIso);
  return useMutation({
    mutationFn: (shiftId: string) => cancelShift(shiftId),
    onMutate: (shiftId) => optimistic.apply(shiftId, { status: 'cancelled' }),
    onError: (_err, _input, context) => optimistic.rollback(context),
    onSettled: () => optimistic.settle(),
  });
}
