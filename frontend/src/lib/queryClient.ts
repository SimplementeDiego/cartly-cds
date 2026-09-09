import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export async function clearPrivateQueries() {
  const privateKeys = new Set(['cart', 'orders', 'profile', 'checkout-status', 'admin-products', 'admin']);
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) => privateKeys.has(String(query.queryKey[0])) };
  await queryClient.cancelQueries(filters);
  queryClient.removeQueries(filters);
}
