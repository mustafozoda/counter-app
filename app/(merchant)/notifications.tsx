import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BellOff,
  CalendarClock,
  PackageSearch,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card, EmptyState, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { usePlans } from '@/features/financing/hooks';
import { deriveNotifications } from '@/features/notifications/derive';
import { useOrders } from '@/features/pos/hooks';
import { useProducts } from '@/features/products/hooks';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme';
import type { NotificationType } from '@/types/models';

const ICONS: Record<NotificationType, LucideIcon> = {
  'low-stock': PackageSearch,
  'new-order': ReceiptText,
  'installment-due': CalendarClock,
  'installment-overdue': CalendarClock,
  'daily-summary': ReceiptText,
};

const TONE: Record<NotificationType, { bg: string; fg: keyof ReturnType<typeof useTheme>['colors'] }> = {
  'low-stock': { bg: 'bg-caution-tint', fg: 'caution' },
  'new-order': { bg: 'bg-positive-tint', fg: 'positive' },
  'installment-due': { bg: 'bg-primary-tint', fg: 'primary' },
  'installment-overdue': { bg: 'bg-negative-tint', fg: 'negative' },
  'daily-summary': { bg: 'bg-info-tint', fg: 'info' },
};

const ROUTE: Partial<Record<NotificationType, string>> = {
  'low-stock': '/low-stock',
  'new-order': '/orders',
  'installment-due': '/financing',
  'installment-overdue': '/financing',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const productsQuery = useProducts();
  const plansQuery = usePlans();
  const ordersQuery = useOrders();

  const loading = productsQuery.isLoading || plansQuery.isLoading || ordersQuery.isLoading;
  const notifications = useMemo(
    () =>
      deriveNotifications({
        products: productsQuery.data ?? [],
        plans: plansQuery.data ?? [],
        orders: ordersQuery.data ?? [],
      }),
    [productsQuery.data, plansQuery.data, ordersQuery.data],
  );

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="h1" weight="bold">
          Notifications
        </Text>
      </View>

      {loading ? (
        <View className="gap-3 px-5 pt-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} radius={20} />
          ))}
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 justify-center pb-16">
          <EmptyState
            icon={BellOff}
            title="You're all caught up"
            message="Low stock, new orders and installment reminders will show up here."
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-5 pb-16 pt-3" showsVerticalScrollIndicator={false}>
          {notifications.map((notification, index) => {
            const Icon = ICONS[notification.type];
            const tone = TONE[notification.type];
            const route = ROUTE[notification.type];
            return (
              <Animated.View
                key={notification.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <Card
                  padded={false}
                  className="flex-row items-center gap-3 px-4 py-3.5"
                  onPress={route ? () => router.push(route as Parameters<typeof router.push>[0]) : undefined}
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-full ${tone.bg}`}>
                    <Icon size={18} color={colors[tone.fg]} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text variant="body" weight="semibold">
                      {notification.title}
                    </Text>
                    <Text variant="caption" tone="tertiary" numberOfLines={2}>
                      {notification.body}
                    </Text>
                    <Text variant="micro" tone="tertiary" className="mt-0.5">
                      {formatDateTime(new Date(notification.createdAt))}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            );
          })}
          <Text variant="micro" tone="tertiary" className="mt-2 text-center">
            Push delivery activates when connected to a backend.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}
