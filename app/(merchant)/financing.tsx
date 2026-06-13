import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarClock, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
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
import { useCustomers } from '@/features/customers/hooks';
import { usePlans } from '@/features/financing/hooks';
import { planProgress, summarizeFinancing } from '@/features/financing/schedule';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import type { FinancingPlanStatus } from '@/types/models';

type Filter = 'active' | 'completed' | 'all';

const FILTER_OPTIONS: { label: string; value: Filter }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'All', value: 'all' },
];

const STATUS_BADGE: Record<FinancingPlanStatus, { label: string; tone: 'positive' | 'caution' | 'negative' | 'neutral' }> = {
  active: { label: 'Active', tone: 'positive' },
  completed: { label: 'Completed', tone: 'neutral' },
  defaulted: { label: 'Defaulted', tone: 'negative' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export default function FinancingScreen() {
  const router = useRouter();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const plansQuery = usePlans();
  const customers = useCustomers().data ?? [];
  const [filter, setFilter] = useState<Filter>('active');

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const summary = useMemo(() => summarizeFinancing(plans), [plans]);
  const visible = useMemo(
    () => plans.filter((p) => (filter === 'all' ? true : p.status === filter)),
    [plans, filter],
  );

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Customer';

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="h1" weight="bold">
          Financing
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        {plansQuery.isLoading ? (
          <View className="mt-4 gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={110} radius={20} />
            ))}
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-3">
              <Card className="gap-1">
                <Text variant="caption" weight="medium" tone="secondary">
                  Outstanding across {summary.activePlans} active plan
                  {summary.activePlans === 1 ? '' : 's'}
                </Text>
                <CurrencyText amount={summary.outstandingTotal} currency={currency} variant="display" animated />
                <View className="mt-1 flex-row gap-2">
                  {summary.dueSoonCount > 0 ? (
                    <Badge
                      label={`${summary.dueSoonCount} due soon · ${formatMoney(summary.dueSoonAmount, currency)}`}
                      tone="caution"
                      dot
                    />
                  ) : null}
                  {summary.overdueCount > 0 ? (
                    <Badge label={`${summary.overdueCount} overdue`} tone="negative" dot />
                  ) : null}
                  {summary.dueSoonCount === 0 && summary.overdueCount === 0 ? (
                    <Badge label="All on schedule" tone="positive" dot />
                  ) : null}
                </View>
              </Card>
            </Animated.View>

            <View className="mt-4">
              <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
            </View>

            {visible.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title={filter === 'active' ? 'No active plans' : 'Nothing here'}
                message="Offer “pay over time” at checkout — pick Installment as the payment method."
                className="mt-6"
              />
            ) : (
              <View className="mt-4 gap-3">
                {visible.map((plan, index) => {
                  const progress = planProgress(plan);
                  const badge = STATUS_BADGE[plan.status];
                  return (
                    <Animated.View
                      key={plan.id}
                      entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}
                    >
                      <Card
                        padded={false}
                        className="gap-3 p-4"
                        onPress={() =>
                          router.push({ pathname: '/plan/[id]', params: { id: plan.id } })
                        }
                      >
                        <View className="flex-row items-center gap-3">
                          <Avatar name={customerName(plan.customerId)} size={40} />
                          <View className="flex-1">
                            <Text variant="body" weight="semibold">
                              {customerName(plan.customerId)}
                            </Text>
                            <Text variant="caption" tone="tertiary" tabular>
                              {formatMoney(plan.principal, currency)} · {progress.paidCount}/
                              {progress.totalCount} paid
                            </Text>
                          </View>
                          {progress.overdueCount > 0 && plan.status === 'active' ? (
                            <Badge label="Overdue" tone="negative" dot />
                          ) : (
                            <Badge label={badge.label} tone={badge.tone} />
                          )}
                          <ChevronRight size={16} color="#9C9AA3" strokeWidth={2} />
                        </View>
                        <ProgressBar
                          progress={progress.ratio}
                          tone={progress.overdueCount > 0 && plan.status === 'active' ? 'caution' : 'primary'}
                        />
                        {plan.status === 'active' && progress.nextDue ? (
                          <Text variant="caption" tone="secondary" tabular>
                            Next: {formatMoney(progress.nextDue.amount, currency)} ·{' '}
                            {formatDayLabel(new Date(progress.nextDue.dueDate))}
                          </Text>
                        ) : null}
                      </Card>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
