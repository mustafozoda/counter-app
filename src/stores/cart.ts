import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CartDiscount, CartLine } from '@/features/pos/totals';
import { persistStorage } from '@/lib/storage';

interface CartState {
  lines: CartLine[];
  discount: CartDiscount;
  customerId: string | null;
  customerName: string | null;
  /** Add (or bump) a line; qty is clamped to available stock. Returns false when out of stock. */
  addLine: (line: Omit<CartLine, 'qty'>, qty?: number) => boolean;
  setQty: (variantId: string, qty: number) => void;
  removeLine: (variantId: string) => void;
  setDiscount: (discount: CartDiscount) => void;
  setCustomer: (customer: { id: string; name: string } | null) => void;
  clear: () => void;
}

/**
 * The active POS sale. Persisted: a ring-up in progress survives app
 * restarts and connectivity loss — a real counter can't lose its cart.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      discount: null,
      customerId: null,
      customerName: null,

      addLine: (line, qty = 1) => {
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

      removeLine: (variantId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.variantId !== variantId) })),

      setDiscount: (discount) => set({ discount }),

      setCustomer: (customer) =>
        set({ customerId: customer?.id ?? null, customerName: customer?.name ?? null }),

      clear: () => set({ lines: [], discount: null, customerId: null, customerName: null }),
    }),
    {
      name: 'counter.cart',
      storage: persistStorage,
    },
  ),
);
