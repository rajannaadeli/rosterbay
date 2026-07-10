import { useQuery } from '@tanstack/react-query';

import { fetchCompany } from './api';

export function useCompany() {
  return useQuery({ queryKey: ['company'], queryFn: fetchCompany, staleTime: Infinity });
}
