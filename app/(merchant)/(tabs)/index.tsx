import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarClock,
  PackageSearch,
  Trophy,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Card,
  CurrencyText,
  IconButton,
  Logo,
  Screen,
  SegmentedControl,
  Skeleton,
  Sparkline,
  StatCard,
  Text,
} from '@/components/ui';
import { summarize, type FinancePeriod } from '@/features/finance/aggregate';
import { useTransactions } from '@/features/finance/hooks';
import { usePlans } from '@/features/financing/hooks';
import { summarizeFinancing } from '@/features/financing/schedule';
import { useOrders } from '@/features/pos/hooks';
import { lowStockProducts } from '@/features/products/filtering';
import { useProducts } from '@/features/products/hooks';
import { formatCompact } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { STAGGER_MS, useTheme } from '@/theme';

function greetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'home.greetingNight';
  if (hour < 12) return 'home.greetingMorning';
  if (hour < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

const PERIOD_LABEL_KEY: Record<FinancePeriod, string> = {
  today: 'home.salesToday',
  week: 'home.salesWeek',
  month: 'home.salesMonth',
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const store = useStoreProfile((s) => s.store);
  const [period, setPeriod] = useState<FinancePeriod>('today');

  const periodOptions: { label: string; value: FinancePeriod }[] = [
    { label: t('home.today'), value: 'today' },
    { label: t('home.week'), value: 'week' },
    { label: t('home.month'), value: 'month' },
  ];

  const productsQuery = useProducts();
  const ordersQuery = useOrders();
  const transactionsQuery = useTransactions();

  const currency = store?.currencyCode ?? 'TJS';
  const summary = useMemo(
    () => summarize(transactionsQuery.data ?? [], ordersQuery.data ?? [], period),
    [transactionsQuery.data, ordersQuery.data, period],
  );
  const lowStockCount = useMemo(
    () => lowStockProducts(productsQuery.data ?? []).length,
    [productsQuery.data],
  );
  const plansQuery = usePlans();
  const financing = useMemo(() => summarizeFinancing(plansQuery.data ?? []), [plansQuery.data]);

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
            {t(greetingKey())}
          </Text>
          <Text variant="h1" weight="bold" className="mt-0.5">
            {store?.name ?? t('home.yourStore')}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={Bell}
            accessibilityLabel={t('more.title')}
            onPress={() => router.push('/notifications')}
          />
          <Logo size={44} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
        </View>
      </Animated.View>

      <Animated.View entering={enter(1)} className="mt-6">
        <SegmentedControl options={periodOptions} value={period} onChange={setPeriod} />
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
              label={t(PERIOD_LABEL_KEY[period])}
              value={summary.revenue}
              currency={currency}
              delta={summary.revenueDelta ?? undefined}
              sparkline={summary.revenueTrend}
              onPress={() => router.push('/finance')}
            />
          </Animated.View>

          <Animated.View entering={enter(3)} className="mt-3 flex-row gap-3">
            <StatCard
              label={t('home.orders')}
              value={summary.ordersCount}
              delta={summary.ordersDelta ?? undefined}
              className="flex-1"
              onPress={() => router.push('/orders')}
            />
            <Card className="flex-1 justify-between gap-2" onPress={() => router.push('/low-stock')}>
              <View className="flex-row items-center justify-between">
                <Text variant="caption" weight="medium" tone="secondary">
                  {t('home.lowStock')}
                </Text>
                <View className="h-8 w-8 items-center justify-center rounded-full bg-caution-tint">
                  <PackageSearch size={16} color={colors.caution} strokeWidth={2} />
                </View>
              </View>
              <Text variant="displaySm" weight="semibold" tabular>
                {formatCompact(lowStockCount)}
              </Text>
              <Text variant="micro" tone="tertiary">
                {lowStockCount === 0 ? t('home.allStockedUp') : t('home.needRestock')}
              </Text>
            </Card>
          </Animated.View>

          <Animated.View entering={enter(4)} className="mt-3">
            <Card onPress={() => router.push('/finance')} className="gap-4">
              <View className="flex-row items-center justify-between">
                <Text variant="caption" weight="medium" tone="secondary">
                  {t('home.cashFlow')}
                </Text>
                <Sparkline data={summary.revenueTrend} width={104} height={30} tone="primary" />
              </View>
              <View className="flex-row gap-6">
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <ArrowDownLeft size={14} color={colors.positive} strokeWidth={2.5} />
                    <Text variant="micro" weight="medium" tone="tertiary">
                      {t('home.moneyIn')}
                    </Text>
                  </View>
                  <CurrencyText amount={summary.moneyIn} currency={currency} variant="h2" tone="positive" animated />
                </View>
                <View className="w-px bg-hairline" />
                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-1.5">
                    <ArrowUpRight size={14} color={colors.negative} strokeWidth={2.5} />
                    <Text variant="micro" weight="medium" tone="tertiary">
                      {t('home.moneyOut')}
                    </Text>
                  </View>
                  <CurrencyText amount={summary.moneyOut} currency={currency} variant="h2" tone="negative" animated />
                </View>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={enter(5)} className="mt-3 flex-row gap-3">
            <Card className="flex-1 gap-2" onPress={() => router.push('/financing')}>
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  financing.overdueCount > 0 ? 'bg-negative-tint' : 'bg-primary-tint'
                }`}
              >
                <CalendarClock
                  size={16}
                  color={financing.overdueCount > 0 ? colors.negative : colors.primary}
                  strokeWidth={2}
                />
              </View>
              <Text variant="caption" weight="medium" tone="secondary">
                {t('home.installmentsDue')}
              </Text>
              {financing.dueSoonCount > 0 ? (
                <View className="flex-row items-baseline gap-2">
                  <Text variant="h2" weight="semibold" tabular>
                    {financing.dueSoonCount}
                  </Text>
                  <CurrencyText
                    amount={financing.dueSoonAmount}
                    currency={currency}
                    variant="caption"
                    tone="secondary"
                  />
                </View>
              ) : (
                <Text variant="caption" tone="tertiary">
                  {financing.activePlans > 0 ? t('home.allOnSchedule') : t('home.noActivePlans')}
                </Text>
              )}
            </Card>
            <Card
              className="flex-1 gap-2"
              onPress={() => router.push('/reports')}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-positive-tint">
                <Trophy size={16} color={colors.positive} strokeWidth={2} />
              </View>
              <Text variant="caption" weight="medium" tone="secondary">
                {t('home.bestSeller')}
              </Text>
              {summary.bestSeller ? (
                <>
                  <Text variant="body" weight="semibold" numberOfLines={2}>
                    {summary.bestSeller.name}
                  </Text>
                  <Text variant="micro" tone="tertiary">
                    {t('home.sold', { count: summary.bestSeller.units })}
                  </Text>
                </>
              ) : (
                <Text variant="caption" tone="tertiary">
                  {t('home.noSalesYet')}
                </Text>
              )}
            </Card>
          </Animated.View>
        </>
      )}
    </Screen>
  );
}
