import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartLine, CartTotals, PaymentEntry } from '@/features/pos/totals';
import { createLocalId } from '@/lib/id';
import type {
  FulfillmentStatus,
  Id,
  Order,
  Payment,
  Refund,
  RefundItem,
  Transaction,
} from '@/types/models';

import { customersApi } from './customers';
import { productsApi } from './products';

export interface SaleInput {
  lines: CartLine[];
  totals: CartTotals;
  payments: PaymentEntry[];
  customerId: Id | null;
}

export interface OrderWithPayments extends Order {
  payments: Payment[];
  refunds: Refund[];
}

export interface RefundInput {
  orderId: Id;
  items: RefundItem[];
  restock: boolean;
  reason: string | null;
}

/** Proportional refund: the items' share of the order total (discount + tax included). */
export function refundAmountFor(order: Order, items: RefundItem[]): number {
  if (order.subtotal <= 0) return 0;
  const itemsValue = items.reduce((sum, ri) => {
    const item = order.items.find((i) => i.id === ri.orderItemId);
    if (!item) return sum;
    return sum + item.unitPrice * Math.min(ri.qty, item.qty);
  }, 0);
  const fraction = Math.min(1, itemsValue / order.subtotal);
  return Math.round(order.total * fraction * 100) / 100;
}

/**
 * Orders, payments and the financial transaction log. Same seam pattern as
 * ProductsApi: local-first today, SQLite + Supabase sync later.
 */
export interface OrdersApi {
  createSale(input: SaleInput): Promise<OrderWithPayments>;
  listOrders(): Promise<OrderWithPayments[]>;
  getOrder(id: Id): Promise<OrderWithPayments | null>;
  refundOrder(input: RefundInput): Promise<OrderWithPayments>;
  setFulfillment(orderId: Id, status: FulfillmentStatus): Promise<void>;
  listTransactions(): Promise<Transaction[]>;
  addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction>;
}

interface OrdersDoc {
  v: 1;
  orders: Order[];
  payments: Payment[];
  transactions: Transaction[];
  refunds: Refund[];
  lastOrderNumber: number;
}

const STORAGE_KEY = 'counter.orders.v1';
const FIRST_ORDER_NUMBER = 1001;

const emptyDoc = (): OrdersDoc => ({
  v: 1,
  orders: [],
  payments: [],
  transactions: [],
  refunds: [],
  lastOrderNumber: FIRST_ORDER_NUMBER - 1,
});

export class LocalOrdersApi implements OrdersApi {
  private doc: OrdersDoc | null = null;
  private loading: Promise<OrdersDoc> | null = null;

  private async load(): Promise<OrdersDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as OrdersDoc) : emptyDoc();
      parsed.refunds ??= []; // migrate docs written before refunds existed
      this.doc = parsed;
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  private withPayments(doc: OrdersDoc, order: Order): OrderWithPayments {
    return {
      ...order,
      payments: doc.payments.filter((p) => p.orderId === order.id),
      refunds: doc.refunds.filter((r) => r.orderId === order.id),
    };
  }

  async createSale(input: SaleInput): Promise<OrderWithPayments> {
    const doc = await this.load();
    doc.lastOrderNumber += 1;
    const number = `#${doc.lastOrderNumber}`;
    const createdAt = new Date().toISOString();

    const order: Order = {
      id: createLocalId(),
      number,
      channel: 'pos',
      customerId: input.customerId,
      items: input.lines.map((line) => ({
        id: createLocalId(),
        variantId: line.variantId,
        productName: line.productName,
        variantLabel: line.variantLabel,
        qty: line.qty,
        unitPrice: line.unitPrice,
        lineTotal: Math.round(line.unitPrice * line.qty * 100) / 100,
      })),
      subtotal: input.totals.subtotal,
      discount: input.totals.discount,
      tax: input.totals.tax,
      total: input.totals.total,
      paymentStatus: 'paid',
      fulfillmentStatus: 'completed',
      createdAt,
    };
    doc.orders.push(order);

    for (const entry of input.payments) {
      doc.payments.push({
        id: createLocalId(),
        orderId: order.id,
        method: entry.method,
        amount: entry.amount,
        status: 'completed',
        ref: entry.ref,
        createdAt,
      });
    }

    doc.transactions.push({
      id: createLocalId(),
      type: 'income',
      category: 'sales',
      amount: input.totals.total,
      note: `POS sale ${number}`,
      date: createdAt,
      linkedOrderId: order.id,
    });

    await this.save();

    // Deduct stock through the movement ledger so history stays truthful.
    for (const line of input.lines) {
      await productsApi.adjustStock(line.variantId, -line.qty, 'sale', `Order ${number}`);
    }

    // Loyalty: one point per whole unit of currency spent.
    if (input.customerId) {
      await customersApi.addLoyaltyPoints(input.customerId, Math.floor(input.totals.total));
    }

    return this.withPayments(doc, order);
  }

  async refundOrder(input: RefundInput): Promise<OrderWithPayments> {
    const doc = await this.load();
    const order = doc.orders.find((o) => o.id === input.orderId);
    if (!order) throw new Error('Order not found');

    const amount = refundAmountFor(order, input.items);
    const createdAt = new Date().toISOString();

    doc.refunds.push({
      id: createLocalId(),
      orderId: order.id,
      items: input.items,
      amount,
      restocked: input.restock,
      reason: input.reason,
      createdAt,
    });

    const refundedTotal = doc.refunds
      .filter((r) => r.orderId === order.id)
      .reduce((sum, r) => sum + r.amount, 0);
    order.paymentStatus = refundedTotal >= order.total - 0.01 ? 'refunded' : 'partial';
    if (order.paymentStatus === 'refunded') order.fulfillmentStatus = 'cancelled';

    doc.transactions.push({
      id: createLocalId(),
      type: 'expense',
      category: 'refunds',
      amount,
      note: `Refund ${order.number}${input.reason ? ` — ${input.reason}` : ''}`,
      date: createdAt,
      linkedOrderId: order.id,
    });

    await this.save();

    if (input.restock) {
      for (const ri of input.items) {
        const item = order.items.find((i) => i.id === ri.orderItemId);
        if (item) {
          await productsApi.adjustStock(
            item.variantId,
            Math.min(ri.qty, item.qty),
            'return',
            `Refund ${order.number}`,
          );
        }
      }
    }

    return this.withPayments(doc, order);
  }

  async setFulfillment(orderId: Id, status: FulfillmentStatus): Promise<void> {
    const doc = await this.load();
    const order = doc.orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.fulfillmentStatus = status;
    await this.save();
  }

  async addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
    const doc = await this.load();
    const transaction: Transaction = { ...input, id: createLocalId() };
    doc.transactions.push(transaction);
    await this.save();
    return transaction;
  }

  async listOrders(): Promise<OrderWithPayments[]> {
    const doc = await this.load();
    return [...doc.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => this.withPayments(doc, o));
  }

  async getOrder(id: Id): Promise<OrderWithPayments | null> {
    const doc = await this.load();
    const order = doc.orders.find((o) => o.id === id);
    return order ? this.withPayments(doc, order) : null;
  }

  async listTransactions(): Promise<Transaction[]> {
    const doc = await this.load();
    return [...doc.transactions].sort((a, b) => b.date.localeCompare(a.date));
  }
}

export const ordersApi: OrdersApi = new LocalOrdersApi();
