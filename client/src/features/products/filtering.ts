import type { Id } from '@/types/models';

import { priceRange, productStockStatus, totalStock, type ProductWithVariants, type StockStatus } from './stock';

export type ProductSort = 'newest' | 'name' | 'price-asc' | 'price-desc' | 'stock-asc';
export type StockFilter = 'all' | StockStatus;

export interface CatalogFilter {
  query: string;
  categoryId: Id | null;
  stock: StockFilter;
  sort: ProductSort;
  /** Catalog shows current (active + draft) by default; archived on demand. */
  archived: boolean;
}

export const defaultCatalogFilter: CatalogFilter = {
  query: '',
  categoryId: null,
  stock: 'all',
  sort: 'newest',
  archived: false,
};

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'stock-asc', label: 'Stock: low first' },
];

function matchesQuery(product: ProductWithVariants, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.brand?.toLowerCase().includes(q)) return true;
  return product.variants.some(
    (v) => v.sku.toLowerCase().includes(q) || (v.barcode ?? '').includes(q),
  );
}

export function filterProducts(
  products: ProductWithVariants[],
  filter: CatalogFilter,
): ProductWithVariants[] {
  const result = products.filter((p) => {
    if (filter.archived ? p.status !== 'archived' : p.status === 'archived') return false;
    if (filter.categoryId && p.categoryId !== filter.categoryId) return false;
    if (filter.stock !== 'all' && productStockStatus(p.variants) !== filter.stock) return false;
    return matchesQuery(p, filter.query);
  });

  const byName = (a: ProductWithVariants, b: ProductWithVariants) => a.name.localeCompare(b.name);
  switch (filter.sort) {
    case 'name':
      return result.sort(byName);
    case 'price-asc':
      return result.sort((a, b) => priceRange(a)[0] - priceRange(b)[0] || byName(a, b));
    case 'price-desc':
      return result.sort((a, b) => priceRange(b)[1] - priceRange(a)[1] || byName(a, b));
    case 'stock-asc':
      return result.sort((a, b) => totalStock(a.variants) - totalStock(b.variants) || byName(a, b));
    case 'newest':
      return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Products needing attention (low or out), most urgent first. */
export function lowStockProducts(products: ProductWithVariants[]): ProductWithVariants[] {
  return products
    .filter((p) => p.status === 'active' && productStockStatus(p.variants) !== 'in-stock')
    .sort((a, b) => totalStock(a.variants) - totalStock(b.variants));
}
