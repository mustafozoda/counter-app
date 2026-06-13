import AsyncStorage from '@react-native-async-storage/async-storage';

import { productsApi } from '@/api/products';
import { createLocalId } from '@/lib/id';
import type { Id, PurchaseOrder, PurchaseOrderItem, Supplier } from '@/types/models';

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

export const suppliersApi: SuppliersApi = new LocalSuppliersApi();
