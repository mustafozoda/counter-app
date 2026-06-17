/**
 * Counter — core domain model (§6.3 of the product spec).
 *
 * These types are the single source of truth for entity shapes. Mock/seed
 * data, Zod form schemas, the local SQLite schema and the Supabase tables
 * all derive from (and must stay assignable to) these definitions.
 */

export type Id = string;

// ---------------------------------------------------------------------------
// Store & people
// ---------------------------------------------------------------------------

export interface ReceiptSettings {
  headerText: string;
  footerText: string;
  showLogo: boolean;
}

export interface Store {
  id: Id;
  name: string;
  /** Retail vertical, e.g. "kids-clothing". Drives default categories/attributes. */
  vertical: string;
  logoUrl: string | null;
  currencyCode: string;
  /** Tax as a fraction, e.g. 0.12 for 12%. */
  taxRate: number;
  address: string | null;
  receipt: ReceiptSettings;
  createdAt: string;
}

export type StaffRole = 'owner' | 'manager' | 'cashier';

export interface User {
  id: Id;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: StaffRole;
  /** Per-member permission overrides (key → granted). Absent key = role default. */
  permissions?: Record<string, boolean>;
}

/**
 * A staff member as managed by the owner. `id` is the `store_members` row id;
 * `userId` is the auth account the owner provisioned for them.
 */
export interface StaffMember {
  id: Id;
  userId: Id | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: StaffRole;
  phone: string | null;
  /** Job title / position. */
  title: string | null;
  /** Owner's private note about this member. */
  note: string | null;
  /** Suspended members keep their login but lose all store access. */
  active: boolean;
  /** Per-permission overrides set by the owner. Absent key = role default. */
  permissions: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface Category {
  id: Id;
  name: string;
  parentId: Id | null;
  sortOrder: number;
}

export type ProductStatus = 'active' | 'draft' | 'archived';

export interface Product {
  id: Id;
  name: string;
  description: string;
  brand: string | null;
  categoryId: Id | null;
  /** Who we buy this from (nullable). */
  supplierId: Id | null;
  images: string[];
  /** Unit cost to the store, in store currency. */
  cost: number;
  basePrice: number;
  /** Overrides the store tax rate when set. */
  taxRate: number | null;
  status: ProductStatus;
  createdAt: string;
}

export interface ProductVariant {
  id: Id;
  productId: Id;
  /** e.g. { size: "2-4y", color: "Sage" } — attribute keys are store-configurable. */
  attributes: Record<string, string>;
  sku: string;
  barcode: string | null;
  stockQty: number;
  priceOverride: number | null;
  lowStockThreshold: number;
}

export type StockMovementType = 'restock' | 'sale' | 'adjustment' | 'return';

export interface StockMovement {
  id: Id;
  variantId: Id;
  type: StockMovementType;
  /** Signed quantity: negative for sales, positive for restocks/returns. */
  qty: number;
  reason: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Customers & orders
// ---------------------------------------------------------------------------

export interface Customer {
  id: Id;
  name: string;
  phone: string | null;
  email: string | null;
  addresses: string[];
  notes: string;
  loyaltyPoints: number;
  tags: string[];
  createdAt: string;
}

export type OrderChannel = 'pos' | 'online';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
export type FulfillmentStatus = 'pending' | 'fulfilled' | 'shipped' | 'completed' | 'cancelled';

export interface OrderItem {
  id: Id;
  variantId: Id;
  /** Snapshot at time of sale — survives later product edits. */
  productName: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  /** Unit cost snapshot at sale time — drives COGS / profit, immune to later edits. */
  cost: number;
}

export interface Order {
  id: Id;
  number: string;
  channel: OrderChannel;
  customerId: Id | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'installment';

export interface RefundItem {
  orderItemId: Id;
  qty: number;
}

export interface Refund {
  id: Id;
  orderId: Id;
  items: RefundItem[];
  /** Money returned to the customer (proportional share of the order total). */
  amount: number;
  restocked: boolean;
  reason: string | null;
  createdAt: string;
}

export interface Payment {
  id: Id;
  orderId: Id;
  method: PaymentMethod;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  ref: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Financing (flagship)
// ---------------------------------------------------------------------------

export type InstallmentStatus = 'upcoming' | 'due' | 'paid' | 'overdue';

export interface Installment {
  id: Id;
  planId: Id;
  number: number;
  dueDate: string;
  amount: number;
  paidAt: string | null;
  status: InstallmentStatus;
}

export type FinancingPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

export interface FinancingPlan {
  id: Id;
  orderId: Id;
  customerId: Id;
  principal: number;
  downPayment: number;
  installments: Installment[];
  frequency: 'weekly' | 'biweekly' | 'monthly';
  status: FinancingPlanStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Finance / bookkeeping
// ---------------------------------------------------------------------------

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: Id;
  type: TransactionType;
  /** e.g. "sales", "rent", "inventory", "utilities". */
  category: string;
  amount: number;
  note: string;
  date: string;
  linkedOrderId: Id | null;
  /** Photo of the paper receipt for expenses. */
  receiptUri?: string | null;
}

// ---------------------------------------------------------------------------
// Supply & promotions
// ---------------------------------------------------------------------------

export interface Supplier {
  id: Id;
  name: string;
  contact: string | null;
  notes: string;
}

export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  variantId: Id;
  qty: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: Id;
  supplierId: Id;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  totalCost: number;
  createdAt: string;
}

export type PromotionType = 'percent' | 'fixed' | 'bogo';

export interface Promotion {
  id: Id;
  name: string;
  type: PromotionType;
  /** Percent (0–1) for `percent`, currency amount for `fixed`. */
  value: number;
  code: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export interface Review {
  id: Id;
  productId: Id;
  customerId: Id;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAt: string;
}

export type NotificationType =
  | 'low-stock'
  | 'new-order'
  | 'installment-due'
  | 'installment-overdue'
  | 'daily-summary';

export interface AppNotification {
  id: Id;
  type: NotificationType;
  /** i18n key + params for the title, resolved with `t()` at render time. */
  titleKey: string;
  titleParams?: Record<string, string | number>;
  /** i18n key + params for the body, resolved with `t()` at render time. */
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  read: boolean;
  createdAt: string;
}
