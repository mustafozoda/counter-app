import { useRouter } from 'expo-router';
import { ArrowLeft, BadgePercent, Plus, Tag, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Screen,
  SegmentedControl,
  Sheet,
  Skeleton,
  SwipeableRow,
  SwitchRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import {
  useDeletePromotion,
  usePromotions,
  useSavePromotion,
  useSetPromotionActive,
} from '@/features/promotions/hooks';
import { isPromotionLive, promotionSummary } from '@/features/promotions/validity';
import { getCurrencySpec } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import type { PromotionType } from '@/types/models';

const TYPE_OPTIONS: { label: string; value: PromotionType }[] = [
  { label: 'Percent', value: 'percent' },
  { label: 'Fixed', value: 'fixed' },
  { label: 'BOGO', value: 'bogo' },
];

export default function PromotionsScreen() {
  const router = useRouter();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const symbol = getCurrencySpec(currency).symbol;

  const promotionsQuery = usePromotions();
  const savePromotion = useSavePromotion();
  const deletePromotion = useDeletePromotion();
  const setActive = useSetPromotionActive();

  const editSheet = useSheetRef();
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('percent');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');

  const promotions = promotionsQuery.data ?? [];

  const openNew = () => {
    setName('');
    setType('percent');
    setValue('');
    setCode('');
    editSheet.current?.present();
  };

  const submit = () => {
    if (name.trim().length < 2) {
      toast.error('Name needed', 'Give the promotion a name.');
      return;
    }
    const parsed = Number.parseFloat(value.replace(',', '.'));
    if (type !== 'bogo' && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error('Enter a value', type === 'percent' ? 'Percentage off' : 'Amount off');
      return;
    }
    // Percent is stored as a 0–1 ratio.
    const storedValue = type === 'percent' ? parsed / 100 : type === 'fixed' ? parsed : 0;
    savePromotion.mutate(
      {
        name: name.trim(),
        type,
        value: storedValue,
        code: code.trim() ? code.trim().toUpperCase() : null,
        startsAt: null,
        endsAt: null,
        active: true,
      },
      {
        onSuccess: () => {
          toast.success('Promotion saved', name.trim());
          editSheet.current?.dismiss();
        },
      },
    );
  };

  const confirmDelete = (id: string, label: string) =>
    Alert.alert('Delete promotion', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePromotion.mutate(id, { onSuccess: () => toast.success('Promotion deleted') }),
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
          <Text variant="h1" weight="bold">
            Promotions
          </Text>
        </View>
        <IconButton icon={Plus} variant="tonal" accessibilityLabel="Add promotion" onPress={openNew} />
      </View>

      {promotionsQuery.isLoading ? (
        <View className="gap-3 px-5 pt-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} radius={20} />
          ))}
        </View>
      ) : promotions.length === 0 ? (
        <View className="flex-1 justify-center pb-16">
          <EmptyState
            icon={BadgePercent}
            title="Run a promotion"
            message="Create coupon codes and discounts to apply at checkout."
            actionLabel="Add a promotion"
            onAction={openNew}
          />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-2.5 px-5 pb-16 pt-3" showsVerticalScrollIndicator={false}>
          {promotions.map((promo, index) => {
            const live = isPromotionLive(promo);
            return (
              <Animated.View
                key={promo.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <SwipeableRow
                  actions={[
                    { icon: Trash2, label: 'Delete', tone: 'negative', onPress: () => confirmDelete(promo.id, promo.name) },
                  ]}
                >
                  <Card className="gap-3">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-tint">
                        <Tag size={18} color="#4F46E5" strokeWidth={2} />
                      </View>
                      <View className="flex-1">
                        <Text variant="body" weight="semibold">
                          {promo.name}
                        </Text>
                        <Text variant="caption" tone="tertiary">
                          {promotionSummary(promo)}
                          {promo.code ? ` · code ${promo.code}` : ''}
                        </Text>
                      </View>
                      {promo.code ? <Badge label={promo.code} tone="accent" /> : null}
                    </View>
                    <SwitchRow
                      label={live ? 'Active' : 'Inactive'}
                      value={promo.active}
                      onChange={(active) => setActive.mutate({ id: promo.id, active })}
                    />
                  </Card>
                </SwipeableRow>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <Sheet ref={editSheet} title="New promotion">
        <View className="gap-4">
          <TextField label="Promotion name" value={name} onChangeText={setName} autoFocus />
          <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={setType} />
          {type !== 'bogo' ? (
            <TextField
              label={type === 'percent' ? 'Percent off' : 'Amount off'}
              prefix={type === 'fixed' ? symbol : undefined}
              value={value}
              onChangeText={(v) => setValue(v.replace(',', '.'))}
              keyboardType="decimal-pad"
            />
          ) : (
            <View className="rounded-md bg-surface-sunken p-4 dark:bg-surface">
              <Text variant="caption" tone="secondary">
                Buy one, get one — applied as up to 50% off the matched set at checkout.
              </Text>
            </View>
          )}
          <TextField
            label="Coupon code (optional)"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Button label="Save promotion" size="lg" fullWidth loading={savePromotion.isPending} onPress={submit} />
        </View>
      </Sheet>
    </Screen>
  );
}
