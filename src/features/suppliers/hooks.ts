import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  suppliersApi,
  type PurchaseOrderInput,
  type SupplierInput,
} from '@/api/suppliers';
import { orderKeys } from '@/features/pos/hooks';
import { productKeys } from '@/features/products/hooks';
import type { Id } from '@/types/models';

export const supplierKeys = {
  all: ['suppliers'] as const,
  detail: (id: Id) => ['suppliers', id] as const,
  purchaseOrders: ['purchase-orders'] as const,
};

export function useSuppliers() {
  return useQuery({ queryKey: supplierKeys.all, queryFn: () => suppliersApi.listSuppliers() });
}

export function useSupplier(id: Id) {
  return useQuery({ queryKey: supplierKeys.detail(id), queryFn: () => suppliersApi.getSupplier(id) });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: supplierKeys.purchaseOrders,
    queryFn: () => suppliersApi.listPurchaseOrders(),
  });
}

export function useSaveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SupplierInput) => suppliersApi.saveSupplier(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => suppliersApi.deleteSupplier(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => suppliersApi.createPurchaseOrder(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supplierKeys.purchaseOrders }),
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => suppliersApi.receivePurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supplierKeys.purchaseOrders });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderKeys.transactions });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => suppliersApi.cancelPurchaseOrder(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supplierKeys.purchaseOrders }),
  });
}
