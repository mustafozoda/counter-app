import type { StorefrontCartLine } from '@/stores/storefront-cart';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface StorefrontTotals {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

/** Customer cart totals at a single store tax rate. */
export function storefrontTotals(lines: StorefrontCartLine[], taxRate: number): StorefrontTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));
  const tax = round2(subtotal * taxRate);
  return {
    subtotal,
    tax,
    total: round2(subtotal + tax),
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}
