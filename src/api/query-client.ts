import { QueryClient } from '@tanstack/react-query';

/**
 * Server-state cache. All Supabase/API access in later phases flows through
 * TanStack Query against this client (offline persistence arrives with the
 * sync engine in Phase 2).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 2,
    },
  },
});
