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

export interface StaffHours {
  userId: string;
  minutes: number;
  lastSeen: string | null;
}

interface StaffHoursRow {
  user_id: string;
  minutes: number;
  last_seen: string | null;
}

/** Per-staff active minutes + last-seen for a period (owner-only RPC). */
export function useStaffHours(range: StatRange) {
  return useQuery({
    queryKey: ['staff-hours', range],
    queryFn: async (): Promise<StaffHours[]> => {
      const { data, error } = await supabase.rpc('staff_hours', {
        p_store_id: getActiveStoreId(),
        p_since: sinceFor(range),
      });
      if (error || !data) return [];
      return (data as StaffHoursRow[]).map((r) => ({
        userId: r.user_id,
        minutes: Number(r.minutes),
        lastSeen: r.last_seen,
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

export interface StaffOrder {
  id: string;
  number: string;
  total: number;
  createdAt: string;
}

interface OrderRow {
  id: string;
  number: string;
  total: number;
  created_at: string;
}

/** One staffer's recent sales (owner reads via member-level RLS). */
export function useStaffOrders(userId: string | null) {
  return useQuery({
    queryKey: ['staff-orders', userId],
    enabled: !!userId,
    queryFn: async (): Promise<StaffOrder[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('orders')
        .select('id, number, total, created_at')
        .eq('store_id', getActiveStoreId())
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      return ((data as OrderRow[] | null) ?? []).map((r) => ({
        id: r.id,
        number: r.number,
        total: Number(r.total),
        createdAt: r.created_at,
      }));
    },
  });
}

export interface StaffSession {
  id: string;
  startedAt: string;
  lastSeenAt: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  last_seen_at: string;
}

/** One staffer's recent login sessions (owner reads via `is_store_owner` RLS). */
export function useStaffSessions(userId: string | null) {
  return useQuery({
    queryKey: ['staff-session-log', userId],
    enabled: !!userId,
    queryFn: async (): Promise<StaffSession[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('staff_sessions')
        .select('id, started_at, last_seen_at')
        .eq('store_id', getActiveStoreId())
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20);
      return ((data as SessionRow[] | null) ?? []).map((r) => ({
        id: r.id,
        startedAt: r.started_at,
        lastSeenAt: r.last_seen_at,
      }));
    },
  });
}
