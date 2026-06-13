import { forwardRef, useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, SegmentedControl, Sheet, TextField, type SheetRef } from '@/components/ui';
import { getCurrencySpec } from '@/lib/format';
import { useCartStore } from '@/stores/cart';

import type { CartDiscount } from '../totals';

const PERCENT_PRESETS = [5, 10, 15, 20];

type Kind = 'percent' | 'fixed';

export interface DiscountSheetProps {
  currency: string;
  dismiss: () => void;
}

/** Whole-cart discount: quick percent presets or a custom percent/amount. */
export const DiscountSheet = forwardRef<SheetRef, DiscountSheetProps>(function DiscountSheet(
  { currency, dismiss },
  ref,
) {
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);

  const [kind, setKind] = useState<Kind>(discount?.kind ?? 'percent');
  const [value, setValue] = useState(discount ? String(discount.value) : '');
  const symbol = getCurrencySpec(currency).symbol;

  const apply = (next: CartDiscount) => {
    setDiscount(next);
    dismiss();
  };

  const parsed = Number.parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0 && (kind === 'fixed' || parsed <= 100);

  return (
    <Sheet ref={ref} title="Discount">
      <View className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          {PERCENT_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={`${preset}%`}
              selected={discount?.kind === 'percent' && discount.value === preset}
              onPress={() => apply({ kind: 'percent', value: preset })}
            />
          ))}
        </View>

        <SegmentedControl<Kind>
          options={[
            { label: 'Percent %', value: 'percent' },
            { label: `Amount ${symbol}`, value: 'fixed' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <TextField
          label={kind === 'percent' ? 'Percent off' : 'Amount off'}
          prefix={kind === 'fixed' ? symbol : undefined}
          value={value}
          onChangeText={(v) => setValue(v.replace(',', '.'))}
          keyboardType="decimal-pad"
        />
        <Button
          label="Apply discount"
          size="lg"
          fullWidth
          disabled={!valid}
          onPress={() => apply({ kind, value: parsed })}
        />
        {discount ? (
          <Button label="Remove discount" variant="ghost" fullWidth onPress={() => apply(null)} />
        ) : null}
      </View>
    </Sheet>
  );
});
