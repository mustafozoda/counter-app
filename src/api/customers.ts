import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalId } from '@/lib/id';
import type { Customer, Id } from '@/types/models';

export interface CustomerInput {
  name: string;
  phone: string | null;
  email: string | null;
  notes: string;
  tags: string[];
}

export interface CustomersApi {
  listCustomers(): Promise<Customer[]>;
  getCustomer(id: Id): Promise<Customer | null>;
  saveCustomer(input: CustomerInput & { id?: Id }): Promise<Customer>;
  deleteCustomer(id: Id): Promise<void>;
  addLoyaltyPoints(id: Id, points: number): Promise<void>;
}

interface CustomersDoc {
  v: 1;
  customers: Customer[];
}

const STORAGE_KEY = 'counter.customers.v1';

export class LocalCustomersApi implements CustomersApi {
  private doc: CustomersDoc | null = null;
  private loading: Promise<CustomersDoc> | null = null;

  private async load(): Promise<CustomersDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.doc = raw ? (JSON.parse(raw) as CustomersDoc) : { v: 1, customers: [] };
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  async listCustomers(): Promise<Customer[]> {
    const doc = await this.load();
    return [...doc.customers].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCustomer(id: Id): Promise<Customer | null> {
    const doc = await this.load();
    return doc.customers.find((c) => c.id === id) ?? null;
  }

  async saveCustomer(input: CustomerInput & { id?: Id }): Promise<Customer> {
    const doc = await this.load();
    if (input.id) {
      const existing = doc.customers.find((c) => c.id === input.id);
      if (!existing) throw new Error('Customer not found');
      Object.assign(existing, {
        name: input.name,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        tags: input.tags,
      });
      await this.save();
      return existing;
    }
    const customer: Customer = {
      id: createLocalId(),
      name: input.name,
      phone: input.phone,
      email: input.email,
      addresses: [],
      notes: input.notes,
      loyaltyPoints: 0,
      tags: input.tags,
      createdAt: new Date().toISOString(),
    };
    doc.customers.push(customer);
    await this.save();
    return customer;
  }

  async deleteCustomer(id: Id): Promise<void> {
    const doc = await this.load();
    doc.customers = doc.customers.filter((c) => c.id !== id);
    await this.save();
  }

  async addLoyaltyPoints(id: Id, points: number): Promise<void> {
    const doc = await this.load();
    const customer = doc.customers.find((c) => c.id === id);
    if (!customer) return;
    customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + points);
    await this.save();
  }
}

export const customersApi: CustomersApi = new LocalCustomersApi();
