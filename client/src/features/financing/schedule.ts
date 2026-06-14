import { addDays, addMonths, differenceInCalendarDays, startOfDay } from 'date-fns';

import type { FinancingPlan, Installment } from '@/types/models';

export type Frequency = FinancingPlan['frequency'];

export const FREQUENCY_OPTIONS: { label: string; value: Frequency }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every 2 weeks', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

export const COUNT_PRESETS = [2, 3, 4, 6, 8, 12];

/** Days an unpaid installment may look "due soon" before its date. */
const DUE_SOON_DAYS = 7;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface InstallmentDraft {
  number: number;
  dueDate: string;
  amount: number;
}

/**
 * Equal installments over the financed remainder; rounding drift lands on
 * the final installment so the schedule always sums exactly.
 */
export function generateSchedule(
  principal: number,
  downPayment: number,
  count: number,
  frequency: Frequency,
  startDate: Date = new Date(),
): InstallmentDraft[] {
  const financed = round2(Math.max(0, principal - downPayment));
  if (financed <= 0 || count <= 0) return [];

  const base = round2(Math.floor((financed / count) * 100) / 100);
  const last = round2(financed - base * (count - 1));

  const dueDateFor = (index: number): Date => {
    const n = index + 1;
    switch (frequency) {
      case 'weekly':
        return addDays(startDate, 7 * n);
      case 'biweekly':
        return addDays(startDate, 14 * n);
      case 'monthly':
        return addMonths(startDate, n);
    }
  };

  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    dueDate: startOfDay(dueDateFor(i)).toISOString(),
    amount: i === count - 1 ? last : base,
  }));
}

export type DerivedInstallmentStatus = 'paid' | 'overdue' | 'due' | 'upcoming';

export function deriveInstallmentStatus(
  installment: Pick<Installment, 'paidAt' | 'dueDate'>,
  now: Date = new Date(),
): DerivedInstallmentStatus {
  if (installment.paidAt) return 'paid';
  const days = differenceInCalendarDays(new Date(installment.dueDate), now);
  if (days < 0) return 'overdue';
  if (days <= DUE_SOON_DAYS) return 'due';
  return 'upcoming';
}

export interface PlanProgress {
  paidCount: number;
  totalCount: number;
  paidAmount: number;
  outstanding: number;
  /** 0–1 including the down payment's share of the principal. */
  ratio: number;
  nextDue: Installment | null;
  overdueCount: number;
}

export function planProgress(plan: FinancingPlan, now: Date = new Date()): PlanProgress {
  const paid = plan.installments.filter((i) => i.paidAt !== null);
  const unpaid = plan.installments
    .filter((i) => i.paidAt === null)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paidAmount = round2(paid.reduce((sum, i) => sum + i.amount, 0));
  const outstanding = round2(unpaid.reduce((sum, i) => sum + i.amount, 0));
  const covered = plan.downPayment + paidAmount;

  return {
    paidCount: paid.length,
    totalCount: plan.installments.length,
    paidAmount,
    outstanding,
    ratio: plan.principal > 0 ? Math.min(1, covered / plan.principal) : 1,
    nextDue: unpaid[0] ?? null,
    overdueCount: unpaid.filter((i) => deriveInstallmentStatus(i, now) === 'overdue').length,
  };
}

export interface FinancingSummary {
  activePlans: number;
  outstandingTotal: number;
  /** Unpaid installments due within a week (or already overdue). */
  dueSoonCount: number;
  dueSoonAmount: number;
  overdueCount: number;
}

export function summarizeFinancing(plans: FinancingPlan[], now: Date = new Date()): FinancingSummary {
  const active = plans.filter((p) => p.status === 'active');
  let outstandingTotal = 0;
  let dueSoonCount = 0;
  let dueSoonAmount = 0;
  let overdueCount = 0;

  for (const plan of active) {
    for (const installment of plan.installments) {
      if (installment.paidAt) continue;
      outstandingTotal = round2(outstandingTotal + installment.amount);
      const status = deriveInstallmentStatus(installment, now);
      if (status === 'due' || status === 'overdue') {
        dueSoonCount += 1;
        dueSoonAmount = round2(dueSoonAmount + installment.amount);
      }
      if (status === 'overdue') overdueCount += 1;
    }
  }

  return { activePlans: active.length, outstandingTotal, dueSoonCount, dueSoonAmount, overdueCount };
}
