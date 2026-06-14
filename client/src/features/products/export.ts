import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { i18n } from '@/i18n';
import { toCsv } from '@/lib/csv';
import { toast } from '@/stores/toast';
import type { Category } from '@/types/models';

import { variantLabel, variantPrice, type ProductWithVariants } from './stock';

/** One CSV row per variant — the shape spreadsheets and re-import expect. */
export function buildCatalogCsv(products: ProductWithVariants[], categories: Category[]): string {
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? '';
  const rows: (string | number | null)[][] = [
    [
      'Product',
      'Brand',
      'Category',
      'Status',
      'Variant',
      'SKU',
      'Barcode',
      'Cost',
      'Price',
      'Stock',
      'Low stock alert',
    ],
  ];
  for (const product of products) {
    for (const variant of product.variants) {
      rows.push([
        product.name,
        product.brand,
        categoryName(product.categoryId),
        product.status,
        variantLabel(variant),
        variant.sku,
        variant.barcode,
        product.cost,
        variantPrice(product, variant),
        variant.stockQty,
        variant.lowStockThreshold,
      ]);
    }
  }
  return toCsv(rows);
}

export async function shareCatalogCsv(
  products: ProductWithVariants[],
  categories: Category[],
): Promise<void> {
  try {
    const csv = buildCatalogCsv(products, categories);
    const file = new File(Paths.cache, `counter-catalog-${Date.now()}.csv`);
    file.write(csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: i18n.t('products.exportCsv') });
    } else {
      toast.info(i18n.t('products.exportSaved'), i18n.t('common.sharingUnavailable'));
    }
  } catch {
    toast.error(i18n.t('products.exportFailed'), i18n.t('products.exportFailedMsg'));
  }
}
