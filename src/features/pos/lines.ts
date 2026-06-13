import { variantLabel, variantPrice, type ProductWithVariants } from '@/features/products/stock';
import type { ProductVariant, Store } from '@/types/models';

import type { CartLine } from './totals';

/** Snapshot a variant into a sellable cart line. */
export function makeCartLine(
  product: ProductWithVariants,
  variant: ProductVariant,
  store: Pick<Store, 'taxRate'>,
): Omit<CartLine, 'qty'> {
  return {
    variantId: variant.id,
    productId: product.id,
    productName: product.name,
    variantLabel: variantLabel(variant),
    sku: variant.sku,
    unitPrice: variantPrice(product, variant),
    taxRate: product.taxRate ?? store.taxRate,
    available: variant.stockQty,
    imageUri: product.images[0] ?? null,
  };
}
