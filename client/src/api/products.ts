import AsyncStorage from '@react-native-async-storage/async-storage';

import { defaultCategoriesFor, sampleCatalogFor } from '@/features/products/seed';
import type { ProductWithVariants } from '@/features/products/stock';
import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { uploadImages } from '@/lib/upload';
import type {
  Category,
  Id,
  Product,
  ProductStatus,
  ProductVariant,
  StockMovement,
  StockMovementType,
} from '@/types/models';

export interface VariantInput {
  /** Present = keep/update this existing variant; absent = create. */
  id?: Id;
  attributes: Record<string, string>;
  sku: string;
  barcode: string | null;
  /** Opening stock — applied (with a movement) to NEW variants only. */
  stockQty: number;
  priceOverride: number | null;
  lowStockThreshold: number;
}

export interface ProductInput {
  name: string;
  description: string;
  brand: string | null;
  categoryId: Id | null;
  images: string[];
  cost: number;
  basePrice: number;
  taxRate: number | null;
  status: ProductStatus;
  variants: VariantInput[];
}

export interface CategoryInput {
  id?: Id;
  name: string;
  parentId: Id | null;
}

export interface BarcodeHit {
  product: ProductWithVariants;
  variant: ProductVariant;
}

/**
 * Catalog data access. The UI only ever talks to this interface through
 * TanStack Query hooks — Phase 2 swaps the implementation for SQLite/Drizzle
 * (offline source of truth) and later Supabase, with zero UI refactors.
 */
export interface ProductsApi {
  listProducts(): Promise<ProductWithVariants[]>;
  getProduct(id: Id): Promise<ProductWithVariants | null>;
  createProduct(input: ProductInput): Promise<ProductWithVariants>;
  updateProduct(id: Id, input: ProductInput): Promise<ProductWithVariants>;
  setProductStatus(id: Id, status: ProductStatus): Promise<void>;
  deleteProduct(id: Id): Promise<void>;
  adjustStock(
    variantId: Id,
    qtyDelta: number,
    type: StockMovementType,
    reason: string | null,
  ): Promise<void>;
  listMovements(productId: Id): Promise<StockMovement[]>;
  findByBarcode(code: string): Promise<BarcodeHit | null>;
  listCategories(): Promise<Category[]>;
  saveCategory(input: CategoryInput): Promise<Category>;
  deleteCategory(id: Id): Promise<void>;
  /** Default categories on first run; idempotent. */
  ensureSeeded(vertical: string): Promise<void>;
  /** Opt-in demo catalog (empty-state CTA). Returns products created. */
  addSampleCatalog(vertical: string): Promise<number>;
}

interface ProductsDoc {
  v: 1;
  products: Product[];
  variants: ProductVariant[];
  movements: StockMovement[];
  categories: Category[];
  categoriesSeeded: boolean;
}

const STORAGE_KEY = 'counter.catalog.v1';

const emptyDoc = (): ProductsDoc => ({
  v: 1,
  products: [],
  variants: [],
  movements: [],
  categories: [],
  categoriesSeeded: false,
});

/**
 * AsyncStorage-backed implementation: the whole catalog lives in one JSON
 * document, loaded once and persisted after every mutation. Plenty for a
 * single shop's catalog until the SQLite layer lands.
 */
export class LocalProductsApi implements ProductsApi {
  private doc: ProductsDoc | null = null;
  private loading: Promise<ProductsDoc> | null = null;

  private async load(): Promise<ProductsDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.doc = raw ? (JSON.parse(raw) as ProductsDoc) : emptyDoc();
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  private withVariants(doc: ProductsDoc, product: Product): ProductWithVariants {
    return { ...product, variants: doc.variants.filter((v) => v.productId === product.id) };
  }

  async listProducts(): Promise<ProductWithVariants[]> {
    const doc = await this.load();
    return doc.products.map((p) => this.withVariants(doc, p));
  }

  async getProduct(id: Id): Promise<ProductWithVariants | null> {
    const doc = await this.load();
    const product = doc.products.find((p) => p.id === id);
    return product ? this.withVariants(doc, product) : null;
  }

  async createProduct(input: ProductInput): Promise<ProductWithVariants> {
    const doc = await this.load();
    const product: Product = {
      id: createLocalId(),
      name: input.name,
      description: input.description,
      brand: input.brand,
      categoryId: input.categoryId,
      images: input.images,
      cost: input.cost,
      basePrice: input.basePrice,
      taxRate: input.taxRate,
      status: input.status,
      createdAt: new Date().toISOString(),
    };
    doc.products.push(product);
    for (const v of input.variants) this.insertVariant(doc, product.id, v);
    await this.save();
    return this.withVariants(doc, product);
  }

