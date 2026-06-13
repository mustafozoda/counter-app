import type { OrderWithPayments } from '@/api/orders';
import { lowStockProducts } from '@/features/products/filtering';
import { deriveInstallmentStatus } from '@/features/financing/schedule';
import type { ProductWithVariants } from '@/features/products/stock';
import type { AppNotification, FinancingPlan } from '@/types/models';

export interface NotificationSources {
  products: ProductWithVariants[];
  plans: FinancingPlan[];
  orders: OrderWithPayments[];
  now?: Date;
}

/**
 * Derive the in-app notification feed from live state. Notifications are
 * computed (not stored) so they always reflect reality; push delivery would
 * hook the same signals via expo-notifications in a backend-connected build.
 */
export function deriveNotifications({
  products,
  plans,
  orders,
  now = new Date(),
}: NotificationSources): AppNotification[] {
  const items: AppNotification[] = [];

  // Low / out of stock.
  const low = lowStockProducts(products);
  if (low.length > 0) {
    const lead = low[0]!;
    items.push({
      id: 'low-stock',
      type: 'low-stock',
      title: low.length === 1 ? 'A product is running low' : `${low.length} products need restocking`,
      body:
        low.length === 1
          ? `${lead.name} is low on stock.`
          : `${lead.name} and ${low.length - 1} more are low or out.`,
      read: false,
      createdAt: now.toISOString(),
    });
  }

  // Installments due / overdue across active plans.
  let overdue = 0;
  let dueSoon = 0;
  for (const plan of plans) {
    if (plan.status !== 'active') continue;
    for (const inst of plan.installments) {
      if (inst.paidAt) continue;
      const status = deriveInstallmentStatus(inst, now);
      if (status === 'overdue') overdue += 1;
      else if (status === 'due') dueSoon += 1;
    }
  }
  if (overdue > 0) {
    items.push({
      id: 'installments-overdue',
      type: 'installment-overdue',
      title: `${overdue} installment${overdue === 1 ? '' : 's'} overdue`,
      body: 'Reach out to customers with overdue payment plans.',
      read: false,
      createdAt: now.toISOString(),
    });
  }
  if (dueSoon > 0) {
    items.push({
      id: 'installments-due',
      type: 'installment-due',
      title: `${dueSoon} installment${dueSoon === 1 ? '' : 's'} due soon`,
      body: 'Payments are coming up within the week.',
      read: false,
      createdAt: now.toISOString(),
    });
  }

  // Most recent order.
  const latest = orders[0];
  if (latest) {
    items.push({
      id: `order-${latest.id}`,
      type: 'new-order',
      title: `Order ${latest.number}`,
      body: `${latest.items.length} item${latest.items.length === 1 ? '' : 's'} sold.`,
      read: false,
      createdAt: latest.createdAt,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
