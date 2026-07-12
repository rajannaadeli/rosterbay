import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TablesInsert, TablesUpdate } from '@/lib/database.types';
import {
  createSite,
  createTaskTemplate,
  deleteSite,
  deleteTaskTemplate,
  fetchSite,
  fetchSites,
  fetchTaskCounts,
  fetchTaskTemplates,
  reorderTaskTemplates,
  updateSite,
  updateTaskTemplate,
} from './api';

export function useSites() {
  return useQuery({ queryKey: ['sites'], queryFn: fetchSites });
}

export function useSite(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId],
    queryFn: () => fetchSite(siteId),
    enabled: siteId !== '',
  });
}

export function useTaskCounts() {
  return useQuery({ queryKey: ['sites', 'task-counts'], queryFn: fetchTaskCounts });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TablesInsert<'job_sites'>) => createSite(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useUpdateSite(siteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: TablesUpdate<'job_sites'>) => updateSite(siteId, patch),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (siteId: string) => deleteSite(siteId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useTaskTemplates(siteId: string) {
  return useQuery({
    queryKey: ['sites', siteId, 'tasks'],
    queryFn: () => fetchTaskTemplates(siteId),
  });
}

export function useTaskTemplateMutations(siteId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['sites', siteId, 'tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['sites', 'task-counts'] });
  };

  const create = useMutation({
    mutationFn: (input: TablesInsert<'task_templates'>) => createTaskTemplate(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'task_templates'> }) =>
      updateTaskTemplate(id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTaskTemplate(id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderTaskTemplates(orderedIds),
    onSuccess: invalidate,
  });

  return { create, update, remove, reorder };
}
