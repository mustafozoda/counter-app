import { TicketPercent } from 'lucide-react-native';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Chip, IconButton, SegmentedControl, Sheet, Text, TextField, type SheetRef } from '@/components/ui';
import { usePromotions } from '@/features/promotions/hooks';
import { findPromotionByCode, promotionSummary, promotionToDiscount } from '@/features/promotions/validity';
import { getCurrencySpec } from '@/lib/format';
import { useCartStore } from '@/stores/cart';
import { toast } from '@/stores/toast';

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
  const { t } = useTranslation();
  const discount = useCartStore((s) => s.discount);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const promotions = usePromotions().data ?? [];

  const [kind, setKind] = useState<Kind>(discount?.kind ?? 'percent');
  const [value, setValue] = useState(discount ? String(discount.value) : '');
  const [coupon, setCoupon] = useState('');
  const symbol = getCurrencySpec(currency).symbol;

  const apply = (next: CartDiscount) => {
    setDiscount(next);
    dismiss();
  };

  const applyCoupon = () => {
    const promo = findPromotionByCode(promotions, coupon);
    if (!promo) {
      toast.error(t('pos.invalidCode'), t('pos.noLivePromo'));
      return;
    }
    toast.success(t('pos.couponApplied'), `${promo.name} · ${promotionSummary(promo)}`);
    apply(promotionToDiscount(promo));
    setCoupon('');
  };

  const parsed = Number.parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0 && (kind === 'fixed' || parsed <= 100);

  return (
    <Sheet ref={ref} title={t('pos.discountTitle')}>
      <View className="gap-4">
        <View className="flex-row items-end gap-2">
          <TextField
            label={t('pos.couponCode')}
            icon={TicketPercent}
            value={coupon}
            onChangeText={(v) => setCoupon(v.toUpperCase())}
            autoCapitalize="characters"
            containerClassName="flex-1"
            onSubmitEditing={applyCoupon}
            returnKeyType="done"
          />
          <IconButton
            icon={TicketPercent}
            variant="tonal"
            size={56}
            accessibilityLabel={t('actions.apply')}
            onPress={applyCoupon}
          />
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-hairline" />
          <Text variant="micro" tone="tertiary">
            {t('pos.or')}
          </Text>
          <View className="h-px flex-1 bg-hairline" />
        </View>

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
            { label: t('pos.percent'), value: 'percent' },
            { label: t('pos.amountSym', { symbol }), value: 'fixed' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <TextField
          label={kind === 'percent' ? t('pos.percentOff') : t('pos.amountOff')}
          prefix={kind === 'fixed' ? symbol : undefined}
          value={value}
          onChangeText={(v) => setValue(v.replace(',', '.'))}
          keyboardType="decimal-pad"
        />
        <Button
          label={t('pos.applyDiscount')}
          size="lg"
          fullWidth
          disabled={!valid}
          onPress={() => apply({ kind, value: parsed })}
        />
        {discount ? (
          <Button label={t('pos.removeDiscount')} variant="ghost" fullWidth onPress={() => apply(null)} />
        ) : null}
      </View>
    </Sheet>
  );
});
