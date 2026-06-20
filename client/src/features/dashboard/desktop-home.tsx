import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  ChevronRight,
  PackageSearch,
  Plus,
  ScanBarcode,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import {
  Card,
  CurrencyText,
  IconButton,
  Logo,
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
import { lowStockProducts } from '@/features/products/filtering';
import { useProducts } from '@/features/products/hooks';
import { useOrders } from '@/features/pos/hooks';
import { formatCompact } from '@/lib/format';
import { CONTENT_MAX_WIDTH, useBreakpoint } from '@/lib/responsive';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

type Href = Parameters<ReturnType<typeof useRouter>['push']>[0];

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

/** Split items into equal rows so a flex-1 grid keeps columns aligned. */
function rowsOf<T>(items: T[], perRow: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perRow) out.push(items.slice(i, i + perRow));
  return out;
}

/** One responsive row of equal-width tiles, padded so the last row aligns. */
function GridRow({ children, perRow }: { children: ReactNode[]; perRow: number }) {
  const pad = perRow - children.length;
  return (
    <View className="flex-row gap-4">
      {children.map((node, i) => (
        <View key={i} className="min-w-0 flex-1">
          {node}
        </View>
      ))}
      {pad > 0
        ? Array.from({ length: pad }).map((_, i) => <View key={`pad-${i}`} className="flex-1" />)
        : null}
    </View>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-md border border-hairline bg-surface px-3.5 py-3 hover:bg-surface-sunken dark:bg-surface-elevated dark:hover:bg-surface"
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-tint">
        <Icon size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <Text variant="caption" weight="semibold" numberOfLines={1} className="flex-1">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Desktop/tablet dashboard — a wide, multi-column rework of the merchant home
 * built from the same data hooks as the phone screen. Rendered only at wide
 * widths; the phone layout is untouched.
 */
export function DesktopHome() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const bp = useBreakpoint();
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
  const plansQuery = usePlans();

  const currency = store?.currencyCode ?? 'TJS';
  const summary = useMemo(
    () => summarize(transactionsQuery.data ?? [], ordersQuery.data ?? [], period),
    [transactionsQuery.data, ordersQuery.data, period],
  );
  const lowStock = useMemo(
    () => lowStockProducts(productsQuery.data ?? []),
    [productsQuery.data],
  );
  const financing = useMemo(() => summarizeFinancing(plansQuery.data ?? []), [plansQuery.data]);

  const loading =
    productsQuery.isLoading || ordersQuery.isLoading || transactionsQuery.isLoading;

  const go = (href: string) => router.push(href as Href);

  // 4 KPI tiles per row on laptop/desktop, 2 on tablet.
  const kpiPerRow = bp === 'tablet' ? 2 : 4;
  const stacked = bp === 'tablet';

  const kpis: ReactNode[] = [
    <StatCard
      key="revenue"
      label={t(PERIOD_LABEL_KEY[period])}
      value={summary.revenue}
      currency={currency}
      delta={summary.revenueDelta ?? undefined}
      sparkline={summary.revenueTrend}
      onPress={() => go('/finance')}
    />,
    <StatCard
      key="orders"
      label={t('home.orders')}
      value={summary.ordersCount}
      delta={summary.ordersDelta ?? undefined}
      onPress={() => go('/orders')}
    />,
    <Card key="low-stock" className="h-full justify-between gap-2" onPress={() => go('/low-stock')}>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" weight="medium" tone="secondary">
          {t('home.lowStock')}
        </Text>
        <View className="h-8 w-8 items-center justify-center rounded-full bg-caution-tint">
          <PackageSearch size={16} color={colors.caution} strokeWidth={2} />
        </View>
      </View>
      <Text variant="displaySm" weight="semibold" tabular>
        {formatCompact(lowStock.length)}
      </Text>
      <Text variant="micro" tone="tertiary">
        {lowStock.length === 0 ? t('home.allStockedUp') : t('home.needRestock')}
      </Text>
    </Card>,
    <Card key="financing" className="h-full justify-between gap-2" onPress={() => go('/financing')}>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" weight="medium" tone="secondary">
          {t('home.installmentsDue')}
        </Text>
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
      </View>
      {financing.dueSoonCount > 0 ? (
        <>
          <Text variant="displaySm" weight="semibold" tabular>
            {financing.dueSoonCount}
          </Text>
          <CurrencyText
            amount={financing.dueSoonAmount}
            currency={currency}
            variant="micro"
            tone="secondary"
          />
        </>
      ) : (
        <>
          <Text variant="displaySm" weight="semibold" tabular>
            0
          </Text>
          <Text variant="micro" tone="tertiary">
            {financing.activePlans > 0 ? t('home.allOnSchedule') : t('home.noActivePlans')}
          </Text>
        </>
      )}
    </Card>,
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH }} className="gap-4">
        {/* Header */}
        <View className="flex-row flex-wrap items-center justify-between gap-4">
          <View>
            <Text variant="caption" tone="secondary">
              {t(greetingKey())}
            </Text>
            <Text variant="display" weight="bold" className="mt-0.5">
              {store?.name ?? t('home.yourStore')}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <View style={{ width: 260 }}>
              <SegmentedControl options={periodOptions} value={period} onChange={setPeriod} />
            </View>
            <IconButton
              icon={Sparkles}
              variant="tonal"
              accessibilityLabel={t('assistant.title')}
              onPress={() => go('/assistant')}
            />
            <IconButton
              icon={Bell}
              accessibilityLabel={t('more.title')}
              onPress={() => go('/notifications')}
            />
            <Logo size={44} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
          </View>
        </View>

        {/* Quick actions */}
        <View className="flex-row flex-wrap gap-3">
          <QuickAction icon={ScanBarcode} label={t('nav.sell')} onPress={() => go('/sell')} />
          <QuickAction
            icon={Plus}
            label={t('products.title')}
            onPress={() => go('/product-form')}
          />
          <QuickAction icon={BarChart3} label={t('more.reports')} onPress={() => go('/reports')} />
          <QuickAction icon={Users} label={t('more.customers')} onPress={() => go('/customers')} />
        </View>

        {loading ? (
          <View className="gap-4">
            <GridRow perRow={kpiPerRow}>
              {Array.from({ length: kpiPerRow }).map((_, i) => (
                <Skeleton key={i} height={132} radius={20} />
              ))}
            </GridRow>
            <Skeleton height={220} radius={20} />
          </View>
        ) : (
          <>
            {/* KPI tiles */}
            <View className="gap-4">
              {rowsOf(kpis, kpiPerRow).map((row, i) => (
                <GridRow key={i} perRow={kpiPerRow}>
                  {row}
                </GridRow>
              ))}
            </View>

            {/* Cash flow + best seller */}
            <View className={stacked ? 'gap-4' : 'flex-row gap-4'}>
              <View style={stacked ? undefined : { flex: 2 }} className="min-w-0">
                <Card onPress={() => go('/finance')} className="h-full gap-5">
                  <View className="flex-row items-center justify-between">
                    <Text variant="title" weight="semibold">
                      {t('home.cashFlow')}
                    </Text>
                    <Sparkline data={summary.revenueTrend} width={160} height={36} tone="primary" />
                  </View>
                  <View className="flex-row gap-8">
                    <View className="flex-1 gap-1.5">
                      <View className="flex-row items-center gap-1.5">
                        <ArrowDownLeft size={15} color={colors.positive} strokeWidth={2.5} />
                        <Text variant="micro" weight="medium" tone="tertiary">
                          {t('home.moneyIn')}
                        </Text>
                      </View>
                      <CurrencyText
                        amount={summary.moneyIn}
                        currency={currency}
                        variant="h1"
                        tone="positive"
                        animated
                      />
                    </View>
                    <View className="w-px bg-hairline" />
                    <View className="flex-1 gap-1.5">
                      <View className="flex-row items-center gap-1.5">
                        <ArrowUpRight size={15} color={colors.negative} strokeWidth={2.5} />
                        <Text variant="micro" weight="medium" tone="tertiary">
                          {t('home.moneyOut')}
                        </Text>
                      </View>
                      <CurrencyText
                        amount={summary.moneyOut}
                        currency={currency}
                        variant="h1"
                        tone="negative"
                        animated
                      />
                    </View>
                  </View>
                </Card>
              </View>

              <View style={stacked ? undefined : { flex: 1 }} className="min-w-0">
                <Card onPress={() => go('/reports')} className="h-full gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-positive-tint">
                    <Trophy size={18} color={colors.positive} strokeWidth={2} />
                  </View>
                  <Text variant="caption" weight="medium" tone="secondary">
                    {t('home.bestSeller')}
                  </Text>
                  {summary.bestSeller ? (
                    <>
                      <Text variant="h2" weight="semibold" numberOfLines={2}>
                        {summary.bestSeller.name}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {t('home.sold', { count: summary.bestSeller.units })}
                      </Text>
                    </>
                  ) : (
                    <Text variant="caption" tone="tertiary">
                      {t('home.noSalesYet')}
                    </Text>
                  )}
                </Card>
              </View>
            </View>

            {/* Low stock list */}
            {lowStock.length > 0 ? (
              <Card padded={false} className="overflow-hidden">
                <View className="flex-row items-center justify-between border-b border-hairline px-5 py-3.5">
                  <Text variant="title" weight="semibold">
                    {t('home.lowStock')}
                  </Text>
                  <Pressable
                    onPress={() => go('/low-stock')}
                    accessibilityRole="link"
                    accessibilityLabel={t('home.lowStock')}
                    className="h-8 w-8 items-center justify-center rounded-full hover:bg-surface-sunken dark:hover:bg-surface"
                  >
                    <ChevronRight size={18} color={colors.primary} strokeWidth={2.5} />
                  </Pressable>
                </View>
                {lowStock.slice(0, 5).map((p, i) => (
                  <Pressable
                    key={p.id}
                    onPress={() => go(`/product/${p.id}`)}
                    accessibilityRole="link"
                    className={`flex-row items-center gap-3 px-5 py-3 hover:bg-surface-sunken dark:hover:bg-surface ${
                      i < Math.min(lowStock.length, 5) - 1 ? 'border-b border-hairline' : ''
                    }`}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-caution-tint">
                      <PackageSearch size={16} color={colors.caution} strokeWidth={2} />
                    </View>
                    <Text variant="body" weight="medium" numberOfLines={1} className="flex-1">
                      {p.name}
                    </Text>
                    <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
                  </Pressable>
                ))}
              </Card>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}
