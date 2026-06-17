import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Ban, CheckCircle2, PackageCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  CurrencyText,
  IconButton,
  QuantityStepper,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { ProductImage } from '@/features/products/components/product-image';
import { useProducts } from '@/features/products/hooks';
import { variantLabel } from '@/features/products/stock';
import {
  useCancelPurchaseOrder,
  usePurchaseOrder,
  useReceivePurchaseOrderItems,
  useSuppliers,
} from '@/features/suppliers/hooks';
import { formatDayLabel, formatMoney, getCurrencySpec } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { ProductWithVariants } from '@/features/products/stock';
import type { PurchaseOrderStatus } from '@/types/models';

const round2 = (n: number) => Math.round(n * 100) / 100;
const parseAmount = (raw: string): number => {
  const value = Number.parseFloat(raw.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const PO_BADGE: Record<
  PurchaseOrderStatus,
  { labelKey: string; tone: 'positive' | 'caution' | 'neutral' | 'info' }
> = {
  draft: { labelKey: 'suppliers.statusDraft', tone: 'neutral' },
  ordered: { labelKey: 'suppliers.statusOrdered', tone: 'info' },
  partial: { labelKey: 'suppliers.statusPartial', tone: 'caution' },
  received: { labelKey: 'suppliers.statusReceived', tone: 'positive' },
  cancelled: { labelKey: 'suppliers.statusCancelled', tone: 'neutral' },
};

export default withPermission(PurchaseOrderScreen, 'manage_inventory');

function PurchaseOrderScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const symbol = getCurrencySpec(currency).symbol;

  const poQuery = usePurchaseOrder(id);
  const productsQuery = useProducts();
  const suppliersQuery = useSuppliers();
  const receive = useReceivePurchaseOrderItems();
  const cancelPo = useCancelPurchaseOrder();

  const po = poQuery.data;
  const products: ProductWithVariants[] = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const variantInfo = useMemo(() => {
    const map = new Map<string, { product: ProductWithVariants; label: string }>();
    for (const product of products) {
      for (const variant of product.variants) {
        map.set(variant.id, { product, label: variantLabel(variant) });
      }
    }
    return map;
  }, [products]);

  // receipts: how much of each line to receive now, and at what unit cost.
  const [receipts, setReceipts] = useState<Record<string, { qty: number; cost: string }>>({});

  useEffect(() => {
    if (!po) return;
    const init: Record<string, { qty: number; cost: string }> = {};
    for (const item of po.items) {
      const remaining = Math.max(0, item.qty - (item.receivedQty ?? 0));
      init[item.variantId] = { qty: remaining, cost: String(item.unitCost) };
    }
    setReceipts(init);
  }, [po?.id]);

  if (poQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={120} radius={24} />
          <Skeleton height={88} radius={20} />
        </View>
      </Screen>
    );
  }

  if (!po) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          {t('po.gone')}
        </Text>
      </Screen>
    );
  }

  const supplier = suppliersQuery.data?.find((s) => s.id === po.supplierId);
  const editable = po.status === 'ordered' || po.status === 'partial';
  const badge = PO_BADGE[po.status];

  const lines = po.items.map((item) => {
    const info = variantInfo.get(item.variantId);
    const ordered = item.qty;
    const already = item.receivedQty ?? 0;
    const remaining = Math.max(0, ordered - already);
    const entry = receipts[item.variantId] ?? { qty: 0, cost: String(item.unitCost) };
    return { item, info, ordered, already, remaining, qty: entry.qty, cost: entry.cost };
  });

  const totalUnits = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalCost = round2(lines.reduce((sum, l) => sum + l.qty * parseAmount(l.cost), 0));

  const setLine = (variantId: string, patch: Partial<{ qty: number; cost: string }>) =>
    setReceipts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] ?? { qty: 0, cost: '' }), ...patch },
    }));

  const submit = () => {
    const payload = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({ variantId: l.item.variantId, qty: l.qty, unitCost: parseAmount(l.cost) }));
    if (payload.length === 0) {
      toast.error(t('po.nothingToReceive'), t('po.nothingToReceiveBody'));
      return;
    }
    const willComplete =
      lines.every((l) => l.already + (l.qty > 0 ? l.qty : 0) >= l.ordered);
    receive.mutate(
      { id: po.id, receipts: payload },
      {
        onSuccess: () => {
          toast.success(
            willComplete ? t('po.received') : t('po.partiallyReceived'),
            t('suppliers.unitsAdded', { count: totalUnits }),
          );
          router.back();
        },
        onError: () => toast.error(t('po.couldNotReceive')),
      },
    );
  };

  const confirmCancel = () =>
    Alert.alert(t('po.cancelTitle'), t('po.cancelBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('po.cancelConfirm'),
        style: 'destructive',
        onPress: () =>
          cancelPo.mutate(po.id, {
            onSuccess: () => {
              toast.success(t('po.cancelled'));
              router.back();
            },
          }),
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        {editable ? (
          <IconButton icon={Ban} accessibilityLabel={t('po.cancelOrder')} onPress={confirmCancel} />
        ) : null}
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40 pt-3" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} className="gap-1">
          <View className="flex-row items-center justify-between">
            <Text variant="display" weight="bold">
              {supplier?.name ?? t('po.title')}
            </Text>
            <Badge label={t(badge.labelKey)} tone={badge.tone} dot={po.status === 'ordered'} />
          </View>
          <Text variant="body" tone="secondary">
            {t('suppliers.units', { count: po.items.reduce((s, i) => s + i.qty, 0) })} ·{' '}
            {formatDayLabel(new Date(po.createdAt))}
          </Text>
        </Animated.View>

        <Text variant="h2" weight="semibold" className="mt-6">
          {editable ? t('po.reviewDelivery') : t('po.items')}
        </Text>
        {editable ? (
          <Text variant="caption" tone="tertiary" className="mb-1 mt-1">
            {t('po.reviewHint')}
          </Text>
        ) : null}

        <View className="mt-3 gap-2.5">
          {lines.map((line, index) => {
            const fullyReceived = line.remaining === 0;
            return (
              <Animated.View
                key={line.item.variantId}
                entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(18)}
              >
                <Card className="gap-3">
                  <View className="flex-row items-center gap-3">
                    {line.info ? <ProductImage product={line.info.product} size={40} radius={10} /> : null}
                    <View className="flex-1">
                      <Text variant="body" weight="semibold" numberOfLines={1}>
                        {line.info?.product.name ?? t('po.unknownItem')}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {line.info && line.info.label !== 'Default' ? `${line.info.label} · ` : ''}
                        {t('po.orderedQty', { count: line.ordered })}
                        {line.already > 0 ? ` · ${t('po.receivedQty', { count: line.already })}` : ''}
                      </Text>
                    </View>
                    {fullyReceived ? (
                      <CheckCircle2 size={22} color={colors.positive} strokeWidth={2} />
                    ) : null}
                  </View>

                  {editable && !fullyReceived ? (
                    <View className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <Text variant="caption" tone="secondary">
                          {t('po.receiveNow')}
                        </Text>
                        <QuantityStepper
                          value={line.qty}
                          min={0}
                          max={line.remaining}
                          onChange={(qty) => setLine(line.item.variantId, { qty })}
                        />
                      </View>
                      <TextField
                        label={t('stock.unitCost')}
                        prefix={symbol}
                        value={line.cost}
                        onChangeText={(cost) => setLine(line.item.variantId, { cost })}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between">
                      <Text variant="caption" tone="tertiary">
                        {t('suppliers.cost', { amount: formatMoney(line.item.unitCost, currency) })}
                      </Text>
                      <Text variant="body" weight="semibold" tabular>
                        {formatMoney(line.item.unitCost * line.ordered, currency)}
                      </Text>
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {editable ? (
        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-8 pt-3 dark:bg-surface-elevated"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="body" tone="secondary">
              {t('po.receivingSummary', { count: totalUnits })}
            </Text>
            <CurrencyText amount={totalCost} currency={currency} variant="h2" />
          </View>
          <Button
            label={t('po.receiveSelected')}
            size="lg"
            fullWidth
            icon={PackageCheck}
            loading={receive.isPending}
            disabled={totalUnits === 0}
            onPress={submit}
          />
        </Animated.View>
      ) : null}
    </Screen>
  );
}
