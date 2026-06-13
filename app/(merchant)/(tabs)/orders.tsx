import { useRouter } from 'expo-router';
import { ChevronRight, ReceiptText } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge, Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { useOrders } from '@/features/pos/hooks';
import { PAYMENT_METHOD_LABELS } from '@/features/pos/receipt';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

export default function OrdersScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const ordersQuery = useOrders();
  const orders = ordersQuery.data ?? [];

  return (
    <Screen scroll tabbed>
      <View className="mt-2">
        <Text variant="h1" weight="bold">
          Orders
        </Text>
        {orders.length > 0 ? (
          <Text variant="caption" tone="tertiary">
            {orders.length} so far — the full pipeline (statuses, refunds, returns) arrives with
            Phase 3
          </Text>
        ) : null}
      </View>

      {ordersQuery.isLoading ? (
        <View className="mt-5 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} radius={20} />
          ))}
        </View>
      ) : orders.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={ReceiptText}
            title="No orders yet"
            message="Ring up your first sale and it will land here with its receipt."
            actionLabel="Make a sale"
            onAction={() => router.push('/sell')}
          />
        </View>
      ) : (
        <View className="mt-5 gap-3">
          {orders.map((order, index) => (
            <Animated.View
              key={order.id}
              entering={FadeInDown.delay(Math.min(index, 10) * 35).springify().damping(18)}
            >
              <Card
                padded={false}
                className="flex-row items-center gap-3 px-4 py-3.5"
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              >
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" weight="semibold" tabular>
                      {order.number}
                    </Text>
                    {order.paymentStatus === 'refunded' ? (
                      <Badge label="Refunded" tone="negative" />
                    ) : order.paymentStatus === 'partial' ? (
                      <Badge label="Partial refund" tone="caution" />
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
                    {formatDayLabel(new Date(order.createdAt))} · {order.items.length} item
                    {order.items.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text variant="title" weight="semibold" tabular>
                  {formatMoney(order.total, currency)}
                </Text>
                <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
              </Card>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}
