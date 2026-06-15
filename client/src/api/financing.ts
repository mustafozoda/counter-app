import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  generateSchedule,
  type Frequency,
  type InstallmentDraft,
} from '@/features/financing/schedule';
import { getActiveStoreId } from '@/lib/active-store';
import { createLocalId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { FinancingPlan, FinancingPlanStatus, Id, Installment, InstallmentStatus } from '@/types/models';

import { ordersApi } from './orders';

export interface CreatePlanInput {
  orderId: Id;
  customerId: Id;
  principal: number;
  downPayment: number;
  count: number;
  frequency: Frequency;
}

export interface FinancingApi {
  createPlan(input: CreatePlanInput): Promise<FinancingPlan>;
  listPlans(): Promise<FinancingPlan[]>;
  getPlan(id: Id): Promise<FinancingPlan | null>;
  /** Records the income transaction and completes the plan when fully paid. */
  markInstallmentPaid(planId: Id, installmentId: Id): Promise<FinancingPlan>;
  cancelPlan(id: Id): Promise<void>;
}

interface FinancingDoc {
  v: 1;
  plans: FinancingPlan[];
}

const STORAGE_KEY = 'counter.financing.v1';

export class LocalFinancingApi implements FinancingApi {
  private doc: FinancingDoc | null = null;
  private loading: Promise<FinancingDoc> | null = null;

  private async load(): Promise<FinancingDoc> {
    if (this.doc) return this.doc;
    this.loading ??= (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      this.doc = raw ? (JSON.parse(raw) as FinancingDoc) : { v: 1, plans: [] };
      return this.doc;
    })();
    return this.loading;
  }

  private async save(): Promise<void> {
    if (this.doc) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.doc));
  }

  async createPlan(input: CreatePlanInput): Promise<FinancingPlan> {
    const doc = await this.load();
    const planId = createLocalId();
    const drafts: InstallmentDraft[] = generateSchedule(
      input.principal,
      input.downPayment,
      input.count,
      input.frequency,
    );
    const installments: Installment[] = drafts.map((d) => ({
      id: createLocalId(),
      planId,
      number: d.number,
      dueDate: d.dueDate,
      amount: d.amount,
      paidAt: null,
      status: 'upcoming',
    }));

    const plan: FinancingPlan = {
      id: planId,
      orderId: input.orderId,
      customerId: input.customerId,
      principal: input.principal,
      downPayment: input.downPayment,
      installments,
      frequency: input.frequency,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    doc.plans.push(plan);
    await this.save();
    return plan;
  }

  async listPlans(): Promise<FinancingPlan[]> {
    const doc = await this.load();
    return [...doc.plans].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getPlan(id: Id): Promise<FinancingPlan | null> {
    const doc = await this.load();
    return doc.plans.find((p) => p.id === id) ?? null;
  }

  async markInstallmentPaid(planId: Id, installmentId: Id): Promise<FinancingPlan> {
    const doc = await this.load();
    const plan = doc.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    const installment = plan.installments.find((i) => i.id === installmentId);
    if (!installment) throw new Error('Installment not found');
    if (installment.paidAt) return plan;

    installment.paidAt = new Date().toISOString();
    installment.status = 'paid';

    if (plan.installments.every((i) => i.paidAt !== null)) {
      plan.status = 'completed';
    }
    await this.save();

    await ordersApi.addTransaction({
      type: 'income',
      category: 'installments',
      amount: installment.amount,
      note: `Installment ${installment.number}/${plan.installments.length}`,
      date: installment.paidAt,
      linkedOrderId: plan.orderId,
    });

    return plan;
  }

  async cancelPlan(id: Id): Promise<void> {
    const doc = await this.load();
    const plan = doc.plans.find((p) => p.id === id);
    if (!plan) return;
    plan.status = 'cancelled';
    await this.save();
  }
}

// ---------------------------------------------------------------------------
// Supabase implementation
// ---------------------------------------------------------------------------

interface InstallmentRow {
  id: string;
  plan_id: string;
  number: number;
  due_date: string;
  amount: number;
  paid_at: string | null;
  status: InstallmentStatus;
}

interface PlanRow {
  id: string;
  order_id: string;
  customer_id: string;
  principal: number;
  down_payment: number;
  frequency: Frequency;
  status: FinancingPlanStatus;
  created_at: string;
  installments?: InstallmentRow[];
}

const toInstallment = (row: InstallmentRow): Installment => ({
  id: row.id,
  planId: row.plan_id,
  number: row.number,
  dueDate: row.due_date,
  amount: Number(row.amount),
  paidAt: row.paid_at,
  status: row.status,
});

const toPlan = (row: PlanRow): FinancingPlan => ({
  id: row.id,
  orderId: row.order_id,
  customerId: row.customer_id,
  principal: Number(row.principal),
  downPayment: Number(row.down_payment),
  installments: (row.installments ?? []).map(toInstallment).sort((a, b) => a.number - b.number),
  frequency: row.frequency,
  status: row.status,
  createdAt: row.created_at,
});

const PLAN_SELECT = '*, installments(*)';

export class SupabaseFinancingApi implements FinancingApi {
  async createPlan(input: CreatePlanInput): Promise<FinancingPlan> {
    const storeId = getActiveStoreId();
    const { data, error } = await supabase
      .from('financing_plans')
      .insert({
        store_id: storeId,
        order_id: input.orderId,
        customer_id: input.customerId,
        principal: input.principal,
        down_payment: input.downPayment,
        frequency: input.frequency,
        status: 'active',
      })
      .select('id')
      .single();
    if (error) throw error;
    const planId = (data as { id: string }).id;

    const drafts: InstallmentDraft[] = generateSchedule(
      input.principal,
      input.downPayment,
      input.count,
      input.frequency,
    );
    const rows = drafts.map((d) => ({
      store_id: storeId,
      plan_id: planId,
      number: d.number,
      due_date: d.dueDate,
      amount: d.amount,
      paid_at: null,
      status: 'upcoming' as InstallmentStatus,
    }));
    const { error: insErr } = await supabase.from('installments').insert(rows);
    if (insErr) throw insErr;

    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('Plan not found after create');
    return plan;
  }

  async listPlans(): Promise<FinancingPlan[]> {
    const { data, error } = await supabase
      .from('financing_plans')
      .select(PLAN_SELECT)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as PlanRow[]).map(toPlan);
  }

  async getPlan(id: Id): Promise<FinancingPlan | null> {
    const { data, error } = await supabase
      .from('financing_plans')
      .select(PLAN_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPlan(data as PlanRow) : null;
  }

  async markInstallmentPaid(planId: Id, installmentId: Id): Promise<FinancingPlan> {
    const { error } = await supabase.rpc('mark_installment_paid', {
      p_plan_id: planId,
      p_installment_id: installmentId,
    });
    if (error) throw error;
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('Plan not found after payment');
    return plan;
  }

  async cancelPlan(id: Id): Promise<void> {
    const { error } = await supabase
      .from('financing_plans')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  }
}

export const financingApi: FinancingApi = isSupabaseConfigured
  ? new SupabaseFinancingApi()
  : new LocalFinancingApi();
