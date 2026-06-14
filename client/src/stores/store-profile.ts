import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import type { Store } from '@/types/models';

export interface StoreSetupInput {
  name: string;
  vertical: string;
  currencyCode: string;
  logoUri: string | null;
}

/** Captured during onboarding; Phase 1 turns it into the first real Product. */
export interface FirstProductDraft {
  name: string;
  price: number;
}

interface StoreProfileState {
  store: Store | null;
  firstProductDraft: FirstProductDraft | null;
  hasHydrated: boolean;
  completeSetup: (input: StoreSetupInput, firstProduct: FirstProductDraft | null) => void;
  clearFirstProductDraft: () => void;
  updateStore: (patch: Partial<Omit<Store, 'id' | 'createdAt'>>) => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useStoreProfile = create<StoreProfileState>()(
  persist(
    (set) => ({
      store: null,
      firstProductDraft: null,
      hasHydrated: false,

      completeSetup: (input, firstProduct) =>
        set({
          store: {
            id: createLocalId(),
            name: input.name,
            vertical: input.vertical,
            logoUrl: input.logoUri,
            currencyCode: input.currencyCode,
            taxRate: 0,
            address: null,
            receipt: {
              headerText: input.name,
              footerText: 'Thank you for shopping with us!',
              showLogo: true,
            },
            createdAt: new Date().toISOString(),
          },
          firstProductDraft: firstProduct,
        }),

      clearFirstProductDraft: () => set({ firstProductDraft: null }),

      updateStore: (patch) =>
        set((state) => (state.store ? { store: { ...state.store, ...patch } } : state)),

      reset: () => set({ store: null, firstProductDraft: null }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.store-profile',
      storage: persistStorage,
      partialize: (state) => ({
        store: state.store,
        firstProductDraft: state.firstProductDraft,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
