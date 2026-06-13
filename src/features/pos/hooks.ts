import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi, type SaleInput } from '@/api/orders';
import { productKeys } from '@/features/products/hooks';
import type { Id } from '@/types/models';

export const orderKeys = {
  all: ['orders'] as const,
  detail: (id: Id) => ['orders', id] as const,
  transactions: ['transactions'] as const,
};

export function useOrder(id: Id) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.getOrder(id),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.all,
    queryFn: () => ordersApi.listOrders(),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaleInput) => ordersApi.createSale(input),
    onSuccess: () => {
      // A sale moves stock and money — refresh both worlds.
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderKeys.transactions });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
