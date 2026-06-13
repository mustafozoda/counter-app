import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { promotionsApi, type PromotionInput } from '@/api/promotions';
import type { Id } from '@/types/models';

export const promotionKeys = {
  all: ['promotions'] as const,
};

export function usePromotions() {
  return useQuery({ queryKey: promotionKeys.all, queryFn: () => promotionsApi.listPromotions() });
}

export function useSavePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PromotionInput) => promotionsApi.savePromotion(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => promotionsApi.deletePromotion(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}

export function useSetPromotionActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: Id; active: boolean }) => promotionsApi.setActive(id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promotionKeys.all }),
  });
}
