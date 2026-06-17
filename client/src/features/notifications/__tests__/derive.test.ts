import type { OrderWithPayments } from '@/api/orders';
import type { ProductWithVariants } from '@/features/products/stock';
import { ROLE_PERMISSIONS, roleHasPermission } from '@/stores/staff';
import type { FinancingPlan, Installment, ProductVariant } from '@/types/models';

import { deriveNotifications } from '../derive';

const NOW = new Date('2026-06-12T12:00:00.000Z');

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v1',
  productId: 'p1',
  attributes: {},
  sku: 'S1',
  barcode: null,
  stockQty: 10,
  priceOverride: null,
  lowStockThreshold: 4,
  ...overrides,
});

const product = (variants: ProductVariant[], overrides: Partial<ProductWithVariants> = {}): ProductWithVariants => ({
  id: 'p1',
  name: 'Hoodie',
  description: '',
  supplierId: null,
  brand: null,
  categoryId: null,
  images: [],
  cost: 5,
  basePrice: 20,
  taxRate: null,
  status: 'active',
  createdAt: NOW.toISOString(),
  variants,
  ...overrides,
});

const installment = (overrides: Partial<Installment>): Installment => ({
  id: Math.random().toString(36),
  planId: 'plan1',
  number: 1,
  dueDate: '2026-07-12T00:00:00.000Z',
  amount: 25,
  paidAt: null,
  status: 'upcoming',
  ...overrides,
});

const plan = (installments: Installment[]): FinancingPlan => ({
  id: 'plan1',
  orderId: 'o1',
  customerId: 'c1',
  principal: 100,
  downPayment: 0,
  installments,
  frequency: 'monthly',
  status: 'active',
  createdAt: NOW.toISOString(),
});

const order = (): OrderWithPayments => ({
  id: 'o1',
  number: '#1001',
  channel: 'pos',
  customerId: null,
  items: [{ id: 'i1', variantId: 'v1', productName: 'Hoodie', variantLabel: 'Default', qty: 1, unitPrice: 20, lineTotal: 20, cost: 0 }],
  subtotal: 20,
  discount: 0,
  tax: 0,
  total: 20,
  paymentStatus: 'paid',
  fulfillmentStatus: 'completed',
  createdAt: NOW.toISOString(),
  payments: [],
  refunds: [],
});

describe('deriveNotifications', () => {
  it('returns nothing when everything is healthy', () => {
    const items = deriveNotifications({ products: [product([variant()])], plans: [], orders: [], now: NOW });
    expect(items).toEqual([]);
  });

  it('flags low stock, overdue and due-soon installments, and recent orders', () => {
    const items = deriveNotifications({
      products: [product([variant({ stockQty: 0 })])],
      plans: [
        plan([
          installment({ dueDate: '2026-06-01T00:00:00.000Z' }), // overdue
          installment({ id: 'x', dueDate: '2026-06-14T00:00:00.000Z' }), // due soon
        ]),
      ],
      orders: [order()],
      now: NOW,
    });
    const types = items.map((i) => i.type);
    expect(types).toContain('low-stock');
    expect(types).toContain('installment-overdue');
    expect(types).toContain('installment-due');
    expect(types).toContain('new-order');
  });

  it('ignores cancelled plans', () => {
    const cancelled = { ...plan([installment({ dueDate: '2026-06-01T00:00:00.000Z' })]), status: 'cancelled' as const };
    const items = deriveNotifications({ products: [], plans: [cancelled], orders: [], now: NOW });
    expect(items.filter((i) => i.type.startsWith('installment'))).toHaveLength(0);
  });
});

describe('role permissions', () => {
  it('grants the owner everything and the cashier only sales', () => {
    expect(roleHasPermission('owner', 'manage_settings')).toBe(true);
    expect(roleHasPermission('cashier', 'sell')).toBe(true);
    expect(roleHasPermission('cashier', 'view_finance')).toBe(false);
    expect(ROLE_PERMISSIONS.manager).toContain('manage_inventory');
    expect(ROLE_PERMISSIONS.manager).not.toContain('manage_staff');
  });
});
