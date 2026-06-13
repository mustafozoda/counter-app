import { forwardRef, useState } from 'react';
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

const MODE_OPTIONS: { label: string; value: AdjustMode }[] = [
  { label: 'Restock', value: 'restock' },
  { label: 'Remove', value: 'remove' },
  { label: 'Return', value: 'return' },
];

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
    const [mode, setMode] = useState<AdjustMode>('restock');
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('');
    const adjust = useAdjustStock();

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
              'Stock updated',
              `${variantLabel(variant)}: ${delta > 0 ? '+' : ''}${delta} units`,
            );
            dismiss();
          },
          onError: () => toast.error('Could not update stock'),
        },
      );
    };

    const status = variant ? variantStockStatus(variant) : 'in-stock';
    const maxRemove = variant?.stockQty ?? 0;

    return (
      <Sheet ref={ref} title="Adjust stock" onDismiss={reset}>
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
                label={`${variant.stockQty} on hand`}
                tone={status === 'in-stock' ? 'positive' : status === 'low' ? 'caution' : 'negative'}
                dot
              />
            </View>

            <SegmentedControl
              options={MODE_OPTIONS}
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
                  Nothing on hand to remove.
                </Text>
              ) : null}
            </View>

            <TextField
              label={mode === 'remove' ? 'Reason (damage, loss…)' : 'Note (optional)'}
              value={reason}
              onChangeText={setReason}
            />

            <Button
              label={
                mode === 'restock'
                  ? `Add ${qty} to stock`
                  : mode === 'return'
                    ? `Return ${qty} to stock`
                    : `Remove ${qty} from stock`
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
