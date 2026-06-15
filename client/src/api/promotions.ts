import AsyncStorage from '@react-native-async-storage/async-storage';

import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Id, Promotion, PromotionType } from '@/types/models';

export interface PromotionInput {
  id?: Id;
  name: string;
  type: PromotionType;
  value: number;
  code: string | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

export interface PromotionsApi {
  listPromotions(): Promise<Promotion[]>;
  savePromotion(input: PromotionInput): Promise<Promotion>;
  deletePromotion(id: Id): Promise<void>;
  setActive(id: Id, active: boolean): Promise<void>;
}

interface PromotionsDoc {
  v: 1;
  promotions: Promotion[];
}

const STORAGE_KEY = 'counter.promotions.v1';

export class LocalPromotionsApi implements PromotionsApi {
  private doc: PromotionsDoc | null = null;
  private loading: Promise<PromotionsDoc> | null = null;

  private async load(): Promise<PromotionsDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.doc = raw ? (JSON.parse(raw) as PromotionsDoc) : { v: 1, promotions: [] };
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  async listPromotions(): Promise<Promotion[]> {
    const doc = await this.load();
    return [...doc.promotions].sort((a, b) => Number(b.active) - Number(a.active));
  }

  async savePromotion(input: PromotionInput): Promise<Promotion> {
    const doc = await this.load();
    if (input.id) {
      const existing = doc.promotions.find((p) => p.id === input.id);
      if (!existing) throw new Error('Promotion not found');
      Object.assign(existing, input);
      await this.save();
      return existing;
    }
    const promotion: Promotion = { ...input, id: createLocalId() };
    doc.promotions.push(promotion);
    await this.save();
    return promotion;
  }

  async deletePromotion(id: Id): Promise<void> {
    const doc = await this.load();
    doc.promotions = doc.promotions.filter((p) => p.id !== id);
    await this.save();
  }

  async setActive(id: Id, active: boolean): Promise<void> {
    const doc = await this.load();
    const promotion = doc.promotions.find((p) => p.id === id);
    if (!promotion) return;
    promotion.active = active;
    await this.save();
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

interface PromotionRow {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

const toPromotion = (row: PromotionRow): Promotion => ({
  id: row.id,
  name: row.name,
  type: row.type,
  value: Number(row.value),
  code: row.code,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  active: row.active,
});

export class SupabasePromotionsApi implements PromotionsApi {
  async listPromotions(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('active', { ascending: false });
    if (error) throw error;
    return (data as PromotionRow[]).map(toPromotion);
  }

  async savePromotion(input: PromotionInput): Promise<Promotion> {
    const fields = {
      name: input.name,
      type: input.type,
      value: input.value,
      code: input.code,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      active: input.active,
    };
    if (input.id) {
      const { data, error } = await supabase
        .from('promotions')
        .update(fields)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return toPromotion(data as PromotionRow);
    }
    const { data, error } = await supabase
      .from('promotions')
      .insert({ store_id: getActiveStoreId(), ...fields })
      .select('*')
      .single();
    if (error) throw error;
    return toPromotion(data as PromotionRow);
  }

  async deletePromotion(id: Id): Promise<void> {
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) throw error;
  }

  async setActive(id: Id, active: boolean): Promise<void> {
    const { error } = await supabase.from('promotions').update({ active }).eq('id', id);
    if (error) throw error;
  }
}

export const promotionsApi: PromotionsApi = isSupabaseConfigured
  ? new SupabasePromotionsApi()
  : new LocalPromotionsApi();
