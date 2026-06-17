import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from '@/api/orders';
import { orderKeys } from '@/features/pos/hooks';
import type { Transaction } from '@/types/models';

// 'inventory' is intentionally NOT here: inventory purchases are recorded
// automatically by stock intake (Phase 3) and counted in cash flow only —
// adding them manually too would double-count. The label is kept below so
// existing/auto inventory transactions still render with a friendly name.
export const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'salaries',
  'marketing',
  'supplies',
  'other',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Sales',
  installments: 'Installments',
  refunds: 'Refunds',
  inventory: 'Inventory',
  rent: 'Rent',
  utilities: 'Utilities',
  salaries: 'Salaries',
  marketing: 'Marketing',
  supplies: 'Supplies',
  other: 'Other',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export function useTransactions() {
  return useQuery({
    queryKey: orderKeys.transactions,
    queryFn: () => ordersApi.listTransactions(),
  });
}

export function useAddExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      category: string;
      amount: number;
      note: string;
      receiptUri: string | null;
    }) =>
      ordersApi.addTransaction({
        type: 'expense',
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: new Date().toISOString(),
        linkedOrderId: null,
        receiptUri: input.receiptUri,
      } satisfies Omit<Transaction, 'id'>),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: orderKeys.transactions }),
  });
}
