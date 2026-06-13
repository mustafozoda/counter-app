import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ShoppingBag, Trash2 } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, QuantityStepper, SwipeableRow, Text } from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import { storefrontTotals } from '@/features/storefront/totals';
import { formatMoney } from '@/lib/format';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useStoreProfile } from '@/stores/store-profile';

export default function StorefrontCart() {
  const router = useRouter();
  const store = useStoreProfile((s) => s.store);
  const currency = store?.currencyCode ?? 'TJS';

  const lines = useStorefrontCart((s) => s.lines);
  const setQty = useStorefrontCart((s) => s.setQty);
  const remove = useStorefrontCart((s) => s.remove);

  const totals = storefrontTotals(lines, store?.taxRate ?? 0);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="px-5 pb-2 pt-1">
        <Text variant="h1" weight="bold">
          Your cart
        </Text>
      </View>

      {lines.length === 0 ? (
        <View className="flex-1 justify-center pb-20">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            message="Browse the shop and add things you love."
            actionLabel="Start shopping"
            onAction={() => router.push('/(storefront)/(tabs)/catalog')}
          />
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="gap-2.5 px-5 pb-4 pt-1" showsVerticalScrollIndicator={false}>
            {lines.map((line) => (
              <Animated.View
                key={line.variantId}
                layout={LinearTransition.springify().damping(20)}
                entering={FadeInDown.springify().damping(18)}
              >
                <SwipeableRow
                  actions={[{ icon: Trash2, label: 'Remove', tone: 'negative', onPress: () => remove(line.variantId) }]}
                >
                  <View className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface p-3 dark:bg-surface-elevated">
                    {line.imageUri ? (
                      <Image source={{ uri: line.imageUri }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" />
                    ) : (
                      <ProductImage product={{ name: line.productName, images: [] }} size={56} radius={12} />
                    )}
                    <View className="flex-1">
                      <Text variant="body" weight="semibold" numberOfLines={1}>
                        {line.productName}
                      </Text>
                      {line.variantLabel !== 'Default' ? (
                        <Text variant="caption" tone="tertiary">
                          {line.variantLabel}
                        </Text>
                      ) : null}
                      <Text variant="body" weight="semibold" tone="accent" tabular>
                        {formatMoney(line.unitPrice, currency)}
                      </Text>
                    </View>
                    <QuantityStepper
                      value={line.qty}
                      min={0}
                      max={line.available}
                      onChange={(qty) => setQty(line.variantId, qty)}
                    />
                  </View>
                </SwipeableRow>
              </Animated.View>
            ))}
          </ScrollView>

          <View className="border-t border-hairline bg-surface px-5 pb-28 pt-4 dark:bg-surface-elevated">
            <View className="mb-1 flex-row justify-between">
              <Text variant="body" tone="secondary">
                Subtotal
              </Text>
              <Text variant="body" weight="medium" tabular>
                {formatMoney(totals.subtotal, currency)}
              </Text>
            </View>
            {totals.tax > 0 ? (
              <View className="mb-1 flex-row justify-between">
                <Text variant="body" tone="secondary">
                  Tax
                </Text>
                <Text variant="body" weight="medium" tabular>
                  {formatMoney(totals.tax, currency)}
                </Text>
              </View>
            ) : null}
            <View className="mb-3 mt-1 flex-row items-center justify-between">
              <Text variant="title" weight="semibold">
                Total
              </Text>
              <Text variant="h2" weight="bold" tabular>
                {formatMoney(totals.total, currency)}
              </Text>
            </View>
            <Button
              label="Checkout"
              size="lg"
              fullWidth
              onPress={() => router.push('/(storefront)/checkout')}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
