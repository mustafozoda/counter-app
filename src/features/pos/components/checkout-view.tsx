import {
  Banknote,
  CalendarClock,
  CreditCard,
  Landmark,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Badge, Button, Chip, CurrencyText, PressableScale, Text, TextField } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';
import type { PaymentMethod } from '@/types/models';

import { PAYMENT_METHOD_LABELS } from '../receipt';
import { cashSuggestions, changeDue, remainingDue, type CartTotals, type PaymentEntry } from '../totals';

interface MethodMeta {
  method: PaymentMethod;
  icon: LucideIcon;
  enabled: boolean;
  note?: string;
}

const METHODS: MethodMeta[] = [
  { method: 'cash', icon: Banknote, enabled: true },
  { method: 'card', icon: CreditCard, enabled: true, note: 'manual capture' },
  { method: 'transfer', icon: Landmark, enabled: true },
  { method: 'installment', icon: CalendarClock, enabled: false, note: 'Phase 5' },
];

export interface CheckoutViewProps {
  currency: string;
  totals: CartTotals;
  busy: boolean;
  onComplete: (payments: PaymentEntry[], change: number) => void;
}

/** Payment collection: one-tap single payments or any split that reaches zero. */
export function CheckoutView({ currency, totals, busy, onComplete }: CheckoutViewProps) {
  const { colors } = useTheme();
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [reference, setReference] = useState('');
  const [change, setChange] = useState(0);

  const remaining = remainingDue(totals.total, payments);
  const settled = remaining <= 0 && payments.length > 0;

  const parsedTendered = Number.parseFloat(tendered.replace(',', '.'));
  const tenderValid = Number.isFinite(parsedTendered) && parsedTendered > 0;
  const previewChange = method === 'cash' && tenderValid ? changeDue(parsedTendered, remaining) : 0;

  const addPayment = (amountRaw: number) => {
    const applied = Math.min(amountRaw, remaining);
    if (applied <= 0) return;
    if (method === 'cash') setChange(changeDue(amountRaw, remaining));
    setPayments((prev) => [
      ...prev,
      { method, amount: applied, ref: reference.trim() || null },
    ]);
    setTendered('');
    setReference('');
  };

  const removePayment = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
    setChange(0);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-5 pb-10"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.springify().damping(18)} className="items-center py-6">
        <Text variant="caption" tone="secondary">
          {settled ? 'Paid in full' : payments.length > 0 ? 'Remaining' : 'Total due'}
        </Text>
        <CurrencyText
          amount={settled ? totals.total : remaining}
          currency={currency}
          variant="displayLg"
          animated
          tone={settled ? 'positive' : 'primary'}
        />
        {payments.length > 0 && !settled ? (
          <Text variant="caption" tone="tertiary" tabular>
            of {formatMoney(totals.total, currency)} total
          </Text>
        ) : null}
      </Animated.View>

      <View className="flex-row gap-2.5">
        {METHODS.map((meta) => {
          const selected = method === meta.method;
          return (
            <PressableScale
              key={meta.method}
              disabled={!meta.enabled || settled}
              onPress={() => setMethod(meta.method)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !meta.enabled }}
              className={`flex-1 items-center gap-1.5 rounded-md border py-3.5 ${
                selected
                  ? 'border-primary bg-primary-tint'
                  : 'border-hairline bg-surface dark:bg-surface-elevated'
              } ${!meta.enabled || settled ? 'opacity-45' : ''}`}
            >
              <meta.icon
                size={20}
                color={selected ? colors.primary : colors.inkSecondary}
                strokeWidth={2}
              />
              <Text variant="micro" weight="semibold" tone={selected ? 'accent' : 'secondary'}>
                {PAYMENT_METHOD_LABELS[meta.method]}
              </Text>
              {meta.note ? (
                <Text variant="micro" tone="tertiary">
                  {meta.note}
                </Text>
              ) : null}
            </PressableScale>
          );
        })}
      </View>

      {!settled ? (
        <Animated.View key={method} entering={FadeInDown.springify().damping(18)} className="mt-5 gap-4">
          {method === 'cash' ? (
            <>
              <View className="flex-row flex-wrap gap-2">
                {cashSuggestions(remaining).map((amount) => (
                  <Chip
                    key={amount}
                    label={formatMoney(amount, currency)}
                    onPress={() => addPayment(amount)}
                  />
                ))}
              </View>
              <TextField
                label="Cash received"
                value={tendered}
                onChangeText={(v) => setTendered(v.replace(',', '.'))}
                keyboardType="decimal-pad"
                helper={
                  previewChange > 0 ? `Change due: ${formatMoney(previewChange, currency)}` : undefined
                }
              />
              <Button
                label={tenderValid ? `Add ${formatMoney(Math.min(parsedTendered, remaining), currency)} cash` : 'Add cash payment'}
                size="lg"
                fullWidth
                disabled={!tenderValid}
                onPress={() => addPayment(parsedTendered)}
              />
            </>
          ) : (
            <>
              <TextField
                label={`Amount (${PAYMENT_METHOD_LABELS[method].toLowerCase()})`}
                value={tendered}
                onChangeText={(v) => setTendered(v.replace(',', '.'))}
                keyboardType="decimal-pad"
                helper={`Defaults to the remaining ${formatMoney(remaining, currency)}`}
              />
              <TextField
                label="Reference (optional)"
                value={reference}
                onChangeText={setReference}
                autoCapitalize="characters"
              />
              <Button
                label={`Add ${PAYMENT_METHOD_LABELS[method].toLowerCase()} payment`}
                size="lg"
                fullWidth
                onPress={() => addPayment(tenderValid ? parsedTendered : remaining)}
              />
            </>
          )}
        </Animated.View>
      ) : null}

      {payments.length > 0 ? (
        <View className="mt-6 gap-2">
          <Text variant="caption" weight="medium" tone="tertiary">
            PAYMENTS
          </Text>
          {payments.map((payment, index) => (
            <Animated.View
              key={`${payment.method}-${index}`}
              layout={LinearTransition.springify().damping(20)}
              entering={FadeInDown.springify().damping(18)}
              className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 dark:bg-surface-elevated"
            >
              <Badge label={PAYMENT_METHOD_LABELS[payment.method]} tone="accent" />
              {payment.ref ? (
                <Text variant="caption" tone="tertiary" mono numberOfLines={1} className="flex-1">
                  {payment.ref}
                </Text>
              ) : (
                <View className="flex-1" />
              )}
              <Text variant="body" weight="semibold" tabular>
                {formatMoney(payment.amount, currency)}
              </Text>
              <PressableScale
                onPress={() => removePayment(index)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove payment"
                className="h-7 w-7 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface"
              >
                <X size={14} color={colors.inkSecondary} strokeWidth={2.5} />
              </PressableScale>
            </Animated.View>
          ))}
          {change > 0 ? (
            <View className="flex-row items-center justify-between rounded-md bg-positive-tint px-4 py-3">
              <Text variant="body" weight="semibold" tone="positive">
                Change due
              </Text>
              <Text variant="title" weight="bold" tone="positive" tabular>
                {formatMoney(change, currency)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {settled ? (
        <Animated.View entering={FadeInDown.springify().damping(16)} className="mt-8">
          <Button
            label="Complete sale"
            size="lg"
            fullWidth
            loading={busy}
            onPress={() => onComplete(payments, change)}
          />
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}
