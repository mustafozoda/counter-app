import type { Product, ProductVariant } from '@/types/models';

import { filterProducts, defaultCatalogFilter, lowStockProducts } from '../filtering';
import {
  generateSku,
  marginRatio,
  priceRange,
  productStockStatus,
  variantLabel,
  variantStockStatus,
  type ProductWithVariants,
} from '../stock';
import { buildRows, rowsFromVariants, signatureOf } from '../components/variant-editor';

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v1',
  productId: 'p1',
  attributes: { Size: '2–4y' },
  sku: 'SKU-1',
  barcode: null,
  stockQty: 10,
  priceOverride: null,
  lowStockThreshold: 4,
  ...overrides,
});

const product = (
  overrides: Partial<Product> = {},
  variants: ProductVariant[] = [variant()],
): ProductWithVariants => ({
  id: 'p1',
  name: 'Dino Hoodie',
  description: '',
  brand: 'Tiny Trek',
  categoryId: 'c1',
  supplierId: null,
  images: [],
  cost: 9.5,
  basePrice: 24,
  taxRate: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
  variants,
});

describe('stock status', () => {
  it('classifies variants', () => {
    expect(variantStockStatus(variant({ stockQty: 10 }))).toBe('in-stock');
    expect(variantStockStatus(variant({ stockQty: 4 }))).toBe('low');
    expect(variantStockStatus(variant({ stockQty: 0 }))).toBe('out');
  });

  it('rolls variants up to product level', () => {
    expect(productStockStatus([variant({ stockQty: 10 }), variant({ id: 'v2', stockQty: 9 })])).toBe(
      'in-stock',
    );
    expect(productStockStatus([variant({ stockQty: 10 }), variant({ id: 'v2', stockQty: 0 })])).toBe(
      'low',
    );
    expect(productStockStatus([variant({ stockQty: 0 }), variant({ id: 'v2', stockQty: 0 })])).toBe(
      'out',
    );
    expect(productStockStatus([])).toBe('out');
  });
});

describe('pricing helpers', () => {
  it('computes margin', () => {
    expect(marginRatio(9.5, 24)).toBeCloseTo(0.604, 2);
    expect(marginRatio(0, 0)).toBeNull();
  });

  it('computes price range with overrides', () => {
    const p = product({}, [variant(), variant({ id: 'v2', priceOverride: 28 })]);
    expect(priceRange(p)).toEqual([24, 28]);
  });
});

describe('labels and skus', () => {
  it('joins attribute values', () => {
    expect(variantLabel(variant({ attributes: { Size: '2–4y', Color: 'Sage' } }))).toBe('2–4y · Sage');
    expect(variantLabel(variant({ attributes: {} }))).toBe('Default');
  });

  it('generates compact uppercase skus', () => {
    expect(generateSku('Dino Hoodie', ['2–4y', 'Sage'])).toBe('DIN-HOO-24Y-SAG');
    expect(generateSku('', [])).toBe('PRD');
  });
});

describe('catalog filtering', () => {
  const catalog: ProductWithVariants[] = [
    product(),
    product({ id: 'p2', name: 'Beanie', brand: null, categoryId: 'c2' }, [
      variant({ id: 'v9', productId: 'p2', stockQty: 0, sku: 'BEAN-1', barcode: '478123' }),
    ]),
    product({ id: 'p3', name: 'Old Coat', status: 'archived' }),
  ];

  it('hides archived by default and finds them on demand', () => {
    expect(filterProducts(catalog, defaultCatalogFilter).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(
      filterProducts(catalog, { ...defaultCatalogFilter, archived: true }).map((p) => p.id),
    ).toEqual(['p3']);
  });

  it('matches query against name, brand, sku and barcode', () => {
    const find = (query: string) =>
      filterProducts(catalog, { ...defaultCatalogFilter, query }).map((p) => p.id);
    expect(find('dino')).toEqual(['p1']);
    expect(find('tiny trek')).toEqual(['p1']);
    expect(find('BEAN-1')).toEqual(['p2']);
    expect(find('478123')).toEqual(['p2']);
  });

  it('filters by stock and category', () => {
    expect(
      filterProducts(catalog, { ...defaultCatalogFilter, stock: 'out' }).map((p) => p.id),
    ).toEqual(['p2']);
    expect(
      filterProducts(catalog, { ...defaultCatalogFilter, categoryId: 'c2' }).map((p) => p.id),
    ).toEqual(['p2']);
  });

  it('surfaces low stock urgently ordered', () => {
    expect(lowStockProducts(catalog).map((p) => p.id)).toEqual(['p2']);
  });
});

describe('variant matrix builder', () => {
  it('builds the cartesian product and preserves edited rows', () => {
    const first = buildRows('Dino Hoodie', [{ name: 'Size', values: ['2–4y', '4–6y'] }], []);
    expect(first.rows).toHaveLength(2);
    expect(first.truncated).toBe(false);

    const edited = first.rows.map((r, i) => (i === 0 ? { ...r, barcode: '999' } : r));
    const second = buildRows(
      'Dino Hoodie',
      [
        { name: 'Size', values: ['2–4y', '4–6y'] },
        { name: 'Color', values: [] },
      ],
      edited,
    );
    expect(second.rows[0]?.barcode).toBe('999');
  });

  it('round-trips stored variants into editor state', () => {
    const variants = [
      variant({ attributes: { Size: '2–4y', Color: 'Sage' } }),
      variant({ id: 'v2', attributes: { Size: '4–6y', Color: 'Sage' }, stockQty: 3 }),
    ];
    const state = rowsFromVariants(variants);
    expect(state.attributes).toEqual([
      { name: 'Size', values: ['2–4y', '4–6y'] },
      { name: 'Color', values: ['Sage'] },
    ]);
    expect(state.rows.map((r) => r.signature)).toEqual([
      signatureOf({ Size: '2–4y', Color: 'Sage' }),
      signatureOf({ Size: '4–6y', Color: 'Sage' }),
    ]);
    expect(state.rows[1]?.stock).toBe('3');
  });
});
