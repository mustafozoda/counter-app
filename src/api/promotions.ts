import AsyncStorage from '@react-native-async-storage/async-storage';

import { createLocalId } from '@/lib/id';
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

export const promotionsApi: PromotionsApi = new LocalPromotionsApi();
