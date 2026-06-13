import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

export interface StorefrontCartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  unitPrice: number;
  qty: number;
  available: number;
  imageUri: string | null;
}

interface StorefrontCartState {
  lines: StorefrontCartLine[];
  add: (line: Omit<StorefrontCartLine, 'qty'>, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

/**
 * The customer-facing storefront cart — separate from the merchant POS cart
 * so previewing the shop never disturbs an in-progress sale at the counter.
 */
export const useStorefrontCart = create<StorefrontCartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line, qty = 1) => {
        const existing = get().lines.find((l) => l.variantId === line.variantId);
        const current = existing?.qty ?? 0;
        const ceiling = existing?.available ?? line.available;
        if (current + qty > ceiling) return false;
        set((state) => ({
          lines: existing
            ? state.lines.map((l) =>
                l.variantId === line.variantId ? { ...l, qty: l.qty + qty } : l,
              )
            : [...state.lines, { ...line, qty }],
        }));
        return true;
      },
      setQty: (variantId, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.variantId !== variantId)
              : state.lines.map((l) =>
                  l.variantId === variantId ? { ...l, qty: Math.min(qty, l.available) } : l,
                ),
        })),
      remove: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'counter.storefront-cart', storage: persistStorage },
  ),
);
