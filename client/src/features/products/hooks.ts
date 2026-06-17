import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { i18n } from '@/i18n';
import {
  productsApi,
  type CategoryInput,
  type ProductInput,
  type ReceiveStockInput,
} from '@/api/products';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import type { Id, ProductStatus, StockMovementType } from '@/types/models';

export const productKeys = {
  all: ['products'] as const,
  detail: (id: Id) => ['products', id] as const,
  movements: (id: Id) => ['products', id, 'movements'] as const,
  categories: ['categories'] as const,
};

export function useProducts() {
  const vertical = useStoreProfile((s) => s.store?.vertical ?? 'other');
  return useQuery({
    queryKey: productKeys.all,
    queryFn: async () => {
      await productsApi.ensureSeeded(vertical);
      return productsApi.listProducts();
    },
  });
}

export function useProduct(id: Id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.getProduct(id),
  });
}

export function useMovements(productId: Id) {
  return useQuery({
    queryKey: productKeys.movements(productId),
    queryFn: () => productsApi.listMovements(productId),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => productsApi.listCategories(),
  });
}

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: productKeys.all });
    void queryClient.invalidateQueries({ queryKey: productKeys.categories });
  };
}

export function useSaveProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, input }: { id?: Id; input: ProductInput }) =>
      id ? productsApi.updateProduct(id, input) : productsApi.createProduct(input),
    onSuccess: invalidate,
  });
}

export function useSetProductStatus() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: ({ id, status }: { id: Id; status: ProductStatus }) =>
      productsApi.setProductStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: Id) => productsApi.deleteProduct(id),
    onSuccess: invalidate,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      variantId: Id;
      productId: Id;
      qtyDelta: number;
      type: StockMovementType;
      reason: string | null;
    }) => productsApi.adjustStock(args.variantId, args.qtyDelta, args.type, args.reason),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: productKeys.movements(args.productId) });
    },
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: ReceiveStockInput; productId: Id }) =>
      productsApi.receiveStock(args.input),
    onSuccess: (_data, args) => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: productKeys.movements(args.productId) });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (input: CategoryInput) => productsApi.saveCategory(input),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    mutationFn: (id: Id) => productsApi.deleteCategory(id),
    onSuccess: invalidate,
  });
}

export function useAddSampleCatalog() {
  const invalidate = useInvalidateCatalog();
  const vertical = useStoreProfile((s) => s.store?.vertical ?? 'other');
  return useMutation({
    mutationFn: () => productsApi.addSampleCatalog(vertical),
    onSuccess: (count) => {
      invalidate();
      toast.success(i18n.t('products.sampleAdded'), i18n.t('products.sampleAddedMsg', { count }));
    },
  });
}

let draftImportStarted = false;

/**
 * Turns the first product captured during onboarding into a real catalog
 * entry, exactly once, then clears the draft.
 */
export function useImportFirstProductDraft() {
  const draft = useStoreProfile((s) => s.firstProductDraft);
  const clearDraft = useStoreProfile((s) => s.clearFirstProductDraft);
  const save = useSaveProduct();
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!draft || draftImportStarted) return;
    draftImportStarted = true;
    saveRef.current.mutate(
      {
        input: {
          name: draft.name,
          description: '',
          brand: null,
          categoryId: null,
          supplierId: null,
          images: [],
          cost: 0,
          basePrice: draft.price,
          taxRate: null,
          status: 'active',
          variants: [
            {
              attributes: {},
              sku: draft.name.slice(0, 12).toUpperCase().replace(/\s+/g, '-'),
              barcode: null,
              stockQty: 0,
              priceOverride: null,
              lowStockThreshold: 4,
            },
          ],
        },
      },
      {
        onSuccess: () => {
          clearDraft();
          toast.success(i18n.t('products.firstAdded'), i18n.t('products.firstAddedMsg', { name: draft.name }));
        },
        onError: () => {
          draftImportStarted = false;
        },
      },
    );
  }, [draft, clearDraft]);
}
