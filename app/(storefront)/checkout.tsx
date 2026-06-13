import { useRouter } from 'expo-router';
import { Banknote, CalendarClock, CreditCard, Truck, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Button,
  CurrencyText,
  IconButton,
  PressableScale,
  Screen,
  SuccessCheck,
  Text,
  TextField,
} from '@/components/ui';
import { useCreateSale } from '@/features/pos/hooks';
import type { CartLine, PaymentEntry } from '@/features/pos/totals';
import { storefrontTotals } from '@/features/storefront/totals';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { STAGGER_MS, useTheme } from '@/theme';
import type { PaymentMethod } from '@/types/models';

type Method = Extract<PaymentMethod, 'card' | 'cash' | 'installment'>;

export default function StorefrontCheckout() {
  const router = useRouter();
  const { colors } = useTheme();
  const store = useStoreProfile((s) => s.store);
  const currency = store?.currencyCode ?? 'TJS';

  const lines = useStorefrontCart((s) => s.lines);
  const clear = useStorefrontCart((s) => s.clear);
  const createSale = useCreateSale();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<Method>('card');
  const [done, setDone] = useState(false);

  const totals = storefrontTotals(lines, store?.taxRate ?? 0);

  const place = () => {
    if (name.trim().length < 2 || address.trim().length < 4) {
      toast.error('Add delivery details', 'We need a name and address to ship.');
      return;
    }
    // Online orders flow through the same sale pipeline as the POS, tagged as
    // an online channel via the receipt note; stock + finance stay consistent.
    const saleLines: CartLine[] = lines.map((l) => ({
      variantId: l.variantId,
      productId: l.productId,
      productName: l.productName,
      variantLabel: l.variantLabel,
      sku: '',
      unitPrice: l.unitPrice,
      taxRate: store?.taxRate ?? 0,
      qty: l.qty,
      available: l.available,
      imageUri: l.imageUri,
    }));
    const payments: PaymentEntry[] = [
      { method: method === 'installment' ? 'installment' : method, amount: totals.total, ref: 'ONLINE' },
    ];

    createSale.mutate(
      {
        lines: saleLines,
        totals: { subtotal: totals.subtotal, discount: 0, tax: totals.tax, total: totals.total, itemCount: totals.itemCount },
        payments,
        customerId: null,
      },
      {
        onSuccess: () => {
          haptics.success();
          clear();
          setDone(true);
        },
        onError: () => toast.error('Checkout failed', 'Please try again.'),
      },
    );
  };

  if (done) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']} contentClassName="justify-center">
        <View className="items-center">
          <SuccessCheck size={128} />
          <Animated.View entering={FadeInDown.delay(STAGGER_MS * 4).springify().damping(18)} className="mt-8 items-center">
            <Text variant="display" weight="bold" className="text-center">
              Order placed!
            </Text>
            <Text variant="body" tone="secondary" className="mt-2 text-center">
              Thank you, {name.split(' ')[0] || 'friend'}. We&apos;ll get it ready right away.
            </Text>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(STAGGER_MS * 7).springify().damping(18)} className="mt-12 w-full">
          <Button label="Keep shopping" size="lg" fullWidth onPress={() => router.replace('/(storefront)/(tabs)')} />
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']} padded={false} keyboardAvoid>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text variant="h1" weight="bold">
          Checkout
        </Text>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-3" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="h2" weight="semibold" className="mb-3">
          Delivery
        </Text>
        <View className="gap-4">
          <TextField label="Full name" value={name} onChangeText={setName} />
          <TextField label="Delivery address" value={address} onChangeText={setAddress} multiline />
        </View>

        <Text variant="h2" weight="semibold" className="mb-3 mt-7">
          Payment
        </Text>
        <View className="gap-2.5">
          {(
            [
              { value: 'card', icon: CreditCard, label: 'Card', caption: 'Pay securely online' },
              { value: 'cash', icon: Banknote, label: 'Cash on delivery', caption: 'Pay when it arrives' },
              { value: 'installment', icon: CalendarClock, label: 'Pay over time', caption: 'Split into installments' },
            ] as const
          ).map((option) => {
            const selected = method === option.value;
            return (
              <PressableScale
                key={option.value}
                scaleTo={0.98}
                onPress={() => setMethod(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`flex-row items-center gap-3 rounded-md border p-4 ${
                  selected ? 'border-primary bg-primary-tint' : 'border-hairline bg-surface dark:bg-surface-elevated'
                }`}
              >
                <View className={`h-10 w-10 items-center justify-center rounded-full ${selected ? 'bg-surface dark:bg-surface-elevated' : 'bg-surface-sunken dark:bg-surface'}`}>
                  <option.icon size={18} color={selected ? colors.primary : colors.inkSecondary} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text variant="body" weight="semibold" tone={selected ? 'accent' : 'primary'}>
                    {option.label}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {option.caption}
                  </Text>
                </View>
                <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-primary' : 'border-hairline'}`}>
                  {selected ? <View className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                </View>
              </PressableScale>
            );
          })}
        </View>

        <View className="mt-7 gap-1.5 rounded-md bg-surface-sunken p-4 dark:bg-surface">
          <View className="flex-row justify-between">
            <Text variant="body" tone="secondary">
              Subtotal
            </Text>
            <Text variant="body" weight="medium" tabular>
              {formatMoney(totals.subtotal, currency)}
            </Text>
          </View>
          {totals.tax > 0 ? (
            <View className="flex-row justify-between">
              <Text variant="body" tone="secondary">
                Tax
              </Text>
              <Text variant="body" weight="medium" tabular>
                {formatMoney(totals.tax, currency)}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone="tertiary">
              Delivery
            </Text>
            <Text variant="caption" tone="tertiary">
              Calculated at fulfillment
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-9 pt-4 dark:bg-surface-elevated">
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Truck size={16} color={colors.inkSecondary} strokeWidth={2} />
            <Text variant="body" tone="secondary">
              {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'}
            </Text>
          </View>
          <CurrencyText amount={totals.total} currency={currency} variant="h2" />
        </View>
        <Button label="Place order" size="lg" fullWidth loading={createSale.isPending} onPress={place} />
      </View>
    </Screen>
  );
}
