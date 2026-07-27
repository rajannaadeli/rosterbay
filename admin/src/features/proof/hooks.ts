import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/lib/database.types';
import {
  acknowledgeIssue,
  addShiftTask,
  fetchOpenIssues,
  fetchProofSummaries,
  fetchRecentTaskActivity,
  fetchShiftIssues,
  fetchShiftTasks,
  fetchTemplateUsage,
  removeShiftTask,
  setTaskPhotoRequired,
} from './api';

export const PROOF_KEY = ['proof'] as const;

export function useShiftTasks(shiftId: string | null) {
  return useQuery({
    queryKey: [...PROOF_KEY, 'tasks', shiftId],
    queryFn: () => fetchShiftTasks(shiftId!),
    enabled: shiftId !== null,
  });
}

export function useShiftIssues(shiftId: string | null) {
  return useQuery({
    queryKey: [...PROOF_KEY, 'issues', shiftId],
    queryFn: () => fetchShiftIssues(shiftId!),
    enabled: shiftId !== null,
  });
}

/** Roster-week (or dashboard-window) proof counts, keyed by range start. */
export function useProofSummaries(fromIso: string, toIso: string) {
  return useQuery({
    queryKey: [...PROOF_KEY, 'summaries', fromIso, toIso],
    queryFn: () => fetchProofSummaries(fromIso, toIso),
  });
}

export function useRecentTaskActivity(shiftIds: string[]) {
  const key = [...shiftIds].sort().join(',');
  return useQuery({
    queryKey: [...PROOF_KEY, 'activity', key],
    queryFn: () => fetchRecentTaskActivity(shiftIds),
    enabled: shiftIds.length > 0,
  });
}

export function useOpenIssues() {
  return useQuery({ queryKey: [...PROOF_KEY, 'open-issues'], queryFn: fetchOpenIssues });
}

export function useTemplateUsage() {
  return useQuery({ queryKey: [...PROOF_KEY, 'template-usage'], queryFn: fetchTemplateUsage });
}

/** Every proof mutation invalidates the whole namespace — counts are derived. */
function useInvalidateProof() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: PROOF_KEY });
}

export function useShiftTaskMutations() {
  const invalidate = useInvalidateProof();

  const add = useMutation({
    mutationFn: (input: TablesInsert<'shift_tasks'>) => addShiftTask(input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (taskId: string) => removeShiftTask(taskId),
    onSuccess: invalidate,
  });
  const togglePhoto = useMutation({
    mutationFn: ({ taskId, requiresPhoto }: { taskId: string; requiresPhoto: boolean }) =>
      setTaskPhotoRequired(taskId, requiresPhoto),
    onSuccess: invalidate,
  });

  return { add, remove, togglePhoto };
}

export function useAcknowledgeIssue() {
  const invalidate = useInvalidateProof();
  return useMutation({
    mutationFn: (issueId: string) => acknowledgeIssue(issueId),
    onSuccess: invalidate,
  });
}

/**
 * Ticks, photos and issue reports land on the board while the shift runs —
 * same targeted-invalidate approach as the timesheet stream, since every proof
 * number in the UI is derived rather than stored.
 */
export function useProofRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: PROOF_KEY });
    const channel = supabase
      .channel('proof-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_tasks' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, invalidate)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
