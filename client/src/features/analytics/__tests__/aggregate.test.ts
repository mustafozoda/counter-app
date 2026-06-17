import type { Order } from '@/types/models';

import { analyze, hourLabel } from '../aggregate';

const NOW = new Date('2026-06-12T18:00:00.000Z');

const order = (overrides: Partial<Order>, hour = 10): Order => ({
  id: Math.random().toString(36),
  number: '#1001',
  channel: 'pos',
  customerId: null,
  items: [
    { id: 'i1', variantId: 'v1', productName: 'Hoodie', variantLabel: '2–4y', qty: 1, unitPrice: 24, lineTotal: 24, cost: 10 },
  ],
  subtotal: 24,
  discount: 0,
  tax: 0,
  total: 24,
  paymentStatus: 'paid',
  fulfillmentStatus: 'completed',
  createdAt: new Date(2026, 5, 12, hour).toISOString(),
  ...overrides,
});

describe('analyze', () => {
  it('totals revenue and average, excluding refunded orders', () => {
    const report = analyze(
      [
        order({ total: 100 }),
        order({ total: 50 }),
        order({ total: 999, paymentStatus: 'refunded' }),
      ],
      30,
      NOW,
    );
    expect(report.totalRevenue).toBe(150);
    expect(report.totalOrders).toBe(2);
    expect(report.averageOrderValue).toBe(75);
  });

  it('ranks best sellers and slow movers by units', () => {
    const report = analyze(
      [
        order({
          items: [
            { id: 'a', variantId: 'v1', productName: 'Hoodie', variantLabel: 'Default', qty: 10, unitPrice: 24, lineTotal: 240, cost: 12 },
            { id: 'b', variantId: 'v2', productName: 'Beanie', variantLabel: 'Default', qty: 1, unitPrice: 9, lineTotal: 9, cost: 4 },
          ],
        }),
      ],
      30,
      NOW,
    );
    expect(report.bestSellers[0]?.name).toBe('Hoodie');
    expect(report.bestSellers[0]?.units).toBe(10);
    expect(report.slowMovers[0]?.name).toBe('Beanie');
  });

  it('finds the peak hour of day', () => {
    const report = analyze([order({}, 14), order({}, 14), order({}, 9)], 30, NOW);
    expect(report.peakHour).toBe(14);
  });

  it('excludes orders outside the window', () => {
    const old = order({ total: 500, createdAt: '2026-01-01T10:00:00.000Z' });
    const report = analyze([old], 30, NOW);
    expect(report.totalOrders).toBe(0);
    expect(report.peakHour).toBeNull();
  });

  it('builds a revenue-by-day series of the right length', () => {
    const report = analyze([order({ total: 30 })], 7, NOW);
    expect(report.revenueByDay).toHaveLength(7);
    expect(report.revenueByDay.reduce((a, b) => a + b.revenue, 0)).toBe(30);
  });

  it('computes profit and margin from per-line cost snapshots', () => {
    const report = analyze(
      [
        order({
          total: 80,
          subtotal: 80,
          items: [
            {
              id: 'p1',
              variantId: 'v1',
              productName: 'Shirt',
              variantLabel: 'Default',
              qty: 1,
              unitPrice: 80,
              lineTotal: 80,
              cost: 50,
            },
          ],
        }),
      ],
      30,
      NOW,
    );
    expect(report.totalRevenue).toBe(80);
    expect(report.totalCost).toBe(50);
    expect(report.grossProfit).toBe(30);
    expect(report.margin).toBe(0.375); // 37.5%
    expect(report.mostProfitable[0]?.name).toBe('Shirt');
    expect(report.mostProfitable[0]?.profit).toBe(30);
  });
});

describe('hourLabel', () => {
  it('formats 12-hour clock', () => {
    expect(hourLabel(0)).toBe('12 AM');
    expect(hourLabel(9)).toBe('9 AM');
    expect(hourLabel(12)).toBe('12 PM');
    expect(hourLabel(18)).toBe('6 PM');
  });
});
