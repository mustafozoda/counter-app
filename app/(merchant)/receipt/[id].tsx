import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MessageSquareText, Share2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, IconButton, Screen, Skeleton, Text } from '@/components/ui';
import { useOrder } from '@/features/pos/hooks';
import { PAYMENT_METHOD_LABELS } from '@/features/pos/receipt';
import { shareReceiptPdf, shareReceiptText } from '@/features/pos/share-receipt';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant={strong ? 'title' : 'body'} weight={strong ? 'semibold' : 'regular'} tone={strong ? 'primary' : 'secondary'}>
        {label}
      </Text>
      <Text variant={strong ? 'h2' : 'body'} weight={strong ? 'bold' : 'medium'} tabular>
        {value}
      </Text>
    </View>
  );
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useStoreProfile((s) => s.store);
  const orderQuery = useOrder(id);
  const order = orderQuery.data;
  const currency = store?.currencyCode ?? 'TJS';

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="h1" weight="bold">
          Receipt
        </Text>
      </View>

      {orderQuery.isLoading ? (
        <View className="px-5 pt-5">
          <Skeleton height={420} radius={24} />
        </View>
      ) : !order || !store ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="h2" weight="semibold" className="text-center">
            This receipt is no longer available.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-16 pt-5" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            <Card elevation="md" className="gap-4 p-6">
              <View className="items-center gap-1">
                <Text variant="h2" weight="bold" className="text-center">
                  {store.receipt.headerText || store.name}
                </Text>
                <Text variant="caption" tone="tertiary" tabular>
                  Order {order.number} · {formatDateTime(new Date(order.createdAt))}
                </Text>
              </View>

              <View className="border-t border-dashed border-hairline" />

              <View className="gap-2.5">
                {order.items.map((item) => (
                  <View key={item.id} className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text variant="body" weight="medium">
                        {item.qty} × {item.productName}
                      </Text>
                      {item.variantLabel !== 'Default' ? (
                        <Text variant="caption" tone="tertiary">
                          {item.variantLabel}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="body" weight="medium" tabular>
                      {formatMoney(item.lineTotal, currency)}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="border-t border-dashed border-hairline" />

              <View className="gap-1.5">
                <Line label="Subtotal" value={formatMoney(order.subtotal, currency)} />
                {order.discount > 0 ? (
                  <Line label="Discount" value={`-${formatMoney(order.discount, currency)}`} />
                ) : null}
                {order.tax > 0 ? <Line label="Tax" value={formatMoney(order.tax, currency)} /> : null}
                <Line label="Total" value={formatMoney(order.total, currency)} strong />
              </View>

              <View className="border-t border-dashed border-hairline" />

              <View className="gap-1.5">
                {order.payments.map((payment) => (
                  <Line
                    key={payment.id}
                    label={
                      payment.ref
                        ? `${PAYMENT_METHOD_LABELS[payment.method]} · ${payment.ref}`
                        : PAYMENT_METHOD_LABELS[payment.method]
                    }
                    value={formatMoney(payment.amount, currency)}
                  />
                ))}
              </View>

              {store.receipt.footerText ? (
                <Text variant="caption" tone="tertiary" className="text-center">
                  {store.receipt.footerText}
                </Text>
              ) : null}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} className="mt-5 gap-3">
            <Button
              label="Share as PDF"
              icon={Share2}
              size="lg"
              fullWidth
              onPress={() => void shareReceiptPdf(order, store)}
            />
            <Button
              label="Share as text"
              icon={MessageSquareText}
              variant="secondary"
              fullWidth
              onPress={() => void shareReceiptText(order, store)}
            />
          </Animated.View>
        </ScrollView>
      )}
    </Screen>
  );
}
