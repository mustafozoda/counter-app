import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, PressableScale, Sheet, Text, type SheetRef } from '@/components/ui';
import {
  variantLabel,
  variantPrice,
  variantStockStatus,
  type ProductWithVariants,
} from '@/features/products/stock';
import { formatMoney } from '@/lib/format';
import type { ProductVariant } from '@/types/models';

export interface VariantPickerSheetProps {
  product: ProductWithVariants | null;
  currency: string;
  onPick: (product: ProductWithVariants, variant: ProductVariant) => void;
  dismiss: () => void;
}

/** Fast size/color chooser when a multi-variant tile is tapped at the counter. */
export const VariantPickerSheet = forwardRef<SheetRef, VariantPickerSheetProps>(
  function VariantPickerSheet({ product, currency, onPick, dismiss }, ref) {
    const { t } = useTranslation();
    return (
      <Sheet ref={ref} title={product?.name ?? t('pos.chooseVariant')}>
        <View className="gap-1">
          {product?.variants.map((variant) => {
            const status = variantStockStatus(variant);
            const out = status === 'out';
            return (
              <PressableScale
                key={variant.id}
                scaleTo={0.98}
                haptic="press"
                disabled={out}
                onPress={() => {
                  onPick(product, variant);
                  dismiss();
                }}
                accessibilityRole="button"
                accessibilityState={{ disabled: out }}
                className={`flex-row items-center gap-3 rounded-md px-3 py-3.5 ${out ? 'opacity-45' : ''}`}
              >
                <View className="flex-1">
                  <Text variant="body" weight="medium">
                    {variantLabel(variant)}
                  </Text>
                  <Text variant="caption" tone="tertiary" mono>
                    {variant.sku}
                  </Text>
                </View>
                <Text variant="body" weight="semibold" tabular>
                  {formatMoney(variantPrice(product, variant), currency)}
                </Text>
                <Badge
                  label={out ? t('products.out') : String(variant.stockQty)}
                  tone={status === 'in-stock' ? 'positive' : status === 'low' ? 'caution' : 'negative'}
                  dot
                />
              </PressableScale>
            );
          })}
        </View>
      </Sheet>
    );
  },
);
