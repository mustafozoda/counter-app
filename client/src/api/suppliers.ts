import AsyncStorage from '@react-native-async-storage/async-storage';

import { productsApi } from '@/api/products';
import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  Id,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Supplier,
} from '@/types/models';

import { ordersApi } from './orders';

export interface SupplierInput {
  id?: Id;
  name: string;
  contact: string | null;
  notes: string;
}

export interface PurchaseOrderInput {
  supplierId: Id;
  items: PurchaseOrderItem[];
}

export interface SuppliersApi {
  listSuppliers(): Promise<Supplier[]>;
  getSupplier(id: Id): Promise<Supplier | null>;
  saveSupplier(input: SupplierInput): Promise<Supplier>;
  deleteSupplier(id: Id): Promise<void>;
  listPurchaseOrders(): Promise<PurchaseOrder[]>;
  createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder>;
  /** Receives stock (increments inventory + logs an inventory expense). */
  receivePurchaseOrder(id: Id): Promise<void>;
  cancelPurchaseOrder(id: Id): Promise<void>;
}

interface SuppliersDoc {
  v: 1;
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
}

const STORAGE_KEY = 'counter.suppliers.v1';

const emptyDoc = (): SuppliersDoc => ({ v: 1, suppliers: [], purchaseOrders: [] });

const round2 = (n: number) => Math.round(n * 100) / 100;

export function purchaseOrderTotal(items: PurchaseOrderItem[]): number {
  return round2(items.reduce((sum, i) => sum + i.qty * i.unitCost, 0));
}

export class LocalSuppliersApi implements SuppliersApi {
  private doc: SuppliersDoc | null = null;
  private loading: Promise<SuppliersDoc> | null = null;

  private async load(): Promise<SuppliersDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.doc = raw ? (JSON.parse(raw) as SuppliersDoc) : emptyDoc();
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  async listSuppliers(): Promise<Supplier[]> {
    const doc = await this.load();
    return [...doc.suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSupplier(id: Id): Promise<Supplier | null> {
    const doc = await this.load();
    return doc.suppliers.find((s) => s.id === id) ?? null;
  }

  async saveSupplier(input: SupplierInput): Promise<Supplier> {
    const doc = await this.load();
    if (input.id) {
      const existing = doc.suppliers.find((s) => s.id === input.id);
      if (!existing) throw new Error('Supplier not found');
      Object.assign(existing, { name: input.name, contact: input.contact, notes: input.notes });
      await this.save();
      return existing;
    }
    const supplier: Supplier = {
      id: createLocalId(),
      name: input.name,
      contact: input.contact,
      notes: input.notes,
    };
    doc.suppliers.push(supplier);
    await this.save();
    return supplier;
  }

  async deleteSupplier(id: Id): Promise<void> {
    const doc = await this.load();
    doc.suppliers = doc.suppliers.filter((s) => s.id !== id);
    await this.save();
  }

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    const doc = await this.load();
    return [...doc.purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    const doc = await this.load();
    const po: PurchaseOrder = {
      id: createLocalId(),
      supplierId: input.supplierId,
      items: input.items,
      status: 'ordered',
      totalCost: purchaseOrderTotal(input.items),
      createdAt: new Date().toISOString(),
    };
    doc.purchaseOrders.push(po);
    await this.save();
    return po;
  }

  async receivePurchaseOrder(id: Id): Promise<void> {
    const doc = await this.load();
    const po = doc.purchaseOrders.find((p) => p.id === id);
    if (!po || po.status === 'received') return;
    po.status = 'received';
    await this.save();

    // Increment inventory through the movement ledger.
    for (const item of po.items) {
      await productsApi.adjustStock(item.variantId, item.qty, 'restock', 'Purchase order received');
    }

    // Record the inventory cost as an expense.
    if (po.totalCost > 0) {
      await ordersApi.addTransaction({
        type: 'expense',
        category: 'inventory',
        amount: po.totalCost,
        note: 'Purchase order received',
        date: new Date().toISOString(),
        linkedOrderId: null,
      });
    }
  }

  async cancelPurchaseOrder(id: Id): Promise<void> {
    const doc = await this.load();
    const po = doc.purchaseOrders.find((p) => p.id === id);
    if (!po || po.status === 'received') return;
    po.status = 'cancelled';
    await this.save();
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

interface SupplierRow {
  id: string;
  name: string;
  contact: string | null;
  notes: string;
}

interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  items: PurchaseOrderItem[] | null;
  status: PurchaseOrderStatus;
  total_cost: number;
  created_at: string;
}

const toSupplier = (row: SupplierRow): Supplier => ({
  id: row.id,
  name: row.name,
  contact: row.contact,
  notes: row.notes ?? '',
});

const toPurchaseOrder = (row: PurchaseOrderRow): PurchaseOrder => ({
  id: row.id,
  supplierId: row.supplier_id,
  items: row.items ?? [],
  status: row.status,
  totalCost: Number(row.total_cost),
  createdAt: row.created_at,
});

export class SupabaseSuppliersApi implements SuppliersApi {
  async listSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data as SupplierRow[]).map(toSupplier);
  }

  async getSupplier(id: Id): Promise<Supplier | null> {
    const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toSupplier(data as SupplierRow) : null;
  }

  async saveSupplier(input: SupplierInput): Promise<Supplier> {
    if (input.id) {
      const { data, error } = await supabase
        .from('suppliers')
        .update({ name: input.name, contact: input.contact, notes: input.notes })
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return toSupplier(data as SupplierRow);
    }
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        store_id: getActiveStoreId(),
        name: input.name,
        contact: input.contact,
        notes: input.notes,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toSupplier(data as SupplierRow);
  }

  async deleteSupplier(id: Id): Promise<void> {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) throw error;
  }

  async listPurchaseOrders(): Promise<PurchaseOrder[]> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PurchaseOrderRow[]).map(toPurchaseOrder);
  }

  async createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        store_id: getActiveStoreId(),
        supplier_id: input.supplierId,
        items: input.items,
        status: 'ordered',
        total_cost: purchaseOrderTotal(input.items),
      })
      .select('*')
      .single();
    if (error) throw error;
    return toPurchaseOrder(data as PurchaseOrderRow);
  }

  async receivePurchaseOrder(id: Id): Promise<void> {
    const { error } = await supabase.rpc('receive_purchase_order', { p_id: id });
    if (error) throw error;
  }

  async cancelPurchaseOrder(id: Id): Promise<void> {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .neq('status', 'received');
    if (error) throw error;
  }
}

export const suppliersApi: SuppliersApi = isSupabaseConfigured
  ? new SupabaseSuppliersApi()
  : new LocalSuppliersApi();
