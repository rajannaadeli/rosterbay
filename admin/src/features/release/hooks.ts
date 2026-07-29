import { useQuery } from '@tanstack/react-query';

import { fetchWorkerAppRelease } from './api';

/**
 * The published APK's build stamp. Long `staleTime` and no retries: the file
 * changes a few times a day at most, and a rate-limited or offline GitHub
 * should cost the landing page one silent null, not a burst of retries.
 */
export function useWorkerAppRelease() {
  return useQuery({
    queryKey: ['worker-app-release'],
    queryFn: fetchWorkerAppRelease,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  });
}
