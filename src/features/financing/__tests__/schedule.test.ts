import type { FinancingPlan, Installment } from '@/types/models';

import {
  deriveInstallmentStatus,
  generateSchedule,
  planProgress,
  summarizeFinancing,
} from '../schedule';

const NOW = new Date('2026-06-12T12:00:00.000Z');

describe('generateSchedule', () => {
  it('splits the financed remainder evenly with drift on the last', () => {
    const schedule = generateSchedule(100, 10, 3, 'monthly', NOW);
    expect(schedule.map((s) => s.amount)).toEqual([30, 30, 30]);

    const uneven = generateSchedule(100, 0, 3, 'monthly', NOW);
    expect(uneven.map((s) => s.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(uneven.reduce((a, b) => a + b.amount, 0)).toBeCloseTo(100, 2);
  });

  it('spaces due dates by frequency', () => {
    const weekly = generateSchedule(90, 0, 2, 'weekly', NOW);
    expect(new Date(weekly[0]!.dueDate).getDate()).toBe(19);
    expect(new Date(weekly[1]!.dueDate).getDate()).toBe(26);

    const monthly = generateSchedule(90, 0, 2, 'monthly', NOW);
    expect(new Date(monthly[0]!.dueDate).getMonth()).toBe(6); // July
  });

  it('returns empty when fully covered by the down payment', () => {
    expect(generateSchedule(50, 50, 4, 'weekly', NOW)).toEqual([]);
    expect(generateSchedule(50, 80, 4, 'weekly', NOW)).toEqual([]);
  });
});

const installment = (overrides: Partial<Installment>): Installment => ({
  id: Math.random().toString(36),
  planId: 'plan1',
  number: 1,
  dueDate: '2026-07-12T00:00:00.000Z',
  amount: 25,
  paidAt: null,
  status: 'upcoming',
  ...overrides,
});

describe('deriveInstallmentStatus', () => {
  it('classifies by paid state and due distance', () => {
    expect(deriveInstallmentStatus(installment({ paidAt: '2026-06-01' }), NOW)).toBe('paid');
    expect(deriveInstallmentStatus(installment({ dueDate: '2026-06-10T00:00:00.000Z' }), NOW)).toBe('overdue');
    expect(deriveInstallmentStatus(installment({ dueDate: '2026-06-15T00:00:00.000Z' }), NOW)).toBe('due');
    expect(deriveInstallmentStatus(installment({ dueDate: '2026-08-01T00:00:00.000Z' }), NOW)).toBe('upcoming');
  });
});

const plan = (installments: Installment[], overrides: Partial<FinancingPlan> = {}): FinancingPlan => ({
  id: 'plan1',
  orderId: 'o1',
  customerId: 'c1',
  principal: 100,
  downPayment: 25,
  installments,
  frequency: 'monthly',
  status: 'active',
  createdAt: NOW.toISOString(),
  ...overrides,
});

describe('planProgress / summarizeFinancing', () => {
  it('tracks paid ratio including the down payment', () => {
    const p = plan([
      installment({ amount: 25, paidAt: '2026-06-12' }),
      installment({ amount: 25 }),
      installment({ amount: 25, dueDate: '2026-06-01T00:00:00.000Z' }),
    ]);
    const progress = planProgress(p, NOW);
    expect(progress.paidCount).toBe(1);
    expect(progress.outstanding).toBe(50);
    expect(progress.ratio).toBeCloseTo(0.5); // 25 down + 25 paid of 100
    expect(progress.overdueCount).toBe(1);
    expect(progress.nextDue?.dueDate).toBe('2026-06-01T00:00:00.000Z');
  });

  it('summarizes only active plans', () => {
    const active = plan([
      installment({ amount: 30, dueDate: '2026-06-14T00:00:00.000Z' }),
      installment({ amount: 30, dueDate: '2026-06-01T00:00:00.000Z' }),
      installment({ amount: 30, dueDate: '2026-09-01T00:00:00.000Z' }),
    ]);
    const cancelled = plan([installment({ amount: 99 })], { id: 'p2', status: 'cancelled' });

    const summary = summarizeFinancing([active, cancelled], NOW);
    expect(summary.activePlans).toBe(1);
    expect(summary.outstandingTotal).toBe(90);
    expect(summary.dueSoonCount).toBe(2); // due-soon + overdue
    expect(summary.dueSoonAmount).toBe(60);
    expect(summary.overdueCount).toBe(1);
  });
});
