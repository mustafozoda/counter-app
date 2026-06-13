import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, ReceiptText, RotateCcw, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  IconButton,
  QuantityStepper,
  Screen,
  Sheet,
  Skeleton,
  SwitchRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { refundAmountFor } from '@/api/orders';
import { useCustomer, useRefundOrder, useSetFulfillment } from '@/features/customers/hooks';
import { useOrder } from '@/features/pos/hooks';
import { PAYMENT_METHOD_LABELS } from '@/features/pos/receipt';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { FulfillmentStatus, PaymentStatus, RefundItem } from '@/types/models';

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; tone: 'positive' | 'caution' | 'negative' | 'info' }> = {
  paid: { label: 'Paid', tone: 'positive' },
  pending: { label: 'Payment pending', tone: 'caution' },
  partial: { label: 'Partially refunded', tone: 'caution' },
  refunded: { label: 'Refunded', tone: 'negative' },
};

const FULFILLMENT_FLOW: FulfillmentStatus[] = ['pending', 'fulfilled', 'shipped', 'completed'];

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  pending: 'Pending',
  fulfilled: 'Fulfilled',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');

  const orderQuery = useOrder(id);
  const order = orderQuery.data;
  const customerQuery = useCustomer(order?.customerId ?? '');
  const refund = useRefundOrder();
  const setFulfillment = useSetFulfillment();

  const refundSheet = useSheetRef();
  const [refundQty, setRefundQty] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState('');

  if (orderQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={160} radius={24} />
          <Skeleton height={120} radius={20} />
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          This order no longer exists.
        </Text>
      </Screen>
    );
  }

  const refundedQtyByItem = new Map<string, number>();
  for (const r of order.refunds) {
    for (const ri of r.items) {
      refundedQtyByItem.set(ri.orderItemId, (refundedQtyByItem.get(ri.orderItemId) ?? 0) + ri.qty);
    }
  }
  const refundableItems = order.items.filter(
    (item) => item.qty - (refundedQtyByItem.get(item.id) ?? 0) > 0,
  );
  const canRefund = order.paymentStatus !== 'refunded' && refundableItems.length > 0;

  const selectedItems: RefundItem[] = Object.entries(refundQty)
    .filter(([, qty]) => qty > 0)
    .map(([orderItemId, qty]) => ({ orderItemId, qty }));
  const refundPreview = refundAmountFor(order, selectedItems);

  const openRefund = () => {
    setRefundQty({});
    setRestock(true);
    setReason('');
    refundSheet.current?.present();
  };

  const submitRefund = () => {
    refund.mutate(
      { orderId: order.id, items: selectedItems, restock, reason: reason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Refund recorded', formatMoney(refundPreview, currency));
          refundSheet.current?.dismiss();
        },
        onError: () => toast.error('Refund failed'),
      },
    );
  };

  const paymentBadge = PAYMENT_BADGE[order.paymentStatus];
  const flowIndex = FULFILLMENT_FLOW.indexOf(order.fulfillmentStatus);
  const nextStatus =
    order.fulfillmentStatus !== 'cancelled' && flowIndex >= 0 && flowIndex < FULFILLMENT_FLOW.length - 1
      ? FULFILLMENT_FLOW[flowIndex + 1]
      : null;

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <IconButton
          icon={ReceiptText}
          variant="tonal"
          accessibilityLabel="View receipt"
          onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: order.id } })}
        />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} className="pt-3">
          <View className="flex-row items-center gap-2">
            <Text variant="display" weight="bold" tabular>
              {order.number}
            </Text>
            <Badge label={order.channel === 'pos' ? 'POS' : 'Online'} />
          </View>
          <Text variant="caption" tone="tertiary" className="mt-1">
            {formatDateTime(new Date(order.createdAt))}
          </Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Badge label={paymentBadge.label} tone={paymentBadge.tone} dot />
            <Badge
              label={FULFILLMENT_LABEL[order.fulfillmentStatus]}
              tone={order.fulfillmentStatus === 'cancelled' ? 'negative' : order.fulfillmentStatus === 'completed' ? 'positive' : 'info'}
              dot
            />
          </View>
        </Animated.View>

        {/* Status pipeline */}
        {order.fulfillmentStatus !== 'cancelled' ? (
          <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} className="mt-5">
            <Card className="gap-3">
              <View className="flex-row items-center">
                {FULFILLMENT_FLOW.map((status, index) => {
                  const reached = flowIndex >= index;
                  return (
                    <View key={status} className="flex-1 flex-row items-center">
                      <View
                        className={`h-3 w-3 rounded-full ${reached ? 'bg-primary' : 'bg-surface-sunken dark:bg-surface'}`}
                      />
                      {index < FULFILLMENT_FLOW.length - 1 ? (
                        <View className={`h-0.5 flex-1 ${flowIndex > index ? 'bg-primary' : 'bg-hairline'}`} />
                      ) : null}
                    </View>
                  );
                })}
              </View>
              <View className="flex-row justify-between">
                <Text variant="micro" tone="tertiary">
                  {FULFILLMENT_LABEL[FULFILLMENT_FLOW[0]!]}
                </Text>
                <Text variant="micro" tone="tertiary">
                  {FULFILLMENT_LABEL[FULFILLMENT_FLOW[FULFILLMENT_FLOW.length - 1]!]}
                </Text>
              </View>
              {nextStatus ? (
                <Button
                  label={`Mark ${FULFILLMENT_LABEL[nextStatus].toLowerCase()}`}
                  variant="secondary"
                  fullWidth
                  loading={setFulfillment.isPending}
                  onPress={() =>
                    setFulfillment.mutate(
                      { orderId: order.id, status: nextStatus },
                      { onSuccess: () => toast.success(`Order ${FULFILLMENT_LABEL[nextStatus].toLowerCase()}`) },
                    )
                  }
                />
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {/* Customer */}
        <Animated.View entering={FadeInDown.delay(70).springify().damping(18)} className="mt-3">
          {order.customerId && customerQuery.data ? (
            <Card
              padded={false}
              className="flex-row items-center gap-3 px-4 py-3.5"
              onPress={() =>
                router.push({ pathname: '/customer/[id]', params: { id: order.customerId! } })
              }
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-tint">
                <UserRound size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text variant="body" weight="medium" className="flex-1">
                {customerQuery.data.name}
              </Text>
              <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
            </Card>
          ) : (
            <Card padded={false} className="flex-row items-center gap-3 px-4 py-3.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                <UserRound size={16} color={colors.inkTertiary} strokeWidth={2} />
              </View>
              <Text variant="body" tone="tertiary">
                Walk-in customer
              </Text>
            </Card>
          )}
        </Animated.View>

        {/* Items */}
        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            Items
          </Text>
          <Card padded={false}>
            {order.items.map((item, index) => {
              const refunded = refundedQtyByItem.get(item.id) ?? 0;
              return (
                <View
                  key={item.id}
                  className={`flex-row items-center gap-3 px-4 py-3.5 ${index < order.items.length - 1 ? 'border-b border-hairline' : ''}`}
                >
                  <View className="flex-1">
                    <Text variant="body" weight="medium">
                      {item.qty} × {item.productName}
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {item.variantLabel !== 'Default' ? `${item.variantLabel} · ` : ''}
                      {formatMoney(item.unitPrice, currency)} each
                      {refunded > 0 ? ` · ${refunded} refunded` : ''}
                    </Text>
                  </View>
                  <Text variant="body" weight="semibold" tabular>
                    {formatMoney(item.lineTotal, currency)}
                  </Text>
                </View>
              );
            })}
          </Card>
        </Animated.View>

        {/* Money */}
        <Animated.View entering={FadeInDown.delay(130).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            Payment
          </Text>
          <Card className="gap-2">
            <Row label="Subtotal" value={formatMoney(order.subtotal, currency)} />
            {order.discount > 0 ? <Row label="Discount" value={`-${formatMoney(order.discount, currency)}`} /> : null}
            {order.tax > 0 ? <Row label="Tax" value={formatMoney(order.tax, currency)} /> : null}
            <View className="my-1 h-px bg-hairline" />
            <Row label="Total" value={formatMoney(order.total, currency)} strong />
            {order.payments.map((p) => (
              <Row
                key={p.id}
                label={p.ref ? `${PAYMENT_METHOD_LABELS[p.method]} · ${p.ref}` : PAYMENT_METHOD_LABELS[p.method]}
                value={formatMoney(p.amount, currency)}
              />
            ))}
            {order.refunds.map((r) => (
              <Row
                key={r.id}
                label={`Refund${r.reason ? ` — ${r.reason}` : ''}${r.restocked ? ' (restocked)' : ''}`}
                value={`-${formatMoney(r.amount, currency)}`}
                tone="negative"
              />
            ))}
          </Card>
          {canRefund ? (
            <Button label="Refund items" variant="destructive" icon={RotateCcw} fullWidth onPress={openRefund} />
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* Refund sheet */}
      <Sheet ref={refundSheet} title="Refund items">
        <View className="gap-4">
          {refundableItems.map((item) => {
            const max = item.qty - (refundedQtyByItem.get(item.id) ?? 0);
            return (
              <View key={item.id} className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text variant="body" weight="medium" numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {item.variantLabel !== 'Default' ? `${item.variantLabel} · ` : ''}up to {max}
                  </Text>
                </View>
                <QuantityStepper
                  value={refundQty[item.id] ?? 0}
                  min={0}
                  max={max}
                  onChange={(qty) => setRefundQty((prev) => ({ ...prev, [item.id]: qty }))}
                />
              </View>
            );
          })}
          <SwitchRow
            label="Return to stock"
            caption="Adds the items back through the movement ledger"
            value={restock}
            onChange={setRestock}
          />
          <TextField label="Reason (optional)" value={reason} onChangeText={setReason} />
          <Button
            label={refundPreview > 0 ? `Refund ${formatMoney(refundPreview, currency)}` : 'Refund'}
            variant="destructive"
            size="lg"
            fullWidth
            disabled={selectedItems.length === 0}
            loading={refund.isPending}
            onPress={submitRefund}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'negative';
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text
        variant={strong ? 'title' : 'body'}
        weight={strong ? 'semibold' : 'regular'}
        tone={tone ?? (strong ? 'primary' : 'secondary')}
        className="flex-1"
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text variant={strong ? 'title' : 'body'} weight={strong ? 'bold' : 'medium'} tone={tone} tabular>
        {value}
      </Text>
    </View>
  );
}
