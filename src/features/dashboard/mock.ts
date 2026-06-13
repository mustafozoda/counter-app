/**
 * Typed mock data for the dashboard preview. Shaped exactly like the
 * aggregates the finance/orders modules will compute in Phases 3–4, so the
 * Home screen swaps to live queries without UI changes.
 */
export type DashboardPeriod = 'today' | 'week' | 'month';

export interface DashboardSnapshot {
  revenue: number;
  /** Versus previous period, as a ratio. */
  revenueDelta: number;
  revenueTrend: number[];
  orders: number;
  ordersDelta: number;
  moneyIn: number;
  moneyOut: number;
  cashflowTrend: number[];
  lowStockCount: number;
  installmentsDueCount: number;
  installmentsDueAmount: number;
  bestSeller: { name: string; units: number };
}

export const PERIOD_OPTIONS: { label: string; value: DashboardPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

export const mockDashboard: Record<DashboardPeriod, DashboardSnapshot> = {
  today: {
    revenue: 1284.5,
    revenueDelta: 0.124,
    revenueTrend: [12, 18, 14, 32, 26, 41, 38, 54],
    orders: 23,
    ordersDelta: 0.045,
    moneyIn: 1284.5,
    moneyOut: 312.4,
    cashflowTrend: [8, 14, 11, 21, 18, 28, 24, 35],
    lowStockCount: 4,
    installmentsDueCount: 3,
    installmentsDueAmount: 86,
    bestSeller: { name: 'Dino Hoodie · 2–4y', units: 6 },
  },
  week: {
    revenue: 8412.75,
    revenueDelta: 0.082,
    revenueTrend: [120, 145, 130, 180, 165, 210, 232],
    orders: 142,
    ordersDelta: -0.021,
    moneyIn: 8412.75,
    moneyOut: 2904.1,
    cashflowTrend: [90, 110, 85, 140, 120, 160, 185],
    lowStockCount: 4,
    installmentsDueCount: 9,
    installmentsDueAmount: 412,
    bestSeller: { name: 'Dino Hoodie · 2–4y', units: 31 },
  },
  month: {
    revenue: 31908.2,
    revenueDelta: 0.193,
    revenueTrend: [520, 610, 540, 720, 680, 850, 790, 940, 880, 1020],
    orders: 567,
    ordersDelta: 0.117,
    moneyIn: 31908.2,
    moneyOut: 11240.6,
    cashflowTrend: [400, 470, 430, 560, 520, 640, 600, 730, 690, 800],
    lowStockCount: 4,
    installmentsDueCount: 21,
    installmentsDueAmount: 1630,
    bestSeller: { name: 'Rainbow Tutu Dress · 4–6y', units: 87 },
  },
};
