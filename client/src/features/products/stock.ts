import type { Product, ProductVariant } from '@/types/models';

export type StockStatus = 'in-stock' | 'low' | 'out';

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

/** A variant is low when at/below its threshold but not empty. */
export function variantStockStatus(variant: ProductVariant): StockStatus {
  if (variant.stockQty <= 0) return 'out';
  if (variant.stockQty <= variant.lowStockThreshold) return 'low';
  return 'in-stock';
}

export function totalStock(variants: ProductVariant[]): number {
  return variants.reduce((sum, v) => sum + v.stockQty, 0);
}

/**
 * Product-level status: out when nothing anywhere, low when any variant is
 * low or out (a missing size is a lost sale even if other sizes are piled up).
 */
export function productStockStatus(variants: ProductVariant[]): StockStatus {
  if (variants.length === 0) return 'out';
  if (totalStock(variants) <= 0) return 'out';
  if (variants.some((v) => variantStockStatus(v) !== 'in-stock')) return 'low';
  return 'in-stock';
}

/** Human label for a variant's attributes: "2–4y · Sage". */
export function variantLabel(variant: ProductVariant): string {
  const values = Object.values(variant.attributes);
  return values.length > 0 ? values.join(' · ') : 'Default';
}

/** Effective selling price for a variant. */
export function variantPrice(product: Product, variant: ProductVariant): number {
  return variant.priceOverride ?? product.basePrice;
}

/** Margin ratio on the base price; null when price is 0. */
export function marginRatio(cost: number, price: number): number | null {
  if (price <= 0) return null;
  return (price - cost) / price;
}

/** Price range across variants: [min, max]. */
export function priceRange(product: ProductWithVariants): [number, number] {
  if (product.variants.length === 0) return [product.basePrice, product.basePrice];
  const prices = product.variants.map((v) => variantPrice(product, v));
  return [Math.min(...prices), Math.max(...prices)];
}

/** SKU from product + attribute values: "DIN-HOO-24Y-SAG". */
export function generateSku(productName: string, attributeValues: string[]): string {
  const part = (s: string, len: number) =>
    s
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, len);
  const base = productName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => part(w, 3))
    .filter(Boolean)
    .join('-');
  const attrs = attributeValues.map((v) => part(v, 3)).filter(Boolean);
  return [base || 'PRD', ...attrs].join('-');
}
