import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  generateSchedule,
  type Frequency,
  type InstallmentDraft,
} from '@/features/financing/schedule';
import { createLocalId } from '@/lib/id';
import type { FinancingPlan, Id, Installment } from '@/types/models';

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

export const financingApi: FinancingApi = new LocalFinancingApi();
