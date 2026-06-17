import {
  cashSuggestions,
  changeDue,
  computeTotals,
  discountAmount,
  remainingDue,
  type CartLine,
} from '../totals';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  variantId: 'v1',
  productId: 'p1',
  productName: 'Dino Hoodie',
  variantLabel: '2–4y',
  sku: 'DIN-1',
  unitPrice: 24,
  cost: 0,
  taxRate: 0,
  qty: 1,
  available: 10,
  imageUri: null,
  ...overrides,
});

describe('computeTotals', () => {
  it('sums lines and counts items', () => {
    const totals = computeTotals([line({ qty: 2 }), line({ variantId: 'v2', unitPrice: 9.5 })], null);
    expect(totals.subtotal).toBe(57.5);
    expect(totals.itemCount).toBe(3);
    expect(totals.total).toBe(57.5);
  });

  it('applies percent and fixed discounts with clamping', () => {
    expect(discountAmount(100, { kind: 'percent', value: 10 })).toBe(10);
    expect(discountAmount(100, { kind: 'fixed', value: 30 })).toBe(30);
    expect(discountAmount(20, { kind: 'fixed', value: 50 })).toBe(20);
    expect(discountAmount(100, null)).toBe(0);
  });

  it('taxes the discounted base proportionally across mixed rates', () => {
    const lines = [
      line({ qty: 1, unitPrice: 100, taxRate: 0.1 }),
      line({ variantId: 'v2', qty: 1, unitPrice: 100, taxRate: 0 }),
    ];
    const totals = computeTotals(lines, { kind: 'percent', value: 50 });
    expect(totals.discount).toBe(100);
    // Taxed line contributes 100 × 0.5 × 0.1 = 5.
    expect(totals.tax).toBe(5);
    expect(totals.total).toBe(105);
  });

  it('handles an empty cart', () => {
    const totals = computeTotals([], { kind: 'percent', value: 10 });
    expect(totals).toEqual({ subtotal: 0, discount: 0, tax: 0, total: 0, itemCount: 0 });
  });
});

describe('payments', () => {
  it('tracks remaining across split payments', () => {
    expect(remainingDue(100, [])).toBe(100);
    expect(remainingDue(100, [{ method: 'cash', amount: 40, ref: null }])).toBe(60);
    expect(
      remainingDue(100, [
        { method: 'cash', amount: 40, ref: null },
        { method: 'card', amount: 60, ref: null },
      ]),
    ).toBe(0);
  });

  it('computes change on overpayment only', () => {
    expect(changeDue(50, 42.5)).toBe(7.5);
    expect(changeDue(40, 42.5)).toBe(0);
  });

  it('suggests exact then rounded-up notes', () => {
    expect(cashSuggestions(42.5)).toEqual([42.5, 45, 50, 60]);
    expect(cashSuggestions(0)).toEqual([]);
    // Exact round amounts do not suggest themselves twice.
    expect(cashSuggestions(20)[0]).toBe(20);
    expect(new Set(cashSuggestions(20)).size).toBe(cashSuggestions(20).length);
  });
});