  async updateProduct(id: Id, input: ProductInput): Promise<ProductWithVariants> {
    const doc = await this.load();
    const product = doc.products.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');

    Object.assign(product, {
      name: input.name,
      description: input.description,
      brand: input.brand,
      categoryId: input.categoryId,
      images: input.images,
      cost: input.cost,
      basePrice: input.basePrice,
      taxRate: input.taxRate,
      status: input.status,
    });

    const keptIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id as Id));
    doc.variants = doc.variants.filter((v) => v.productId !== id || keptIds.has(v.id));

    for (const v of input.variants) {
      if (v.id) {
        const existing = doc.variants.find((ev) => ev.id === v.id);
        if (existing) {
          // Stock changes only flow through adjustStock so the movement
          // ledger stays truthful.
          existing.attributes = v.attributes;
          existing.sku = v.sku;
          existing.barcode = v.barcode;
          existing.priceOverride = v.priceOverride;
          existing.lowStockThreshold = v.lowStockThreshold;
        }
      } else {
        this.insertVariant(doc, id, v);
      }
    }

    await this.save();
    return this.withVariants(doc, product);
  }

  private insertVariant(doc: ProductsDoc, productId: Id, input: VariantInput): void {
    const variant: ProductVariant = {
      id: createLocalId(),
      productId,
      attributes: input.attributes,
      sku: input.sku,
      barcode: input.barcode,
      stockQty: Math.max(0, input.stockQty),
      priceOverride: input.priceOverride,
      lowStockThreshold: input.lowStockThreshold,
    };
    doc.variants.push(variant);
    if (variant.stockQty > 0) {
      doc.movements.push({
        id: createLocalId(),
        variantId: variant.id,
        type: 'restock',
        qty: variant.stockQty,
        reason: 'Opening stock',
        createdAt: new Date().toISOString(),
      });
    }
  }

  async setProductStatus(id: Id, status: ProductStatus): Promise<void> {
    const doc = await this.load();
    const product = doc.products.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');
    product.status = status;
    await this.save();
  }

  async deleteProduct(id: Id): Promise<void> {
    const doc = await this.load();
    const variantIds = new Set(doc.variants.filter((v) => v.productId === id).map((v) => v.id));
    doc.products = doc.products.filter((p) => p.id !== id);
    doc.variants = doc.variants.filter((v) => v.productId !== id);
    doc.movements = doc.movements.filter((m) => !variantIds.has(m.variantId));
    await this.save();
  }

  async adjustStock(
    variantId: Id,
    qtyDelta: number,
    type: StockMovementType,
    reason: string | null,
  ): Promise<void> {
    if (qtyDelta === 0) return;
    const doc = await this.load();
    const variant = doc.variants.find((v) => v.id === variantId);
    if (!variant) throw new Error('Variant not found');
    // Never go negative; record the applied delta, not the requested one.
    const applied = Math.max(qtyDelta, -variant.stockQty);
    variant.stockQty += applied;
    doc.movements.push({
      id: createLocalId(),
      variantId,
      type,
      qty: applied,
      reason,
      createdAt: new Date().toISOString(),
    });
    await this.save();
  }

  async listMovements(productId: Id): Promise<StockMovement[]> {
    const doc = await this.load();
    const variantIds = new Set(
      doc.variants.filter((v) => v.productId === productId).map((v) => v.id),
    );
    return doc.movements
      .filter((m) => variantIds.has(m.variantId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findByBarcode(code: string): Promise<BarcodeHit | null> {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const doc = await this.load();
    const variant = doc.variants.find((v) => v.barcode === trimmed);
    if (!variant) return null;
    const product = doc.products.find((p) => p.id === variant.productId);
    if (!product) return null;
    return { product: this.withVariants(doc, product), variant };
  }

  async listCategories(): Promise<Category[]> {
    const doc = await this.load();
    return [...doc.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveCategory(input: CategoryInput): Promise<Category> {
    const doc = await this.load();
    if (input.id) {
      const existing = doc.categories.find((c) => c.id === input.id);
      if (!existing) throw new Error('Category not found');
      existing.name = input.name;
      existing.parentId = input.parentId;
      await this.save();
      return existing;
    }
    const category: Category = {
      id: createLocalId(),
      name: input.name,
      parentId: input.parentId,
      sortOrder: doc.categories.length,
    };
    doc.categories.push(category);
    await this.save();
    return category;
  }

  async deleteCategory(id: Id): Promise<void> {
    const doc = await this.load();
    doc.categories = doc.categories.filter((c) => c.id !== id);
    for (const c of doc.categories) if (c.parentId === id) c.parentId = null;
    for (const p of doc.products) if (p.categoryId === id) p.categoryId = null;
    await this.save();
  }

  async ensureSeeded(vertical: string): Promise<void> {
    const doc = await this.load();
    if (doc.categoriesSeeded) return;
    doc.categories = defaultCategoriesFor(vertical).map((name, index) => ({
      id: createLocalId(),
      name,
      parentId: null,
      sortOrder: index,
    }));
    doc.categoriesSeeded = true;
    await this.save();
  }

  async addSampleCatalog(vertical: string): Promise<number> {
    await this.ensureSeeded(vertical);
    const doc = await this.load();
    const samples = sampleCatalogFor(vertical, doc.categories);
    for (const sample of samples) {
      const product: Product = { ...sample.product, id: createLocalId() };
      doc.products.push(product);
      for (const v of sample.variants) this.insertVariant(doc, product.id, v);
    }
    await this.save();
    return samples.length;
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

interface VariantRow {
  id: string;
  product_id: string;
  attributes: Record<string, string> | null;
  sku: string;
  barcode: string | null;
  stock_qty: number;
  price_override: number | null;
  low_stock_threshold: number;
}

interface ProductRow {
  id: string;
  name: string;
  description: string;
  brand: string | null;
  category_id: string | null;
  images: string[] | null;
  cost: number;
  base_price: number;
  tax_rate: number | null;
  status: ProductStatus;
  created_at: string;
  product_variants?: VariantRow[];
}

interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface MovementRow {
  id: string;
  variant_id: string;
  type: StockMovementType;
  qty: number;
  reason: string | null;
  created_at: string;
}

const toVariant = (row: VariantRow): ProductVariant => ({
  id: row.id,
  productId: row.product_id,
  attributes: row.attributes ?? {},
  sku: row.sku,
  barcode: row.barcode,
  stockQty: row.stock_qty,
  priceOverride: row.price_override == null ? null : Number(row.price_override),
  lowStockThreshold: row.low_stock_threshold,
});

const toProduct = (row: ProductRow): ProductWithVariants => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  brand: row.brand,
  categoryId: row.category_id,
  images: row.images ?? [],
  cost: Number(row.cost),
  basePrice: Number(row.base_price),
  taxRate: row.tax_rate == null ? null : Number(row.tax_rate),
  status: row.status,
  createdAt: row.created_at,
  variants: (row.product_variants ?? []).map(toVariant),
});

const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  parentId: row.parent_id,
  sortOrder: row.sort_order,
});

/**
 * Supabase-backed catalog. Reads are scoped to the active store by RLS; inserts
 * stamp store_id explicitly. Stock only ever changes through `adjust_stock` (an
 * atomic RPC) so the movement ledger stays truthful.
 */
export class SupabaseProductsApi implements ProductsApi {
  private seededStoreId: string | null = null;

  async listProducts(): Promise<ProductWithVariants[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  async getProduct(id: Id): Promise<ProductWithVariants | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toProduct(data as ProductRow) : null;
  }

  async createProduct(input: ProductInput): Promise<ProductWithVariants> {
    const storeId = getActiveStoreId();
    const images = await uploadImages(input.images, storeId);
    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        name: input.name,
        description: input.description,
        brand: input.brand,
        category_id: input.categoryId,
        images,
        cost: input.cost,
        base_price: input.basePrice,
        tax_rate: input.taxRate,
        status: input.status,
      })
      .select('id')
      .single();
    if (error) throw error;
    const productId = (data as { id: string }).id;
    for (const v of input.variants) await this.insertVariant(storeId, productId, v);
    const created = await this.getProduct(productId);
    if (!created) throw new Error('Product not found after create');
    return created;
  }

  private async insertVariant(storeId: string, productId: Id, input: VariantInput): Promise<void> {
    const stockQty = Math.max(0, input.stockQty);
    const { data, error } = await supabase
      .from('product_variants')
      .insert({
        store_id: storeId,
        product_id: productId,
        attributes: input.attributes,
        sku: input.sku,
        barcode: input.barcode,
        stock_qty: stockQty,
        price_override: input.priceOverride,
        low_stock_threshold: input.lowStockThreshold,
      })
      .select('id')
      .single();
    if (error) throw error;
    if (stockQty > 0) {
      // Opening stock is set directly above; log a matching restock movement.
      await supabase.from('stock_movements').insert({
        store_id: storeId,
        variant_id: (data as { id: string }).id,
        type: 'restock',
        qty: stockQty,
        reason: 'Opening stock',
      });
    }
  }

  async updateProduct(id: Id, input: ProductInput): Promise<ProductWithVariants> {
    const storeId = getActiveStoreId();
    const images = await uploadImages(input.images, storeId);
    const { error } = await supabase
      .from('products')
      .update({
        name: input.name,
        description: input.description,
        brand: input.brand,
        category_id: input.categoryId,
        images,
        cost: input.cost,
        base_price: input.basePrice,
        tax_rate: input.taxRate,
        status: input.status,
      })
      .eq('id', id);
    if (error) throw error;

    const keptIds = input.variants.filter((v) => v.id).map((v) => v.id as Id);
    let del = supabase.from('product_variants').delete().eq('product_id', id);
    if (keptIds.length > 0) del = del.not('id', 'in', `(${keptIds.join(',')})`);
    await del;

    for (const v of input.variants) {
      if (v.id) {
        // Stock changes only flow through adjustStock; never touch stock_qty here.
        await supabase
          .from('product_variants')
          .update({
            attributes: v.attributes,
            sku: v.sku,
            barcode: v.barcode,
            price_override: v.priceOverride,
            low_stock_threshold: v.lowStockThreshold,
          })
          .eq('id', v.id);
      } else {
        await this.insertVariant(storeId, id, v);
      }
    }
    const updated = await this.getProduct(id);
    if (!updated) throw new Error('Product not found after update');
    return updated;
  }

  async setProductStatus(id: Id, status: ProductStatus): Promise<void> {
    const { error } = await supabase.from('products').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async deleteProduct(id: Id): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async adjustStock(
    variantId: Id,
    qtyDelta: number,
    type: StockMovementType,
    reason: string | null,
  ): Promise<void> {
    const { error } = await supabase.rpc('adjust_stock', {
      p_variant_id: variantId,
      p_qty_delta: qtyDelta,
      p_type: type,
      p_reason: reason,
    });
    if (error) throw error;
  }

  async listMovements(productId: Id): Promise<StockMovement[]> {
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId);
    const ids = (variants as { id: string }[] | null)?.map((v) => v.id) ?? [];
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .in('variant_id', ids)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as MovementRow[]).map((m) => ({
      id: m.id,
      variantId: m.variant_id,
      type: m.type,
      qty: m.qty,
      reason: m.reason,
      createdAt: m.created_at,
    }));
  }

  async findByBarcode(code: string): Promise<BarcodeHit | null> {
    const trimmed = code.trim();
    if (!trimmed) return null;
    const { data: variant } = await supabase
      .from('product_variants')
      .select('*')
      .eq('barcode', trimmed)
      .maybeSingle();
    if (!variant) return null;
    const product = await this.getProduct((variant as VariantRow).product_id);
    if (!product) return null;
    return { product, variant: toVariant(variant as VariantRow) };
  }

  async listCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as CategoryRow[]).map(toCategory);
  }

  async saveCategory(input: CategoryInput): Promise<Category> {
    if (input.id) {
      const { data, error } = await supabase
        .from('categories')
        .update({ name: input.name, parent_id: input.parentId })
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return toCategory(data as CategoryRow);
    }
    const { count } = await supabase.from('categories').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase
      .from('categories')
      .insert({
        store_id: getActiveStoreId(),
        name: input.name,
        parent_id: input.parentId,
        sort_order: count ?? 0,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toCategory(data as CategoryRow);
  }

  async deleteCategory(id: Id): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  async ensureSeeded(vertical: string): Promise<void> {
    const storeId = getActiveStoreId();
    if (this.seededStoreId === storeId) return;
    const { count } = await supabase.from('categories').select('id', { count: 'exact', head: true });
    if ((count ?? 0) === 0) {
      const rows = defaultCategoriesFor(vertical).map((name, index) => ({
        store_id: storeId,
        name,
        parent_id: null,
        sort_order: index,
      }));
      const { error } = await supabase.from('categories').insert(rows);
      if (error) throw error;
    }
    this.seededStoreId = storeId;
  }

  async addSampleCatalog(vertical: string): Promise<number> {
    await this.ensureSeeded(vertical);
    const categories = await this.listCategories();
    const samples = sampleCatalogFor(vertical, categories);
    for (const sample of samples) {
      await this.createProduct({
        name: sample.product.name,
        description: sample.product.description,
        brand: sample.product.brand,
        categoryId: sample.product.categoryId,
        images: sample.product.images,
        cost: sample.product.cost,
        basePrice: sample.product.basePrice,
        taxRate: sample.product.taxRate,
        status: sample.product.status,
        variants: sample.variants,
      });
    }
    return samples.length;
  }
}

export const productsApi: ProductsApi = isSupabaseConfigured
  ? new SupabaseProductsApi()
  : new LocalProductsApi();
