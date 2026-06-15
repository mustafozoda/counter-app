import { useRouter } from 'expo-router';
import { ArrowLeft, CalendarClock, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { withPermission } from '@/components/require-permission';
import { useCustomers } from '@/features/customers/hooks';
import { usePlans } from '@/features/financing/hooks';
import { planProgress, summarizeFinancing } from '@/features/financing/schedule';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import type { FinancingPlanStatus } from '@/types/models';

type Filter = 'active' | 'completed' | 'all';

const FILTER_VALUES: Filter[] = ['active', 'completed', 'all'];

const STATUS_BADGE: Record<FinancingPlanStatus, { labelKey: string; tone: 'positive' | 'caution' | 'negative' | 'neutral' }> = {
  active: { labelKey: 'financing.statusActive', tone: 'positive' },
  completed: { labelKey: 'financing.statusCompleted', tone: 'neutral' },
  defaulted: { labelKey: 'financing.statusDefaulted', tone: 'negative' },
  cancelled: { labelKey: 'financing.statusCancelled', tone: 'neutral' },
};

export default withPermission(FinancingScreen, 'view_finance');

function FinancingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const plansQuery = usePlans();
  const customers = useCustomers().data ?? [];
  const [filter, setFilter] = useState<Filter>('active');

  const filterOptions = FILTER_VALUES.map((value) => ({
    label: t(`financing.${value}`),
    value,
  }));

  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);
  const summary = useMemo(() => summarizeFinancing(plans), [plans]);
  const visible = useMemo(
    () => plans.filter((p) => (filter === 'all' ? true : p.status === filter)),
    [plans, filter],
  );

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? t('common.customer');

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        <Text variant="h1" weight="bold">
          {t('financing.title')}
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
                  {t('financing.outstanding', { count: summary.activePlans })}
                </Text>
                <CurrencyText amount={summary.outstandingTotal} currency={currency} variant="display" animated />
                <View className="mt-1 flex-row gap-2">
                  {summary.dueSoonCount > 0 ? (
                    <Badge
                      label={t('financing.dueSoon', {
                        count: summary.dueSoonCount,
                        amount: formatMoney(summary.dueSoonAmount, currency),
                      })}
                      tone="caution"
                      dot
                    />
                  ) : null}
                  {summary.overdueCount > 0 ? (
                    <Badge label={t('financing.overdue', { count: summary.overdueCount })} tone="negative" dot />
                  ) : null}
                  {summary.dueSoonCount === 0 && summary.overdueCount === 0 ? (
                    <Badge label={t('financing.allOnSchedule')} tone="positive" dot />
                  ) : null}
                </View>
              </Card>
            </Animated.View>

            <View className="mt-4">
              <SegmentedControl options={filterOptions} value={filter} onChange={setFilter} />
            </View>

            {visible.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title={filter === 'active' ? t('financing.noActive') : t('financing.nothingHere')}
                message={t('financing.emptyMsg')}
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
                              {formatMoney(plan.principal, currency)} ·{' '}
                              {t('financing.paidCount', {
                                paid: progress.paidCount,
                                total: progress.totalCount,
                              })}
                            </Text>
                          </View>
                          {progress.overdueCount > 0 && plan.status === 'active' ? (
                            <Badge label={t('financing.overdueBadge')} tone="negative" dot />
                          ) : (
                            <Badge label={t(badge.labelKey)} tone={badge.tone} />
                          )}
                          <ChevronRight size={16} color="#9C9AA3" strokeWidth={2} />
                        </View>
                        <ProgressBar
                          progress={progress.ratio}
                          tone={progress.overdueCount > 0 && plan.status === 'active' ? 'caution' : 'primary'}
                        />
                        {plan.status === 'active' && progress.nextDue ? (
                          <Text variant="caption" tone="secondary" tabular>
                            {t('financing.next', {
                              amount: formatMoney(progress.nextDue.amount, currency),
                              date: formatDayLabel(new Date(progress.nextDue.dueDate)),
                            })}
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
