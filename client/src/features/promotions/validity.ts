import type { CartDiscount } from '@/features/pos/totals';
import type { Promotion } from '@/types/models';

/** A promotion is usable now if active and within any configured window. */
export function isPromotionLive(promotion: Promotion, now: Date = new Date()): boolean {
  if (!promotion.active) return false;
  const t = now.getTime();
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > t) return false;
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() < t) return false;
  return true;
}

/** Map a code to a live promotion (case-insensitive). */
export function findPromotionByCode(
  promotions: Promotion[],
  code: string,
  now: Date = new Date(),
): Promotion | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  return (
    promotions.find(
      (p) => p.code?.toLowerCase() === normalized && isPromotionLive(p, now),
    ) ?? null
  );
}

/**
 * Translate a promotion into a cart discount. BOGO is approximated as a
 * proportional percentage off (true line-level BOGO needs cart context the
 * POS will pass in a later iteration).
 */
export function promotionToDiscount(promotion: Promotion): CartDiscount {
  switch (promotion.type) {
    case 'percent':
      return { kind: 'percent', value: promotion.value * 100 };
    case 'fixed':
      return { kind: 'fixed', value: promotion.value };
    case 'bogo':
      // "Buy one get one" ≈ up to 50% off the matched set.
      return { kind: 'percent', value: 50 };
  }
}

export function promotionSummary(promotion: Promotion): string {
  switch (promotion.type) {
    case 'percent':
      return `${Math.round(promotion.value * 100)}% off`;
    case 'fixed':
      return `${promotion.value} off`;
    case 'bogo':
      return 'Buy one, get one';
  }
}
