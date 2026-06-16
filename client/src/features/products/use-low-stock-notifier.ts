import { useEffect } from 'react';

import { notifyLowStock } from '@/lib/notifications';

import { lowStockProducts } from './filtering';
import { useProducts } from './hooks';

/**
 * Fires a once-per-day local notification when the catalog has items at or
 * below their low-stock threshold. Mounted in the merchant tab layout so it
 * runs whenever the owner is in the app; dedup lives in `notifyLowStock`.
 */
export function useLowStockNotifier(): void {
  const { data } = useProducts();
  useEffect(() => {
    if (!data) return;
    const count = lowStockProducts(data).length;
    if (count > 0) void notifyLowStock(count);
  }, [data]);
}
