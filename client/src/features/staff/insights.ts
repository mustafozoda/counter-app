import { useQuery } from '@tanstack/react-query';

import { getActiveStoreId } from '@/lib/active-store';
import { supabase } from '@/lib/supabase';

export type StatRange = 'today' | '7d' | '30d' | 'all';

function sinceFor(range: StatRange): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === '7d') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

export interface StaffSales {
  userId: string;
  salesCount: number;
  revenue: number;
}

interface StaffSalesRow {
  user_id: string;
  sales_count: number;
  revenue: number;
}

/** Per-staff sales totals for a period (owner-only RPC). */
export function useStaffSales(range: StatRange) {
  return useQuery({
    queryKey: ['staff-sales', range],
    queryFn: async (): Promise<StaffSales[]> => {
      const { data, error } = await supabase.rpc('staff_sales_stats', {
        p_store_id: getActiveStoreId(),
        p_since: sinceFor(range),
      });
      if (error || !data) return [];
      return (data as StaffSalesRow[]).map((r) => ({
        userId: r.user_id,
        salesCount: Number(r.sales_count),
        revenue: Number(r.revenue),
      }));
    },
  });
}

export interface ActivityEntry {
  id: string;
  /** 'sale' | 'refund' | 'restock' | 'adjustment' | 'return' */
  kind: string;
  actorId: string | null;
  actorName: string | null;
  summary: string;
  amount: number;
  createdAt: string;
}

interface ActivityRow {
  id: string;
  kind: string;
  actor_id: string | null;
  actor_name: string | null;
  summary: string;
  amount: number;
  created_at: string;
}

/** The store's recent history feed — sales, refunds, stock changes (owner-only). */
export function useActivity() {
  return useQuery({
    queryKey: ['store-activity'],
    queryFn: async (): Promise<ActivityEntry[]> => {
      const { data, error } = await supabase.rpc('store_activity', {
        p_store_id: getActiveStoreId(),
        p_limit: 100,
      });
      if (error || !data) return [];
      return (data as ActivityRow[]).map((r) => ({
        id: r.id,
        kind: r.kind,
        actorId: r.actor_id,
        actorName: r.actor_name,
        summary: r.summary,
        amount: Number(r.amount),
        createdAt: r.created_at,
      }));
    },
  });
}

export const MONEY_KINDS = ['sale', 'refund'];
