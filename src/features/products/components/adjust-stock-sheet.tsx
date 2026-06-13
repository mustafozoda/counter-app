import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Badge,
  Button,
  QuantityStepper,
  SegmentedControl,
  Sheet,
  Text,
  TextField,
  type SheetRef,
} from '@/components/ui';
import { toast } from '@/stores/toast';
import type { ProductVariant, StockMovementType } from '@/types/models';

import { useAdjustStock } from '../hooks';
import { variantLabel, variantStockStatus } from '../stock';

type AdjustMode = 'restock' | 'remove' | 'return';

const MODE_VALUES: AdjustMode[] = ['restock', 'remove', 'return'];

const MODE_TO_TYPE: Record<AdjustMode, StockMovementType> = {
  restock: 'restock',
  remove: 'adjustment',
  return: 'return',
};

export interface AdjustStockSheetProps {
  variant: ProductVariant | null;
  productId: string;
  dismiss: () => void;
}

/**
 * Every stock change goes through here with a type + reason, keeping the
 * movement ledger honest (§7 "stock adjustments with reasons").
 */
export const AdjustStockSheet = forwardRef<SheetRef, AdjustStockSheetProps>(
  function AdjustStockSheet({ variant, productId, dismiss }, ref) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<AdjustMode>('restock');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('');
    const adjust = useAdjustStock();

    const modeOptions: { label: string; value: AdjustMode }[] = MODE_VALUES.map((value) => ({
      label: t(`stock.${value}`),
      value,
    }));

    const reset = () => {
      setMode('restock');
      setQty(1);
      setReason('');
    };

    const apply = () => {
      if (!variant) return;
      const delta = mode === 'remove' ? -qty : qty;
      adjust.mutate(
        {
          variantId: variant.id,
          productId,
          qtyDelta: delta,
          type: MODE_TO_TYPE[mode],
          reason: reason.trim() || null,
        },
        {
          onSuccess: () => {
            toast.success(
              t('stock.updated'),
              t('stock.unitsDelta', {
                label: variantLabel(variant),
                delta: (delta > 0 ? '+' : '') + delta,
              }),
            );
            dismiss();
          },
          onError: () => toast.error(t('stock.couldNotUpdate')),
        },
      );
    };

    const status = variant ? variantStockStatus(variant) : 'in-stock';
    const maxRemove = variant?.stockQty ?? 0;

    return (
      <Sheet ref={ref} title={t('stock.adjust')} onDismiss={reset}>
        {variant ? (
          <View className="gap-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text variant="title" weight="semibold">
                  {variantLabel(variant)}
                </Text>
                <Text variant="caption" tone="tertiary" mono>
                  {variant.sku}
                </Text>
              </View>
              <Badge
                label={t('stock.onHand', { count: variant.stockQty })}
                tone={status === 'in-stock' ? 'positive' : status === 'low' ? 'caution' : 'negative'}
                dot
              />
            </View>

            <SegmentedControl
              options={modeOptions}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setQty(1);
              }}
            />

            <View className="items-center">
              <QuantityStepper
                value={qty}
                onChange={setQty}
                min={1}
                max={mode === 'remove' ? Math.max(1, maxRemove) : 9999}
              />
              {mode === 'remove' && maxRemove === 0 ? (
                <Text variant="caption" tone="negative" className="mt-2">
                  {t('stock.nothingToRemove')}
                </Text>
              ) : null}
            </View>

            <TextField
              label={mode === 'remove' ? t('stock.reasonRemove') : t('stock.note')}
              value={reason}
              onChangeText={setReason}
            />

            <Button
              label={
                mode === 'restock'
                  ? t('stock.addToStock', { count: qty })
                  : mode === 'return'
                    ? t('stock.returnToStock', { count: qty })
                    : t('stock.removeFromStock', { count: qty })
              }
              size="lg"
              fullWidth
              variant={mode === 'remove' ? 'destructive' : 'primary'}
              loading={adjust.isPending}
              disabled={mode === 'remove' && maxRemove === 0}
              onPress={apply}
            />
          </View>
        ) : (
          <View className="py-6" />
        )}
      </Sheet>
    );
  },
);
