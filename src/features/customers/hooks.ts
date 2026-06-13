import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { customersApi, type CustomerInput } from '@/api/customers';
import { orderKeys } from '@/features/pos/hooks';
import type { FulfillmentStatus, Id } from '@/types/models';
import { ordersApi, type RefundInput } from '@/api/orders';

export const customerKeys = {
  all: ['customers'] as const,
  detail: (id: Id) => ['customers', id] as const,
};

export function useCustomers() {
  return useQuery({ queryKey: customerKeys.all, queryFn: () => customersApi.listCustomers() });
}

export function useCustomer(id: Id) {
  return useQuery({ queryKey: customerKeys.detail(id), queryFn: () => customersApi.getCustomer(id) });
}

export function useSaveCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput & { id?: Id }) => customersApi.saveCustomer(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => customersApi.deleteCustomer(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RefundInput) => ordersApi.refundOrder(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderKeys.transactions });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useSetFulfillment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: Id; status: FulfillmentStatus }) =>
      ordersApi.setFulfillment(orderId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
}
