import type { StorefrontCartLine } from '@/stores/storefront-cart';

import { storefrontTotals } from '../totals';

const line = (overrides: Partial<StorefrontCartLine> = {}): StorefrontCartLine => ({
  variantId: 'v1',
  productId: 'p1',
  productName: 'Hoodie',
  variantLabel: '2–4y',
  unitPrice: 24,
  qty: 1,
  available: 10,
  imageUri: null,
  ...overrides,
});

describe('storefrontTotals', () => {
  it('sums lines and counts items', () => {
    const totals = storefrontTotals([line({ qty: 2 }), line({ variantId: 'v2', unitPrice: 10 })], 0);
    expect(totals.subtotal).toBe(58);
    expect(totals.itemCount).toBe(3);
    expect(totals.total).toBe(58);
  });

  it('applies the store tax rate', () => {
    const totals = storefrontTotals([line({ unitPrice: 100, qty: 1 })], 0.12);
    expect(totals.tax).toBe(12);
    expect(totals.total).toBe(112);
  });

  it('handles an empty cart', () => {
    expect(storefrontTotals([], 0.1)).toEqual({ subtotal: 0, tax: 0, total: 0, itemCount: 0 });
  });
});
