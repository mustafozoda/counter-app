import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { financingApi, type CreatePlanInput } from '@/api/financing';
import { orderKeys } from '@/features/pos/hooks';
import type { Id } from '@/types/models';

export const financingKeys = {
  all: ['financing'] as const,
  detail: (id: Id) => ['financing', id] as const,
};

export function usePlans() {
  return useQuery({ queryKey: financingKeys.all, queryFn: () => financingApi.listPlans() });
}

export function usePlan(id: Id) {
  return useQuery({ queryKey: financingKeys.detail(id), queryFn: () => financingApi.getPlan(id) });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanInput) => financingApi.createPlan(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: financingKeys.all }),
  });
}

export function useMarkInstallmentPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, installmentId }: { planId: Id; installmentId: Id }) =>
      financingApi.markInstallmentPaid(planId, installmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financingKeys.all });
      // Installment payments are income — refresh finance surfaces.
      void queryClient.invalidateQueries({ queryKey: orderKeys.transactions });
    },
  });
}

export function useCancelPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => financingApi.cancelPlan(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: financingKeys.all }),
  });
}
