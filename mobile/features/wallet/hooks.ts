import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks';
import { addCert, fetchCertTypes, fetchMyCerts, fetchMyProfile, type AddCertInput } from './api';

export function useMyProfile() {
  const session = useSession();
  const userId = session.data?.user.id ?? '';
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchMyProfile(userId),
    enabled: userId !== '',
  });
}

export function useMyCerts() {
  const session = useSession();
  const userId = session.data?.user.id ?? '';
  return useQuery({
    queryKey: ['certs', userId],
    queryFn: () => fetchMyCerts(userId),
    enabled: userId !== '',
  });
}

export function useCertTypes() {
  return useQuery({ queryKey: ['cert-types'], queryFn: fetchCertTypes, staleTime: Infinity });
}

export function useAddCert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCertInput) => addCert(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['certs'] }),
  });
}
