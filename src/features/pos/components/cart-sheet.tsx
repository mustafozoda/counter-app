import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BadgePercent, ShoppingBag, Trash2 } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import {
  Button,
  PressableScale,
  QuantityStepper,
  Sheet,
  SwipeableRow,
  Text,
  type SheetRef,
} from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import { formatMoney } from '@/lib/format';
import { useCartStore } from '@/stores/cart';
import { useTheme } from '@/theme';

import { computeTotals } from '../totals';

export interface CartSheetProps {
  currency: string;
  onCheckout: () => void;
  onEditDiscount: () => void;
}

/** The tactile cart: steppers, swipe-to-remove, discount entry, charge. */
export const CartSheet = forwardRef<SheetRef, CartSheetProps>(function CartSheet(
  { currency, onCheckout, onEditDiscount },
  ref,
) {
  const { colors } = useTheme();
  const lines = useCartStore((s) => s.lines);
  const discount = useCartStore((s) => s.discount);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const totals = computeTotals(lines, discount);

  return (
    <Sheet ref={ref} title={`Cart · ${totals.itemCount} item${totals.itemCount === 1 ? '' : 's'}`} snapPoints={['72%']} raw>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 px-5 pt-3">
          {lines.length === 0 ? (
            <View className="items-center gap-2 py-10">
              <ShoppingBag size={28} color={colors.inkTertiary} strokeWidth={1.75} />
              <Text variant="body" tone="tertiary">
                Cart is empty — tap products to add them.
              </Text>
            </View>
          ) : null}

          {lines.map((line) => (
            <Animated.View key={line.variantId} layout={LinearTransition.springify().damping(20)} entering={FadeInDown.springify().damping(18)}>
              <SwipeableRow
                actions={[
                  {
                    icon: Trash2,
                    label: 'Remove',
                    tone: 'negative',
                    onPress: () => removeLine(line.variantId),
                  },
                ]}
              >
                <View className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface p-3 dark:bg-surface-elevated">
                  {line.imageUri ? (
                    <Image
                      source={{ uri: line.imageUri }}
                      style={{ width: 44, height: 44, borderRadius: 10 }}
                      contentFit="cover"
                    />
                  ) : (
                    <ProductImage product={{ name: line.productName, images: [] }} size={44} radius={10} />
                  )}
                  <View className="flex-1">
                    <Text variant="caption" weight="semibold" numberOfLines={1}>
                      {line.productName}
                    </Text>
                    {line.variantLabel !== 'Default' ? (
                      <Text variant="micro" tone="tertiary">
                        {line.variantLabel}
                      </Text>
                    ) : null}
                    <Text variant="caption" tone="secondary" tabular>
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

          <PressableScale
            scaleTo={0.98}
            onPress={onEditDiscount}
            accessibilityRole="button"
            className="mt-1 h-12 flex-row items-center gap-3 rounded-md border border-dashed border-ink-tertiary/40 px-4"
          >
            <BadgePercent size={18} color={discount ? colors.primary : colors.inkTertiary} strokeWidth={2} />
            <Text variant="body" weight="medium" tone={discount ? 'accent' : 'tertiary'}>
              {discount
                ? discount.kind === 'percent'
                  ? `${discount.value}% off applied`
                  : `${formatMoney(discount.value, currency)} off applied`
                : 'Add discount'}
            </Text>
          </PressableScale>

          <View className="mt-2 gap-1.5 rounded-md bg-surface-sunken p-4 dark:bg-surface">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
            {totals.discount > 0 ? (
              <Row label="Discount" value={`-${formatMoney(totals.discount, currency)}`} tone="positive" />
            ) : null}
            {totals.tax > 0 ? <Row label="Tax" value={formatMoney(totals.tax, currency)} /> : null}
            <View className="my-1 h-px bg-hairline" />
            <View className="flex-row items-center justify-between">
              <Text variant="title" weight="semibold">
                Total
              </Text>
              <Text variant="h2" weight="bold" tabular>
                {formatMoney(totals.total, currency)}
              </Text>
            </View>
          </View>

          <Button
            label={`Charge ${formatMoney(totals.total, currency)}`}
            size="lg"
            fullWidth
            disabled={lines.length === 0}
            onPress={onCheckout}
            className="mt-2"
          />
        </View>
      </BottomSheetScrollView>
    </Sheet>
  );
});

function Row({ label, value, tone = 'secondary' }: { label: string; value: string; tone?: 'secondary' | 'positive' }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text variant="body" weight="medium" tone={tone === 'positive' ? 'positive' : 'primary'} tabular>
        {value}
      </Text>
    </View>
  );
}
