import { startOfDay, subDays } from 'date-fns';

import type { Order } from '@/types/models';

export interface ProductPerformance {
  name: string;
  units: number;
  revenue: number;
}

export interface DayBucket {
  label: string;
  revenue: number;
}

export interface HourActivity {
  hour: number;
  orders: number;
}

export interface AnalyticsReport {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  bestSellers: ProductPerformance[];
  slowMovers: ProductPerformance[];
  revenueByDay: DayBucket[];
  peakHours: HourActivity[];
  /** Busiest hour of day, or null when there are no orders. */
  peakHour: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Sales analytics over the last `days` (default 30). Excludes fully refunded
 * orders. Pure and deterministic for testing.
 */
export function analyze(orders: Order[], days = 30, now: Date = new Date()): AnalyticsReport {
  const since = startOfDay(subDays(now, days - 1)).getTime();
  const live = orders.filter(
    (o) => o.paymentStatus !== 'refunded' && new Date(o.createdAt).getTime() >= since,
  );

  const totalRevenue = round2(live.reduce((sum, o) => sum + o.total, 0));
  const totalOrders = live.length;

  // Product performance.
  const perf = new Map<string, ProductPerformance>();
  for (const order of live) {
    for (const item of order.items) {
      const key =
        item.variantLabel !== 'Default'
          ? `${item.productName} · ${item.variantLabel}`
          : item.productName;
      const entry = perf.get(key) ?? { name: key, units: 0, revenue: 0 };
      entry.units += item.qty;
      entry.revenue = round2(entry.revenue + item.lineTotal);
      perf.set(key, entry);
    }
  }
  const ranked = [...perf.values()].sort((a, b) => b.units - a.units);

  // Revenue by day.
  const dayTotals = new Map<string, number>();
  for (let d = 0; d < days; d++) {
    const date = startOfDay(subDays(now, days - 1 - d));
    dayTotals.set(`${date.getMonth() + 1}/${date.getDate()}`, 0);
  }
  for (const order of live) {
    const date = startOfDay(new Date(order.createdAt));
    const key = `${date.getMonth() + 1}/${date.getDate()}`;
    if (dayTotals.has(key)) dayTotals.set(key, round2(dayTotals.get(key)! + order.total));
  }

  // Peak hours.
  const hourCounts = new Array(24).fill(0) as number[];
  for (const order of live) {
    const hour = new Date(order.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  }
  const peakHours: HourActivity[] = hourCounts.map((orders, hour) => ({ hour, orders }));
  const peakHour =
    totalOrders > 0 ? peakHours.reduce((best, h) => (h.orders > best.orders ? h : best)).hour : null;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? round2(totalRevenue / totalOrders) : 0,
    bestSellers: ranked.slice(0, 5),
    slowMovers: [...ranked].reverse().slice(0, 5),
    revenueByDay: [...dayTotals.entries()].map(([label, revenue]) => ({ label, revenue })),
    peakHours,
    peakHour,
  };
}

/** Friendly label for an hour-of-day, e.g. 14 → "2 PM". */
export function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}
