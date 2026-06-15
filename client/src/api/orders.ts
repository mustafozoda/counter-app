import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartLine, CartTotals, PaymentEntry } from '@/features/pos/totals';
import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  FulfillmentStatus,
  Id,
  Order,
  OrderItem,
  Payment,
  PaymentStatus,
  Refund,
  RefundItem,
  Transaction,
  TransactionType,
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
      // Financed sales pay only the down payment up front.
      paymentStatus:
        input.payments.reduce((sum, p) => sum + p.amount, 0) >= input.totals.total - 0.01
          ? 'paid'
          : 'partial',
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

    // Cash-basis income = money actually received now. Financed remainders
    // post as income when each installment is collected.
    const received = Math.round(input.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    if (received > 0) {
      doc.transactions.push({
        id: createLocalId(),
        type: 'income',
        category: 'sales',
        amount: received,
        note: `POS sale ${number}`,
        date: createdAt,
        linkedOrderId: order.id,
      });
    }

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

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

interface OrderItemRow {
  id: string;
  variant_id: string | null;
  product_name: string;
  variant_label: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

interface PaymentRow {
  id: string;
  order_id: string;
  method: Payment['method'];
  amount: number;
  status: Payment['status'];
  ref: string | null;
  created_at: string;
}

interface RefundRow {
  id: string;
  order_id: string;
  items: RefundItem[] | null;
  amount: number;
  restocked: boolean;
  reason: string | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  number: string;
  channel: Order['channel'];
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  created_at: string;
  order_items?: OrderItemRow[];
  payments?: PaymentRow[];
  refunds?: RefundRow[];
}

interface TransactionRow {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  note: string;
  date: string;
  linked_order_id: string | null;
  receipt_uri: string | null;
}

const toOrderItem = (row: OrderItemRow): OrderItem => ({
  id: row.id,
  variantId: row.variant_id ?? '',
  productName: row.product_name,
  variantLabel: row.variant_label,
  qty: row.qty,
  unitPrice: Number(row.unit_price),
  lineTotal: Number(row.line_total),
});

const toPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  orderId: row.order_id,
  method: row.method,
  amount: Number(row.amount),
  status: row.status,
  ref: row.ref,
  createdAt: row.created_at,
});

const toRefund = (row: RefundRow): Refund => ({
  id: row.id,
  orderId: row.order_id,
  items: row.items ?? [],
  amount: Number(row.amount),
  restocked: row.restocked,
  reason: row.reason,
  createdAt: row.created_at,
});

const toOrder = (row: OrderRow): OrderWithPayments => ({
  id: row.id,
  number: row.number,
  channel: row.channel,
  customerId: row.customer_id,
  items: (row.order_items ?? []).map(toOrderItem),
  subtotal: Number(row.subtotal),
  discount: Number(row.discount),
  tax: Number(row.tax),
  total: Number(row.total),
  paymentStatus: row.payment_status,
  fulfillmentStatus: row.fulfillment_status,
  createdAt: row.created_at,
  payments: (row.payments ?? []).map(toPayment),
  refunds: (row.refunds ?? []).map(toRefund),
});

const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  note: row.note,
  date: row.date,
  linkedOrderId: row.linked_order_id,
  receiptUri: row.receipt_uri,
});

const ORDER_SELECT = '*, order_items(*), payments(*), refunds(*)';

/**
 * Supabase-backed orders. Sales and refunds run as atomic RPCs (server-side)
 * so order + items + payments + ledger + stock + loyalty all commit together.
 */
export class SupabaseOrdersApi implements OrdersApi {
  async createSale(input: SaleInput): Promise<OrderWithPayments> {
    const { data, error } = await supabase.rpc('create_sale', {
      p_store_id: getActiveStoreId(),
      p_customer_id: input.customerId,
      p_lines: input.lines.map((l) => ({
        variantId: l.variantId,
        productName: l.productName,
        variantLabel: l.variantLabel,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
      p_payments: input.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        ref: p.ref,
      })),
      p_totals: {
        subtotal: input.totals.subtotal,
        discount: input.totals.discount,
        tax: input.totals.tax,
        total: input.totals.total,
      },
    });
    if (error) throw error;
    const order = await this.getOrder(data as Id);
    if (!order) throw new Error('Order not found after sale');
    return order;
  }

  async refundOrder(input: RefundInput): Promise<OrderWithPayments> {
    const { error } = await supabase.rpc('refund_order', {
      p_order_id: input.orderId,
      p_items: input.items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty })),
      p_restock: input.restock,
      p_reason: input.reason,
    });
    if (error) throw error;
    const order = await this.getOrder(input.orderId);
    if (!order) throw new Error('Order not found after refund');
    return order;
  }

  async setFulfillment(orderId: Id, status: FulfillmentStatus): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ fulfillment_status: status })
      .eq('id', orderId);
    if (error) throw error;
  }

  async addTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        store_id: getActiveStoreId(),
        type: input.type,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        linked_order_id: input.linkedOrderId,
        receipt_uri: input.receiptUri ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toTransaction(data as TransactionRow);
  }

  async listOrders(): Promise<OrderWithPayments[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as OrderRow[]).map(toOrder);
  }

  async getOrder(id: Id): Promise<OrderWithPayments | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toOrder(data as OrderRow) : null;
  }

  async listTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as TransactionRow[]).map(toTransaction);
  }
}

export const ordersApi: OrdersApi = isSupabaseConfigured
  ? new SupabaseOrdersApi()
  : new LocalOrdersApi();
