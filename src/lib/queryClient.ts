import { QueryClient } from "@tanstack/react-query";

/** Cache transversal para leituras Supabase das páginas de produto. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
