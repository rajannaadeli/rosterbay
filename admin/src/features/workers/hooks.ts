import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchWorker,
  fetchWorkerCerts,
  fetchWorkers,
  fetchWorkerShifts,
  updateAvailabilityNotes,
  uploadCert,
  type UploadCertInput,
} from './api';

export function useWorkers() {
  return useQuery({ queryKey: ['workers'], queryFn: fetchWorkers });
}

export function useWorker(workerId: string) {
  return useQuery({ queryKey: ['workers', workerId], queryFn: () => fetchWorker(workerId) });
}

export function useWorkerCerts(workerId: string) {
  return useQuery({
    queryKey: ['workers', workerId, 'certs'],
    queryFn: () => fetchWorkerCerts(workerId),
  });
}

export function useWorkerShifts(workerId: string) {
  return useQuery({
    queryKey: ['workers', workerId, 'shifts'],
    queryFn: () => fetchWorkerShifts(workerId),
  });
}

export function useUploadCert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadCertInput) => uploadCert(input),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['workers', input.workerId, 'certs'] });
      void queryClient.invalidateQueries({ queryKey: ['workers'], exact: true });
    },
  });
}

export function useUpdateAvailabilityNotes(workerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notes: string | null) => updateAvailabilityNotes(workerId, notes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workers', workerId] }),
  });
}
