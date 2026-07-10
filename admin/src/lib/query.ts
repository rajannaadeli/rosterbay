import { QueryClient } from '@tanstack/react-query';

/** Shared Query defaults (CLAUDE.md): 60s staleTime, no refetch-on-focus storms. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
