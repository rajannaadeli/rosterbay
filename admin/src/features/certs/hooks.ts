import { useQuery } from '@tanstack/react-query';

import { fetchCertTypes } from './api';

export function useCertTypes() {
  return useQuery({ queryKey: ['cert-types'], queryFn: fetchCertTypes, staleTime: Infinity });
}
