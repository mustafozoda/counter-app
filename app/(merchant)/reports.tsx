import { useRouter } from 'expo-router';
import { ArrowLeft, BarChart3, Clock, Crown, TrendingDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Card,
  CurrencyText,
  EmptyState,
  IconButton,
  ProgressBar,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
} from '@/components/ui';
import { analyze, hourLabel } from '@/features/analytics/aggregate';
import { useOrders } from '@/features/pos/hooks';
import { formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

type RangeKey = '7' | '30' | '90';

const RANGE_OPTIONS: { label: string; value: RangeKey }[] = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

  const ordersQuery = useOrders();
  const [range, setRange] = useState<RangeKey>('30');
  const days = Number(range);

  const report = useMemo(() => analyze(ordersQuery.data ?? [], days), [ordersQuery.data, days]);
  const maxDayRevenue = Math.max(1, ...report.revenueByDay.map((d) => d.revenue));
  const maxSellerUnits = Math.max(1, ...report.bestSellers.map((s) => s.units));

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="h1" weight="bold">
          Reports
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <View className="pt-3">
          <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </View>

        {ordersQuery.isLoading ? (
          <View className="mt-4 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={120} radius={20} />
            ))}
          </View>
        ) : report.totalOrders === 0 ? (
          <View className="pt-10">
            <EmptyState
              icon={BarChart3}
              title="No sales to report yet"
              message="Make some sales and your best sellers, trends and peak hours will appear here."
            />
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-4 flex-row gap-3">
              <Card className="flex-1 gap-1">
                <Text variant="caption" tone="secondary">
                  Revenue
                </Text>
                <CurrencyText amount={report.totalRevenue} currency={currency} variant="h1" animated />
              </Card>
              <Card className="flex-1 gap-1">
                <Text variant="caption" tone="secondary">
                  Avg order
                </Text>
                <CurrencyText amount={report.averageOrderValue} currency={currency} variant="h1" animated />
              </Card>
            </Animated.View>

            {/* Revenue trend */}
            <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} className="mt-3">
              <Card className="gap-3">
                <Text variant="caption" weight="medium" tone="secondary">
                  Revenue trend
                </Text>
                <View className="h-32 flex-row items-end justify-between gap-0.5">
                  {report.revenueByDay.map((day, index) => (
                    <View key={`${day.label}-${index}`} className="flex-1 items-center justify-end">
                      <Animated.View
                        entering={FadeInDown.delay(index * 12).springify().damping(16)}
                        className="w-full max-w-2.5 rounded-full"
                        style={{
                          height: Math.max(day.revenue > 0 ? 4 : 2, (day.revenue / maxDayRevenue) * 116),
                          backgroundColor: day.revenue > 0 ? colors.primary : colors.hairline,
                        }}
                      />
                    </View>
                  ))}
                </View>
              </Card>
            </Animated.View>

            {/* Best sellers */}
            <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} className="mt-3">
              <Card className="gap-3">
                <View className="flex-row items-center gap-2">
                  <Crown size={16} color={colors.caution} strokeWidth={2} />
                  <Text variant="caption" weight="medium" tone="secondary">
                    Best sellers
                  </Text>
                </View>
                {report.bestSellers.map((seller) => (
                  <View key={seller.name} className="gap-1.5">
                    <View className="flex-row items-center justify-between">
                      <Text variant="caption" weight="medium" numberOfLines={1} className="flex-1">
                        {seller.name}
                      </Text>
                      <Text variant="caption" tone="secondary" tabular>
                        {seller.units} · {formatMoney(seller.revenue, currency)}
                      </Text>
                    </View>
                    <ProgressBar progress={seller.units / maxSellerUnits} tone="positive" height={5} />
                  </View>
                ))}
              </Card>
            </Animated.View>

            {/* Slow movers */}
            {report.slowMovers.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-3">
                <Card className="gap-2.5">
                  <View className="flex-row items-center gap-2">
                    <TrendingDown size={16} color={colors.inkSecondary} strokeWidth={2} />
                    <Text variant="caption" weight="medium" tone="secondary">
                      Slow movers
                    </Text>
                  </View>
                  {report.slowMovers.map((s) => (
                    <View key={s.name} className="flex-row items-center justify-between">
                      <Text variant="caption" numberOfLines={1} className="flex-1">
                        {s.name}
                      </Text>
                      <Text variant="caption" tone="tertiary" tabular>
                        {s.units} sold
                      </Text>
                    </View>
                  ))}
                </Card>
              </Animated.View>
            ) : null}

            {/* Peak hour */}
            {report.peakHour !== null ? (
              <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} className="mt-3">
                <Card className="flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-info-tint">
                    <Clock size={18} color={colors.info} strokeWidth={2} />
                  </View>
                  <View className="flex-1">
                    <Text variant="caption" tone="secondary">
                      Busiest time of day
                    </Text>
                    <Text variant="title" weight="semibold">
                      Around {hourLabel(report.peakHour)}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
