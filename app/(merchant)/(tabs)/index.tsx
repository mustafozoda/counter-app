import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  PackageSearch,
  Trophy,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Card,
  CurrencyText,
  Logo,
  Screen,
  SegmentedControl,
  Skeleton,
  Sparkline,
  StatCard,
  Text,
} from '@/components/ui';
import { PERIOD_OPTIONS, summarize, type FinancePeriod } from '@/features/finance/aggregate';
import { useTransactions } from '@/features/finance/hooks';
import { useOrders } from '@/features/pos/hooks';
import { lowStockProducts } from '@/features/products/filtering';
import { useProducts } from '@/features/products/hooks';
import { formatCompact } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { STAGGER_MS, useTheme } from '@/theme';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const PERIOD_LABEL: Record<FinancePeriod, string> = {
  today: "Today's sales",
  week: 'Sales this week',
  month: 'Sales this month',
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const store = useStoreProfile((s) => s.store);
  const [period, setPeriod] = useState<FinancePeriod>('today');

  const productsQuery = useProducts();
  const ordersQuery = useOrders();
  const transactionsQuery = useTransactions();

  const currency = store?.currencyCode ?? 'USD';
  const summary = useMemo(
    () => summarize(transactionsQuery.data ?? [], ordersQuery.data ?? [], period),
    [transactionsQuery.data, ordersQuery.data, period],
  );
  const lowStockCount = useMemo(
    () => lowStockProducts(productsQuery.data ?? []).length,
    [productsQuery.data],
  );

  const loading = productsQuery.isLoading || ordersQuery.isLoading || transactionsQuery.isLoading;
  const enter = (index: number) =>
    FadeInDown.delay(STAGGER_MS * index)
      .springify()
      .damping(18);

  return (
    <Screen scroll tabbed>
      <Animated.View entering={enter(0)} className="mt-2 flex-row items-center justify-between">
        <View>
          <Text variant="caption" tone="secondary">
            {greeting()}
          </Text>
          <Text variant="h1" weight="bold" className="mt-0.5">
            {store?.name ?? 'Your store'}
          </Text>
        </View>
        <Logo size={44} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
      </Animated.View>

      <Animated.View entering={enter(1)} className="mt-6">
        <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
      </Animated.View>

      {loading ? (
        <View className="mt-5 gap-3">
          <Skeleton height={150} radius={24} />
          <View className="flex-row gap-3">
            <Skeleton height={130} radius={24} className="flex-1" />
            <Skeleton height={130} radius={24} className="flex-1" />
          </View>
        </View>
      ) : (
        <>
          <Animated.View entering={enter(2)} className="mt-5">
            <StatCard
              label={PERIOD_LABEL[period]}
              value={summary.revenue}
              currency={currency}
              delta={summary.revenueDelta ?? undefined}
              sparkline={summary.revenueTrend}
              onPress={() => router.push('/finance')}
            />
          </Animated.View>

          <Animated.View entering={enter(3)} className="mt-3 flex-row gap-3">
            <StatCard
              label="Orders"
              value={summary.ordersCount}
              delta={summary.ordersDelta ?? undefined}
              className="flex-1"
              onPress={() => router.push('/orders')}
            />
            <Card className="flex-1 justify-between gap-2" onPress={() => router.push('/low-stock')}>
              <View className="flex-row items-center justify-between">
                <Text variant="caption" weight="medium" tone="secondary">
                  Low stock
                </Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-caution-tint">
                  <PackageSearch size={16} color={colors.caution} strokeWidth={2} />
                </View>
              </View>
              <Text variant="displaySm" weight="semibold" tabular>
                {formatCompact(lowStockCount)}
              </Text>
              <Text variant="micro" tone="tertiary">
                {lowStockCount === 0 ? 'all stocked up' : 'items need a restock'}
              </Text>
            </Card>
          </Animated.View>

          <Animated.View entering={enter(4)} className="mt-3">
            <Card onPress={() => router.push('/finance')} className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text variant="caption" weight="medium" tone="secondary">
                  Cash flow
                </Text>
                <Sparkline data={summary.revenueTrend} width={104} height={30} tone="primary" />
              </View>
              <View className="flex-row gap-6">
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <ArrowDownLeft size={14} color={colors.positive} strokeWidth={2.5} />
                    <Text variant="micro" weight="medium" tone="tertiary">
                      MONEY IN
                    </Text>
                  </View>
                  <CurrencyText amount={summary.moneyIn} currency={currency} variant="h2" tone="positive" animated />
                </View>
                <View className="w-px bg-hairline" />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <ArrowUpRight size={14} color={colors.negative} strokeWidth={2.5} />
                    <Text variant="micro" weight="medium" tone="tertiary">
                      MONEY OUT
                    </Text>
                  </View>
                  <CurrencyText amount={summary.moneyOut} currency={currency} variant="h2" tone="negative" animated />
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={enter(5)} className="mt-3 flex-row gap-3">
            <Card
              className="flex-1 gap-2"
              onPress={() => toast.info('Financing is on the way', 'Arrives with Phase 5.')}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-tint">
                <CalendarClock size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text variant="caption" weight="medium" tone="secondary">
                Installments due
              </Text>
              <Text variant="h2" weight="semibold" tone="tertiary">
                —
              </Text>
            </Card>
            <Card className="flex-1 gap-2" onPress={() => toast.info('Analytics is on the way', 'Arrives with Phase 6.')}>
              <View className="h-8 w-8 items-center justify-center rounded-full bg-positive-tint">
                <Trophy size={16} color={colors.positive} strokeWidth={2} />
              </View>
              <Text variant="caption" weight="medium" tone="secondary">
                Best seller
              </Text>
              {summary.bestSeller ? (
                <>
                  <Text variant="body" weight="semibold" numberOfLines={2}>
                    {summary.bestSeller.name}
                  </Text>
                  <Text variant="micro" tone="tertiary">
                    {summary.bestSeller.units} sold
                  </Text>
                </>
              ) : (
                <Text variant="caption" tone="tertiary">
                  No sales in this period yet
                </Text>
              )}
            </Card>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
