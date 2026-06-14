import type { Promotion } from '@/types/models';

import {
  findPromotionByCode,
  isPromotionLive,
  promotionSummary,
  promotionToDiscount,
} from '../validity';

const NOW = new Date('2026-06-12T12:00:00.000Z');

const promo = (overrides: Partial<Promotion>): Promotion => ({
  id: Math.random().toString(36),
  name: 'Summer Sale',
  type: 'percent',
  value: 0.1,
  code: 'SUMMER',
  startsAt: null,
  endsAt: null,
  active: true,
  ...overrides,
});

describe('isPromotionLive', () => {
  it('respects active flag and date window', () => {
    expect(isPromotionLive(promo({}), NOW)).toBe(true);
    expect(isPromotionLive(promo({ active: false }), NOW)).toBe(false);
    expect(isPromotionLive(promo({ startsAt: '2026-07-01T00:00:00.000Z' }), NOW)).toBe(false);
    expect(isPromotionLive(promo({ endsAt: '2026-06-01T00:00:00.000Z' }), NOW)).toBe(false);
    expect(
      isPromotionLive(promo({ startsAt: '2026-06-01T00:00:00.000Z', endsAt: '2026-06-30T00:00:00.000Z' }), NOW),
    ).toBe(true);
  });
});

describe('findPromotionByCode', () => {
  const promos = [promo({ code: 'SUMMER' }), promo({ code: 'WINTER', active: false })];
  it('matches live codes case-insensitively', () => {
    expect(findPromotionByCode(promos, 'summer', NOW)?.code).toBe('SUMMER');
    expect(findPromotionByCode(promos, 'SUMMER ', NOW)?.code).toBe('SUMMER');
  });
  it('ignores inactive and unknown codes', () => {
    expect(findPromotionByCode(promos, 'winter', NOW)).toBeNull();
    expect(findPromotionByCode(promos, 'nope', NOW)).toBeNull();
    expect(findPromotionByCode(promos, '', NOW)).toBeNull();
  });
});

describe('promotionToDiscount / summary', () => {
  it('maps percent to a 0–100 cart discount', () => {
    expect(promotionToDiscount(promo({ type: 'percent', value: 0.15 }))).toEqual({ kind: 'percent', value: 15 });
  });
  it('maps fixed straight through', () => {
    expect(promotionToDiscount(promo({ type: 'fixed', value: 5 }))).toEqual({ kind: 'fixed', value: 5 });
  });
  it('approximates bogo as 50% off', () => {
    expect(promotionToDiscount(promo({ type: 'bogo', value: 0 }))).toEqual({ kind: 'percent', value: 50 });
  });
  it('summarizes types', () => {
    expect(promotionSummary(promo({ type: 'percent', value: 0.2 }))).toBe('20% off');
    expect(promotionSummary(promo({ type: 'fixed', value: 5 }))).toBe('5 off');
    expect(promotionSummary(promo({ type: 'bogo' }))).toBe('Buy one, get one');
  });
});
