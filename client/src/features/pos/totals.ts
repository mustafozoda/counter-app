import type { PaymentMethod } from '@/types/models';

/** A line in the active sale. Snapshot of the variant at add-time. */
export interface CartLine {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  /** Effective tax rate for this line (product override or store default). */
  taxRate: number;
  qty: number;
  /** On-hand stock when added — the qty ceiling. */
  available: number;
  imageUri: string | null;
}

export type CartDiscount =
  | { kind: 'percent'; value: number }
  | { kind: 'fixed'; value: number }
  | null;

export interface CartTotals {
  subtotal: number;
  discount: number;
  /** Tax on the discounted base, per-line rates applied proportionally. */
  tax: number;
  total: number;
  itemCount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function discountAmount(subtotal: number, discount: CartDiscount): number {
  if (!discount || subtotal <= 0) return 0;
  const raw =
    discount.kind === 'percent' ? subtotal * (discount.value / 100) : discount.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

/**
 * Cart math: the discount spreads across lines proportionally, then each
 * line's tax rate applies to its discounted base — so mixed-rate carts and
 * "10% off everything" interact correctly.
 */
export function computeTotals(lines: CartLine[], discount: CartDiscount): CartTotals {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0));
  const off = discountAmount(subtotal, discount);
  const factor = subtotal > 0 ? (subtotal - off) / subtotal : 0;
  const tax = round2(
    lines.reduce((sum, l) => sum + l.unitPrice * l.qty * factor * l.taxRate, 0),
  );
  return {
    subtotal,
    discount: off,
    tax,
    total: round2(subtotal - off + tax),
    itemCount: lines.reduce((sum, l) => sum + l.qty, 0),
  };
}

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  ref: string | null;
}

export function paidSoFar(payments: PaymentEntry[]): number {
  return round2(payments.reduce((sum, p) => sum + p.amount, 0));
}

export function remainingDue(total: number, payments: PaymentEntry[]): number {
  return round2(Math.max(0, total - paidSoFar(payments)));
}

/** Change owed when cash tendered exceeds what's still due. */
export function changeDue(tendered: number, due: number): number {
  return round2(Math.max(0, tendered - due));
}

/** Sensible quick-tender suggestions for a cash amount (exact, then round notes). */
export function cashSuggestions(due: number): number[] {
  if (due <= 0) return [];
  const exact = round2(due);
  const steps = [5, 10, 20, 50, 100];
  const ups = steps
    .map((s) => Math.ceil(due / s) * s)
    .filter((v) => v > exact + 0.001);
  return [exact, ...Array.from(new Set(ups))].slice(0, 4);
}
