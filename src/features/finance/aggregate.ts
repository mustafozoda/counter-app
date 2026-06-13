import { addHours, differenceInCalendarDays, startOfDay, startOfHour, subDays } from 'date-fns';

import type { Order, Transaction } from '@/types/models';

export type FinancePeriod = 'today' | 'week' | 'month';

export const PERIOD_OPTIONS: { label: string; value: FinancePeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

export interface PeriodRange {
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
}

export function periodRange(period: FinancePeriod, now: Date = new Date()): PeriodRange {
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const start = startOfDay(subDays(now, days - 1));
  const prevEnd = start;
  const prevStart = subDays(start, days);
  return { start, end: now, prevStart, prevEnd };
}

const inRange = (iso: string, start: Date, end: Date) => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
};

/** Ratio change vs the previous window; null when there is no baseline. */
export function deltaRatio(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

export interface FinanceSummary {
  revenue: number;
  expenses: number;
  profit: number;
  revenueDelta: number | null;
  ordersCount: number;
  ordersDelta: number | null;
  revenueTrend: number[];
  moneyIn: number;
  moneyOut: number;
  /** Paired in/out series for the cash-flow chart. */
  cashflow: { label: string; moneyIn: number; moneyOut: number }[];
  expenseByCategory: { category: string; amount: number }[];
  bestSeller: { name: string; units: number } | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Cash-basis summary of a period — feeds the dashboard and Finance screen. */
export function summarize(
  transactions: Transaction[],
  orders: Order[],
  period: FinancePeriod,
  now: Date = new Date(),
): FinanceSummary {
  const range = periodRange(period, now);

  const inPeriod = transactions.filter((t) => inRange(t.date, range.start, range.end));
  const inPrev = transactions.filter((t) => inRange(t.date, range.prevStart, range.prevEnd));

  const sum = (list: Transaction[], type: Transaction['type']) =>
    round2(list.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0));

  const revenue = sum(inPeriod, 'income');
  const expenses = sum(inPeriod, 'expense');
  const prevRevenue = sum(inPrev, 'income');

  const periodOrders = orders.filter((o) => inRange(o.createdAt, range.start, range.end));
  const prevOrders = orders.filter((o) => inRange(o.createdAt, range.prevStart, range.prevEnd));

  // Buckets: hours for today, days otherwise.
  const buckets: { start: Date; label: string }[] = [];
  if (period === 'today') {
    const dayStart = startOfDay(now);
    for (let h = 0; h <= now.getHours(); h += 3) {
      buckets.push({ start: addHours(dayStart, h), label: `${h}:00` });
    }
  } else {
    const days = period === 'week' ? 7 : 30;
    for (let d = 0; d < days; d++) {
      const start = startOfDay(subDays(now, days - 1 - d));
      buckets.push({ start, label: `${start.getMonth() + 1}/${start.getDate()}` });
    }
  }

  const bucketIndex = (iso: string): number => {
    const date = new Date(iso);
    if (period === 'today') {
      const idx = Math.floor(startOfHour(date).getHours() / 3);
      return Math.min(idx, buckets.length - 1);
    }
    const idx = differenceInCalendarDays(startOfDay(date), buckets[0]!.start);
    return idx;
  };

  const cashflow = buckets.map((b) => ({ label: b.label, moneyIn: 0, moneyOut: 0 }));
  for (const t of inPeriod) {
    const idx = bucketIndex(t.date);
    const bucket = cashflow[idx];
    if (!bucket) continue;
    if (t.type === 'income') bucket.moneyIn = round2(bucket.moneyIn + t.amount);
    else bucket.moneyOut = round2(bucket.moneyOut + t.amount);
  }

  // For month, compress the chart to weekly groups so bars stay readable.
  const chartCashflow =
    period === 'month'
      ? Array.from({ length: 5 }, (_, w) => {
          const slice = cashflow.slice(w * 7, w * 7 + 7);
          if (slice.length === 0) return null;
          return {
            label: slice[0]!.label,
            moneyIn: round2(slice.reduce((a, b) => a + b.moneyIn, 0)),
            moneyOut: round2(slice.reduce((a, b) => a + b.moneyOut, 0)),
          };
        }).filter((x): x is NonNullable<typeof x> => x !== null)
      : cashflow;

  const categories = new Map<string, number>();
  for (const t of inPeriod) {
    if (t.type === 'expense') {
      categories.set(t.category, round2((categories.get(t.category) ?? 0) + t.amount));
    }
  }

  const sellerUnits = new Map<string, number>();
  for (const order of periodOrders) {
    for (const item of order.items) {
      const key =
        item.variantLabel !== 'Default' ? `${item.productName} · ${item.variantLabel}` : item.productName;
      sellerUnits.set(key, (sellerUnits.get(key) ?? 0) + item.qty);
    }
  }
  const bestSeller = [...sellerUnits.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    revenue,
    expenses,
    profit: round2(revenue - expenses),
    revenueDelta: deltaRatio(revenue, prevRevenue),
    ordersCount: periodOrders.length,
    ordersDelta: deltaRatio(periodOrders.length, prevOrders.length),
    revenueTrend: cashflow.map((b) => b.moneyIn),
    moneyIn: revenue,
    moneyOut: expenses,
    cashflow: chartCashflow,
    expenseByCategory: [...categories.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    bestSeller: bestSeller ? { name: bestSeller[0], units: bestSeller[1] } : null,
  };
}
