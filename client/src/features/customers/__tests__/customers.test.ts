import { refundAmountFor } from '@/api/orders';
import type { Customer, Order } from '@/types/models';

import { searchCustomers } from '../search';

const order: Order = {
  id: 'o1',
  number: '#1001',
  channel: 'pos',
  customerId: null,
  items: [
    { id: 'i1', variantId: 'v1', productName: 'Hoodie', variantLabel: '2–4y', qty: 2, unitPrice: 24, lineTotal: 48 },
    { id: 'i2', variantId: 'v2', productName: 'Beanie', variantLabel: 'Default', qty: 1, unitPrice: 9.5, lineTotal: 9.5 },
  ],
  subtotal: 57.5,
  discount: 5.75, // 10% off
  tax: 0,
  total: 51.75,
  paymentStatus: 'paid',
  fulfillmentStatus: 'completed',
  createdAt: '2026-06-12T10:00:00.000Z',
};

describe('refundAmountFor', () => {
  it('refunds the proportional share of the discounted total', () => {
    // One hoodie = 24 of 57.5 subtotal → 24/57.5 of 51.75 total = 21.6.
    expect(refundAmountFor(order, [{ orderItemId: 'i1', qty: 1 }])).toBe(21.6);
  });

  it('caps at the full total when everything is refunded', () => {
    const amount = refundAmountFor(order, [
      { orderItemId: 'i1', qty: 2 },
      { orderItemId: 'i2', qty: 1 },
    ]);
    expect(amount).toBe(51.75);
  });

  it('ignores unknown items and over-quantities', () => {
    expect(refundAmountFor(order, [{ orderItemId: 'nope', qty: 5 }])).toBe(0);
    expect(refundAmountFor(order, [{ orderItemId: 'i2', qty: 99 }])).toBe(
      refundAmountFor(order, [{ orderItemId: 'i2', qty: 1 }]),
    );
  });
});

const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Zarina Karimova',
    phone: '+992901234567',
    email: 'zarina@example.com',
    addresses: [],
    notes: '',
    loyaltyPoints: 0,
    tags: ['VIP'],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'c2',
    name: 'Bobur Aliyev',
    phone: null,
    email: null,
    addresses: [],
    notes: '',
    loyaltyPoints: 0,
    tags: [],
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

describe('searchCustomers', () => {
  it('matches name, phone, email and tags case-insensitively', () => {
    expect(searchCustomers(customers, 'zarina').map((c) => c.id)).toEqual(['c1']);
    expect(searchCustomers(customers, '90123').map((c) => c.id)).toEqual(['c1']);
    expect(searchCustomers(customers, 'vip').map((c) => c.id)).toEqual(['c1']);
    expect(searchCustomers(customers, 'bobur').map((c) => c.id)).toEqual(['c2']);
    expect(searchCustomers(customers, '')).toHaveLength(2);
  });
});
