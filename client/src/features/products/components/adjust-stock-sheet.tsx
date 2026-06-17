import { forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Badge,
  Button,
  QuantityStepper,
  SegmentedControl,
  Sheet,
  SwitchRow,
  Text,
  TextField,
  type SheetRef,
} from '@/components/ui';
import { getCurrencySpec } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import type { ProductVariant, StockMovementType } from '@/types/models';

import { useAdjustStock, useReceiveStock } from '../hooks';
import { variantLabel, variantStockStatus } from '../stock';

const parseAmount = (raw: string): number => {
  const value = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

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
  /** Current product cost — prefills the unit-cost field for a restock. */
  defaultCost?: number;
  /** Supplier to credit when a restock fills in a missing supplier. */
  supplierId?: string | null;
}

/**
 * Every stock change goes through here with a type + reason, keeping the
 * movement ledger honest (§7 "stock adjustments with reasons").
 */
export const AdjustStockSheet = forwardRef<SheetRef, AdjustStockSheetProps>(
  function AdjustStockSheet({ variant, productId, dismiss, defaultCost, supplierId }, ref) {
    const { t } = useTranslation();
    const currencySymbol = getCurrencySpec(
      useStoreProfile((s) => s.store?.currencyCode ?? 'TJS'),
    ).symbol;
    const [mode, setMode] = useState<AdjustMode>('restock');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('');
    const [isPurchase, setIsPurchase] = useState(true);
    const [cost, setCost] = useState('');
    const adjust = useAdjustStock();
    const receive = useReceiveStock();

    // Initialise the form whenever a new variant is loaded into the sheet.
    useEffect(() => {
      if (!variant) return;
      setMode('restock');
      setQty(1);
      setReason('');
      setIsPurchase(true);
      setCost(defaultCost && defaultCost > 0 ? String(defaultCost) : '');
    }, [variant?.id, defaultCost]);

    const modeOptions: { label: string; value: AdjustMode }[] = MODE_VALUES.map((value) => ({
      label: t(`stock.${value}`),
      value,
    }));

    const reset = () => {
      setMode('restock');
      setQty(1);
      setReason('');
      setIsPurchase(true);
      setCost('');
    };

    const apply = () => {
      if (!variant) return;
      const onSuccess = (delta: number) => {
        toast.success(
          t('stock.updated'),
          t('stock.unitsDelta', {
            label: variantLabel(variant),
            delta: (delta > 0 ? '+' : '') + delta,
          }),
        );
        dismiss();
      };
      const onError = () => toast.error(t('stock.couldNotUpdate'));

      // A restock marked as a purchase routes through receiveStock so the cost,
      // supplier and inventory expense are captured atomically.
      if (mode === 'restock' && isPurchase) {
        receive.mutate(
          {
            input: {
              variantId: variant.id,
              qty,
              unitCost: parseAmount(cost),
              supplierId: supplierId ?? null,
              reason: reason.trim() || null,
            },
            productId,
          },
          { onSuccess: () => onSuccess(qty), onError },
        );
        return;
      }

      const delta = mode === 'remove' ? -qty : qty;
      adjust.mutate(
        {
          variantId: variant.id,
          productId,
          qtyDelta: delta,
          type: MODE_TO_TYPE[mode],
          reason: reason.trim() || null,
        },
        { onSuccess: () => onSuccess(delta), onError },
      );
    };

    const status = variant ? variantStockStatus(variant) : 'in-stock';
    const maxRemove = variant?.stockQty ?? 0;
    const busy = adjust.isPending || receive.isPending;

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

            {mode === 'restock' ? (
              <View className="gap-4">
                <SwitchRow
                  label={t('stock.thisIsPurchase')}
                  caption={t('stock.thisIsPurchaseCaption')}
                  value={isPurchase}
                  onChange={setIsPurchase}
                />
                {isPurchase ? (
                  <TextField
                    label={t('stock.unitCost')}
                    prefix={currencySymbol}
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="decimal-pad"
                  />
                ) : null}
              </View>
            ) : null}

            <TextField
              label={mode === 'remove' ? t('stock.reasonRemove') : t('stock.note')}
              value={reason}
              onChangeText={setReason}
            />

            {mode === 'restock' && isPurchase && parseAmount(cost) > 0 ? (
              <View className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3">
                <Text variant="caption" tone="secondary">
                  {t('stock.totalCost')}
                </Text>
                <Text variant="body" weight="semibold" tabular>
                  {currencySymbol}
                  {(parseAmount(cost) * qty).toFixed(2)}
                </Text>
              </View>
            ) : null}

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
              loading={busy}
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
