import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Pencil, ShoppingBag, Star, Trash2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
  Card,
  CurrencyText,
  IconButton,
  ProgressBar,
  Screen,
  Skeleton,
  Text,
  useSheetRef,
} from '@/components/ui';
import { CustomerFormSheet } from '@/features/customers/components/customer-form-sheet';
import { useCustomer, useDeleteCustomer } from '@/features/customers/hooks';
import { usePlans } from '@/features/financing/hooks';
import { planProgress } from '@/features/financing/schedule';
import { useOrders } from '@/features/pos/hooks';
import { formatDayLabel, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');

  const customerQuery = useCustomer(id);
  const ordersQuery = useOrders();
  const deleteCustomer = useDeleteCustomer();
  const editSheet = useSheetRef();

  const customer = customerQuery.data;
  const orders = useMemo(
    () => (ordersQuery.data ?? []).filter((o) => o.customerId === id),
    [ordersQuery.data, id],
  );
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const plansQuery = usePlans();
  const activePlans = useMemo(
    () => (plansQuery.data ?? []).filter((p) => p.customerId === id && p.status === 'active'),
    [plansQuery.data, id],
  );

  if (customerQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={120} radius={24} />
          <Skeleton height={88} radius={20} />
        </View>
      </Screen>
    );
  }

  if (!customer) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          This customer no longer exists.
        </Text>
      </Screen>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Delete customer', `Remove "${customer.name}"? Their orders are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteCustomer.mutate(customer.id, {
            onSuccess: () => {
              toast.success('Customer deleted', customer.name);
              router.back();
            },
          }),
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <View className="flex-row gap-2">
          <IconButton icon={Trash2} accessibilityLabel="Delete customer" onPress={confirmDelete} />
          <IconButton
            icon={Pencil}
            variant="tonal"
            accessibilityLabel="Edit customer"
            onPress={() => editSheet.current?.present()}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} className="items-center pt-4">
          <Avatar name={customer.name} size={84} />
          <Text variant="h1" weight="bold" className="mt-4">
            {customer.name}
          </Text>
          <Text variant="caption" tone="tertiary" className="mt-1">
            {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact info'}
          </Text>
          {customer.tags.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {customer.tags.map((tag) => (
                <Badge key={tag} label={tag} tone="accent" />
              ))}
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} className="mt-6 flex-row gap-3">
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="secondary">
              Total spent
            </Text>
            <CurrencyText amount={totalSpent} currency={currency} variant="h1" animated />
          </Card>
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="secondary">
              Orders
            </Text>
            <Text variant="h1" weight="bold" tabular>
              {orders.length}
            </Text>
          </Card>
          <Card className="flex-1 gap-1">
            <View className="flex-row items-center gap-1">
              <Star size={12} color={colors.caution} strokeWidth={2.5} />
              <Text variant="caption" tone="secondary">
                Points
              </Text>
            </View>
            <Text variant="h1" weight="bold" tabular>
              {customer.loyaltyPoints}
            </Text>
          </Card>
        </Animated.View>

        {customer.notes ? (
          <Animated.View entering={FadeInDown.delay(90).springify().damping(18)} className="mt-3">
            <Card className="gap-1">
              <Text variant="caption" weight="medium" tone="tertiary">
                NOTES
              </Text>
              <Text variant="body" tone="secondary">
                {customer.notes}
              </Text>
            </Card>
          </Animated.View>
        ) : null}

        {activePlans.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(105).springify().damping(18)} className="mt-6 gap-3">
            <Text variant="h2" weight="semibold">
              Active payment plans
            </Text>
            {activePlans.map((plan) => {
              const progress = planProgress(plan);
              return (
                <Card
                  key={plan.id}
                  padded={false}
                  className="gap-2.5 p-4"
                  onPress={() => router.push({ pathname: '/plan/[id]', params: { id: plan.id } })}
                >
                  <View className="flex-row items-center justify-between">
                    <Text variant="body" weight="semibold" tabular>
                      {formatMoney(progress.outstanding, currency)} outstanding
                    </Text>
                    {progress.overdueCount > 0 ? (
                      <Badge label="Overdue" tone="negative" dot />
                    ) : (
                      <Badge label={`${progress.paidCount}/${progress.totalCount} paid`} tone="accent" />
                    )}
                  </View>
                  <ProgressBar progress={progress.ratio} tone={progress.overdueCount > 0 ? 'caution' : 'primary'} />
                </Card>
              );
            })}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            Purchase history
          </Text>
          {orders.length === 0 ? (
            <Card className="items-center gap-2 py-8">
              <ShoppingBag size={24} color={colors.inkTertiary} strokeWidth={1.75} />
              <Text variant="caption" tone="tertiary">
                No purchases yet — attach them to a sale at checkout.
              </Text>
            </Card>
          ) : (
            <Card padded={false}>
              {orders.map((order, index) => (
                <View key={order.id} className={index < orders.length - 1 ? 'border-b border-hairline' : ''}>
                  <Card
                    padded={false}
                    elevation="none"
                    className="flex-row items-center gap-3 border-0 px-4 py-3.5"
                    onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                  >
                    <View className="flex-1">
                      <Text variant="body" weight="semibold" tabular>
                        {order.number}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {formatDayLabel(new Date(order.createdAt))} · {order.items.length} item
                        {order.items.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text variant="body" weight="semibold" tabular>
                      {formatMoney(order.total, currency)}
                    </Text>
                    <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
                  </Card>
                </View>
              ))}
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      <CustomerFormSheet ref={editSheet} customer={customer} dismiss={() => editSheet.current?.dismiss()} />
    </Screen>
  );
}
