import { ArrowDownLeft, ArrowUpRight, CalendarClock, PackageSearch, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Card,
  CurrencyText,
  Logo,
  Screen,
  SegmentedControl,
  Sparkline,
  StatCard,
  Text,
} from '@/components/ui';
import {
  PERIOD_OPTIONS,
  mockDashboard,
  type DashboardPeriod,
} from '@/features/dashboard/mock';
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

const comingSoon = (feature: string, phase: string) => () =>
  toast.info(`${feature} is on the way`, `Arrives with ${phase}.`);

export default function HomeScreen() {
  const { colors } = useTheme();
  const store = useStoreProfile((s) => s.store);
  const [period, setPeriod] = useState<DashboardPeriod>('today');

  const currency = store?.currencyCode ?? 'USD';
  const snapshot = mockDashboard[period];
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

      <Animated.View entering={enter(2)} className="mt-5">
        <StatCard
          label={period === 'today' ? "Today's sales" : period === 'week' ? 'Sales this week' : 'Sales this month'}
          value={snapshot.revenue}
          currency={currency}
          delta={snapshot.revenueDelta}
          sparkline={snapshot.revenueTrend}
          onPress={comingSoon('Finance', 'Phase 4')}
        />
      </Animated.View>

      <Animated.View entering={enter(3)} className="mt-3 flex-row gap-3">
        <StatCard
          label="Orders"
          value={snapshot.orders}
          delta={snapshot.ordersDelta}
          className="flex-1"
          onPress={comingSoon('Orders', 'Phase 3')}
        />
        <Card
          className="flex-1 justify-between gap-2"
          onPress={comingSoon('Inventory', 'Phase 1')}
        >
          <View className="flex-row items-center justify-between">
            <Text variant="caption" weight="medium" tone="secondary">
              Low stock
            </Text>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-caution-tint">
              <PackageSearch size={16} color={colors.caution} strokeWidth={2} />
            </View>
          </View>
          <Text variant="displaySm" weight="semibold" tabular>
            {formatCompact(snapshot.lowStockCount)}
          </Text>
          <Text variant="micro" tone="tertiary">
            items need a restock
          </Text>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(4)} className="mt-3">
        <Card onPress={comingSoon('Cash flow', 'Phase 4')} className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text variant="caption" weight="medium" tone="secondary">
              Cash flow
            </Text>
            <Sparkline data={snapshot.cashflowTrend} width={104} height={30} tone="primary" />
          </View>
          <View className="flex-row gap-6">
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <ArrowDownLeft size={14} color={colors.positive} strokeWidth={2.5} />
                <Text variant="micro" weight="medium" tone="tertiary">
                  MONEY IN
                </Text>
              </View>
              <CurrencyText amount={snapshot.moneyIn} currency={currency} variant="h2" tone="positive" animated />
            </View>
            <View className="w-px bg-hairline" />
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-1.5">
                <ArrowUpRight size={14} color={colors.negative} strokeWidth={2.5} />
                <Text variant="micro" weight="medium" tone="tertiary">
                  MONEY OUT
                </Text>
              </View>
              <CurrencyText amount={snapshot.moneyOut} currency={currency} variant="h2" tone="negative" animated />
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(5)} className="mt-3 flex-row gap-3">
        <Card className="flex-1 gap-2" onPress={comingSoon('Financing', 'Phase 5')}>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-tint">
            <CalendarClock size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <Text variant="caption" weight="medium" tone="secondary">
            Installments due
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text variant="h2" weight="semibold" tabular>
              {snapshot.installmentsDueCount}
            </Text>
            <CurrencyText amount={snapshot.installmentsDueAmount} currency={currency} variant="caption" tone="secondary" />
          </View>
        </Card>
        <Card className="flex-1 gap-2" onPress={comingSoon('Analytics', 'Phase 6')}>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-positive-tint">
            <Trophy size={16} color={colors.positive} strokeWidth={2} />
          </View>
          <Text variant="caption" weight="medium" tone="secondary">
            Best seller
          </Text>
          <Text variant="body" weight="semibold" numberOfLines={2}>
            {snapshot.bestSeller.name}
          </Text>
          <Text variant="micro" tone="tertiary">
            {snapshot.bestSeller.units} sold
          </Text>
        </Card>
      </Animated.View>

      <Animated.View entering={enter(6)} className="mt-5 items-center">
        <Text variant="micro" tone="tertiary">
          Preview data — live numbers arrive with Phase 4
        </Text>
      </Animated.View>
    </Screen>
  );
}
