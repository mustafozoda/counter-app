import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, ChevronRight, ReceiptText, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CurrencyText,
  IconButton,
  ProgressRing,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { useCustomer } from '@/features/customers/hooks';
import { useCancelPlan, useMarkInstallmentPaid, usePlan } from '@/features/financing/hooks';
import {
  deriveInstallmentStatus,
  planProgress,
  type DerivedInstallmentStatus,
} from '@/features/financing/schedule';
import { formatMoney } from '@/lib/format';
import { format as formatDate } from 'date-fns';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

const STATUS_META: Record<DerivedInstallmentStatus, { labelKey: string; tone: 'positive' | 'caution' | 'negative' | 'neutral' }> = {
  paid: { labelKey: 'plan.statusPaid', tone: 'positive' },
  due: { labelKey: 'plan.statusDue', tone: 'caution' },
  overdue: { labelKey: 'plan.statusOverdue', tone: 'negative' },
  upcoming: { labelKey: 'plan.statusUpcoming', tone: 'neutral' },
};

export default function PlanDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

  const planQuery = usePlan(id);
  const plan = planQuery.data;
  const customer = useCustomer(plan?.customerId ?? '').data;
  const markPaid = useMarkInstallmentPaid();
  const cancelPlan = useCancelPlan();

  if (planQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={160} radius={24} />
          <Skeleton height={240} radius={20} />
        </View>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          {t('plan.gone')}
        </Text>
      </Screen>
    );
  }

  const progress = planProgress(plan);
  const frequencyLabel = t(`frequency.${plan.frequency}`);

  const confirmCancel = () =>
    Alert.alert(t('plan.cancelPlan'), t('plan.cancelPlanBody'), [
      { text: t('plan.keepPlan'), style: 'cancel' },
      {
        text: t('plan.cancelPlan'),
        style: 'destructive',
        onPress: () =>
          cancelPlan.mutate(plan.id, {
            onSuccess: () => toast.success(t('plan.planCancelled')),
          }),
      },
    ]);

  const confirmMarkPaid = (installmentId: string, label: string, amount: number) =>
    Alert.alert(t('plan.recordPayment'), `${label} · ${formatMoney(amount, currency)}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('plan.markPaid'),
        onPress: () =>
          markPaid.mutate(
            { planId: plan.id, installmentId },
            { onSuccess: () => toast.success(t('plan.installmentPaid'), formatMoney(amount, currency)) },
          ),
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        {plan.status === 'active' ? (
          <IconButton icon={XCircle} accessibilityLabel={t('plan.cancelPlan')} onPress={confirmCancel} />
        ) : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} className="items-center pt-2">
          <ProgressRing
            progress={progress.ratio}
            size={132}
            strokeWidth={11}
            tone={progress.overdueCount > 0 && plan.status === 'active' ? 'caution' : 'primary'}
          >
            <Text variant="h1" weight="bold" tabular>
              {Math.round(progress.ratio * 100)}%
            </Text>
            <Text variant="micro" tone="tertiary">
              {t('plan.repaid')}
            </Text>
          </ProgressRing>
          <CurrencyText
            amount={progress.outstanding}
            currency={currency}
            variant="display"
            animated
            className="mt-4"
          />
          <Text variant="caption" tone="tertiary">
            {t('plan.stillOutstanding', { amount: formatMoney(plan.principal, currency) })}
          </Text>
          <View className="mt-3 flex-row gap-2">
            <Badge label={frequencyLabel} tone="accent" />
            {plan.downPayment > 0 ? (
              <Badge label={t('plan.down', { amount: formatMoney(plan.downPayment, currency) })} />
            ) : null}
            {plan.status !== 'active' ? (
              <Badge label={plan.status === 'completed' ? t('financing.statusCompleted') : t('financing.statusCancelled')} tone={plan.status === 'completed' ? 'positive' : 'neutral'} />
            ) : null}
          </View>
        </Animated.View>

        {customer ? (
          <Animated.View entering={FadeInDown.delay(50).springify().damping(18)} className="mt-6">
            <Card
              padded={false}
              className="flex-row items-center gap-3 px-4 py-3.5"
              onPress={() => router.push({ pathname: '/customer/[id]', params: { id: customer.id } })}
            >
              <Avatar name={customer.name} size={40} />
              <View className="flex-1">
                <Text variant="body" weight="semibold">
                  {customer.name}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {customer.phone ?? customer.email ?? t('common.noContact')}
                </Text>
              </View>
              <IconButton
                icon={ReceiptText}
                size={36}
                iconSize={16}
                variant="surface"
                accessibilityLabel={t('plan.viewOrder')}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: plan.orderId } })}
              />
              <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(90).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            {t('plan.paymentTimeline')}
          </Text>
          <Card padded={false}>
            {plan.installments.map((installment, index) => {
              const status = deriveInstallmentStatus(installment);
              const meta = STATUS_META[status];
              const last = index === plan.installments.length - 1;
              return (
                <View key={installment.id} className="flex-row gap-3 px-4">
                  {/* Timeline spine */}
                  <View className="items-center">
                    <View className={`w-px flex-1 ${index === 0 ? 'opacity-0' : 'bg-hairline'}`} />
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor:
                          status === 'paid'
                            ? colors.positive
                            : status === 'overdue'
                              ? colors.negativeTint
                              : status === 'due'
                                ? colors.cautionTint
                                : colors.surfaceSunken,
                      }}
                    >
                      {status === 'paid' ? (
                        <Check size={14} color={colors.onPrimary} strokeWidth={3} />
                      ) : (
                        <Text variant="micro" weight="semibold" tone={status === 'overdue' ? 'negative' : status === 'due' ? 'caution' : 'tertiary'} tabular>
                          {installment.number}
                        </Text>
                      )}
                    </View>
                    <View className={`w-px flex-1 ${last ? 'opacity-0' : 'bg-hairline'}`} />
                  </View>

                  <View className={`flex-1 flex-row items-center gap-3 py-3.5 ${last ? '' : 'border-b border-hairline'}`}>
                    <View className="flex-1">
                      <Text variant="body" weight="medium" tabular>
                        {formatMoney(installment.amount, currency)}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {installment.paidAt
                          ? t('plan.paidOn', { date: formatDate(new Date(installment.paidAt), 'MMM d, yyyy') })
                          : t('plan.dueOn', { date: formatDate(new Date(installment.dueDate), 'MMM d, yyyy') })}
                      </Text>
                    </View>
                    <Badge label={t(meta.labelKey)} tone={meta.tone} dot={status !== 'upcoming'} />
                    {plan.status === 'active' && !installment.paidAt ? (
                      <Button
                        label={t('plan.markPaid')}
                        size="sm"
                        variant={status === 'overdue' || status === 'due' ? 'primary' : 'secondary'}
                        loading={markPaid.isPending}
                        onPress={() =>
                          confirmMarkPaid(
                            installment.id,
                            t('plan.installmentOf', { number: installment.number, total: plan.installments.length }),
                            installment.amount,
                          )
                        }
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Card>
          <Text variant="micro" tone="tertiary" className="px-1">
            {t('plan.pushReminders')}
          </Text>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
