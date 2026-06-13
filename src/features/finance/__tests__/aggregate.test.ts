import type { Order, Transaction } from '@/types/models';

import { deltaRatio, periodRange, summarize } from '../aggregate';

const NOW = new Date('2026-06-12T18:00:00.000Z');

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  type: 'income',
  category: 'sales',
  amount: 100,
  note: '',
  date: '2026-06-12T10:00:00.000Z',
  linkedOrderId: null,
  ...overrides,
});

const order = (overrides: Partial<Order>): Order => ({
  id: Math.random().toString(36),
  number: '#1001',
  channel: 'pos',
  customerId: null,
  items: [
    { id: 'i1', variantId: 'v1', productName: 'Hoodie', variantLabel: '2–4y', qty: 2, unitPrice: 24, lineTotal: 48 },
  ],
  subtotal: 48,
  discount: 0,
  tax: 0,
  total: 48,
  paymentStatus: 'paid',
  fulfillmentStatus: 'completed',
  createdAt: '2026-06-12T10:00:00.000Z',
  ...overrides,
});

describe('periodRange', () => {
  it('builds adjacent windows of equal length', () => {
    const r = periodRange('week', NOW);
    expect(r.prevEnd.getTime()).toBe(r.start.getTime());
    expect(r.start.getTime() - r.prevStart.getTime()).toBe(7 * 24 * 3600 * 1000);
  });
});

describe('deltaRatio', () => {
  it('returns null without a baseline', () => {
    expect(deltaRatio(50, 0)).toBeNull();
    expect(deltaRatio(120, 100)).toBeCloseTo(0.2);
  });
});

describe('summarize', () => {
  it('splits income and expenses into profit', () => {
    const s = summarize(
      [
        tx({ amount: 200 }),
        tx({ amount: 50, type: 'expense', category: 'rent' }),
        tx({ amount: 30, type: 'expense', category: 'refunds' }),
      ],
      [],
      'today',
      NOW,
    );
    expect(s.revenue).toBe(200);
    expect(s.expenses).toBe(80);
    expect(s.profit).toBe(120);
    expect(s.expenseByCategory).toEqual([
      { category: 'rent', amount: 50 },
      { category: 'refunds', amount: 30 },
    ]);
  });

  it('computes revenue delta against the previous window', () => {
    const s = summarize(
      [tx({ amount: 150 }), tx({ amount: 100, date: '2026-06-11T10:00:00.000Z' })],
      [],
      'today',
      NOW,
    );
    expect(s.revenueDelta).toBeCloseTo(0.5);
  });

  it('excludes out-of-window data and finds the best seller', () => {
    const s = summarize(
      [tx({ amount: 999, date: '2026-01-01T00:00:00.000Z' })],
      [
        order({}),
        order({
          items: [
            { id: 'i2', variantId: 'v2', productName: 'Beanie', variantLabel: 'Default', qty: 5, unitPrice: 9, lineTotal: 45 },
          ],
        }),
        order({ createdAt: '2026-01-01T00:00:00.000Z' }),
      ],
      'week',
      NOW,
    );
    expect(s.revenue).toBe(0);
    expect(s.ordersCount).toBe(2);
    expect(s.bestSeller).toEqual({ name: 'Beanie', units: 5 });
  });

  it('buckets a month into weekly cash-flow groups', () => {
    const s = summarize([tx({ amount: 70 })], [], 'month', NOW);
    expect(s.cashflow.length).toBeLessThanOrEqual(5);
    expect(s.cashflow.reduce((a, b) => a + b.moneyIn, 0)).toBe(70);
  });
});
