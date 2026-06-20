import { useRouter } from 'expo-router';
import { ChevronRight, ReceiptText } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { Badge, Card, EmptyState, Skeleton, Text } from '@/components/ui';
import { OrderDetailView } from '@/features/pos/components/order-detail-view';
import { useOrders } from '@/features/pos/hooks';
import { PAYMENT_METHOD_LABELS } from '@/features/pos/receipt';
import { cn } from '@/lib/cn';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useResponsiveValue } from '@/lib/responsive';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

/**
 * Desktop/tablet Orders: a master–detail split — the order list on the left and
 * the full order (pipeline, items, payment, refunds) on the right. Reuses
 * OrderDetailView so refunds and fulfilment behave exactly as on the phone.
 */
export function OrdersDesktop() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const listWidth = useResponsiveValue({ compact: 380, tablet: 340, laptop: 400, desktop: 440 });

  const ordersQuery = useOrders();
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  type OrderItem = (typeof orders)[number];

  // Keep a valid selection so the detail pane is never empty while orders exist.
  useEffect(() => {
    if (orders.length === 0) return;
    if (!selectedId || !orders.some((o) => o.id === selectedId)) {
      setSelectedId(orders[0]!.id);
    }
  }, [orders, selectedId]);

  const renderItem = ({ item: order }: { item: OrderItem }) => (
    <View
      className={cn(
        'rounded-xl border-2',
        selectedId === order.id ? 'border-primary' : 'border-transparent',
      )}
    >
      <Card
        padded={false}
        className="flex-row items-center gap-3 px-4 py-3.5"
        onPress={() => setSelectedId(order.id)}
      >
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="body" weight="semibold" tabular>
              {order.number}
            </Text>
            {order.paymentStatus === 'refunded' ? (
              <Badge label={t('orders.refunded')} tone="negative" />
            ) : order.paymentStatus === 'partial' ? (
              <Badge label={t('orders.partialRefund')} tone="caution" />
            ) : (
              <Badge
                label={order.payments
                  .map((p) => PAYMENT_METHOD_LABELS[p.method])
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(' + ')}
                tone="accent"
              />
            )}
          </View>
          <Text variant="caption" tone="tertiary">
            {formatDayLabel(new Date(order.createdAt))} ·{' '}
            {t('orders.items', { count: order.items.length })}
          </Text>
        </View>
        <Text variant="title" weight="semibold" tabular>
          {formatMoney(order.total, currency)}
        </Text>
        <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
      </Card>
    </View>
  );

  return (
    <View className="flex-1 flex-row bg-background">
      {/* Master list */}
      <View style={{ width: listWidth }} className="border-r border-hairline">
        <View className="px-4 pb-3 pt-3">
          <Text variant="h2" weight="bold">
            {t('orders.title')}
          </Text>
          {orders.length > 0 ? (
            <Text variant="caption" tone="tertiary">
              {t('orders.subtitle', { count: orders.length })}
            </Text>
          ) : null}
        </View>

        {ordersQuery.isLoading ? (
          <View className="gap-3 px-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={76} radius={16} />
            ))}
          </View>
        ) : (
          <FlatList
            data={orders}
            className="flex-1"
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={ReceiptText}
                title={t('orders.emptyTitle')}
                message={t('orders.emptyMessage')}
                actionLabel={t('orders.makeSale')}
                onAction={() => router.push('/sell')}
              />
            }
            renderItem={renderItem}
          />
        )}
      </View>

      {/* Detail pane */}
      <View className="min-w-0 flex-1">
        {selectedId && orders.length > 0 ? (
          <OrderDetailView id={selectedId} embedded />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <EmptyState
              icon={ReceiptText}
              title={t('orders.title')}
              message={t('orders.emptyMessage')}
            />
          </View>
        )}
      </View>
    </View>
  );
}
