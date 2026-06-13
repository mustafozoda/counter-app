import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, PackagePlus, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  CurrencyText,
  IconButton,
  PressableScale,
  QuantityStepper,
  Screen,
  Sheet,
  Skeleton,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { purchaseOrderTotal } from '@/api/suppliers';
import { ProductImage } from '@/features/products/components/product-image';
import { useProducts } from '@/features/products/hooks';
import { variantLabel } from '@/features/products/stock';
import {
  useCreatePurchaseOrder,
  useDeleteSupplier,
  useSupplier,
} from '@/features/suppliers/hooks';
import { formatMoney, getCurrencySpec } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { PurchaseOrderItem } from '@/types/models';

interface DraftLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  qty: number;
  unitCost: number;
}

export default function SupplierDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const symbol = getCurrencySpec(currency).symbol;

  const supplierQuery = useSupplier(id);
  const productsQuery = useProducts();
  const createPo = useCreatePurchaseOrder();
  const deleteSupplier = useDeleteSupplier();

  const pickerSheet = useSheetRef();
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});

  const supplier = supplierQuery.data;
  const products = productsQuery.data ?? [];
  const draftLines = useMemo(() => Object.values(draft).filter((l) => l.qty > 0), [draft]);
  const total = purchaseOrderTotal(
    draftLines.map((l) => ({ variantId: l.variantId, qty: l.qty, unitCost: l.unitCost })),
  );

  if (supplierQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={120} radius={24} />
        </View>
      </Screen>
    );
  }

  if (!supplier) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          This supplier no longer exists.
        </Text>
      </Screen>
    );
  }

  const setLine = (variantId: string, patch: Partial<DraftLine>, base: DraftLine) =>
    setDraft((prev) => ({ ...prev, [variantId]: { ...base, ...prev[variantId], ...patch } }));

  const submitPo = () => {
    if (draftLines.length === 0) {
      toast.error('Nothing to order', 'Add at least one product.');
      return;
    }
    const items: PurchaseOrderItem[] = draftLines.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      unitCost: l.unitCost,
    }));
    createPo.mutate(
      { supplierId: supplier.id, items },
      {
        onSuccess: () => {
          toast.success('Purchase order created', `${draftLines.length} items · ${formatMoney(total, currency)}`);
          setDraft({});
          router.back();
        },
      },
    );
  };

  const confirmDelete = () =>
    Alert.alert('Delete supplier', `Remove "${supplier.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteSupplier.mutate(supplier.id, {
            onSuccess: () => {
              toast.success('Supplier deleted', supplier.name);
              router.back();
            },
          }),
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <IconButton icon={Trash2} accessibilityLabel="Delete supplier" onPress={confirmDelete} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-32" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} className="pt-3">
          <Text variant="display" weight="bold">
            {supplier.name}
          </Text>
          {supplier.contact ? (
            <Text variant="body" tone="secondary" className="mt-1">
              {supplier.contact}
            </Text>
          ) : null}
          {supplier.notes ? (
            <Text variant="caption" tone="tertiary" className="mt-2">
              {supplier.notes}
            </Text>
          ) : null}
        </Animated.View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text variant="h2" weight="semibold">
            New purchase order
          </Text>
          <Button label="Add items" size="sm" variant="secondary" icon={Plus} onPress={() => pickerSheet.current?.present()} />
        </View>

        {draftLines.length === 0 ? (
          <Card className="mt-3 items-center gap-2 py-8">
            <PackagePlus size={26} color={colors.inkTertiary} strokeWidth={1.75} />
            <Text variant="caption" tone="tertiary">
              Add products to build a purchase order.
            </Text>
          </Card>
        ) : (
          <View className="mt-3 gap-2.5">
            {draftLines.map((line) => (
              <Card key={line.variantId} className="gap-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text variant="body" weight="semibold" numberOfLines={1}>
                      {line.productName}
                    </Text>
                    {line.variantLabel !== 'Default' ? (
                      <Text variant="caption" tone="tertiary">
                        {line.variantLabel}
                      </Text>
                    ) : null}
                  </View>
                  <QuantityStepper
                    value={line.qty}
                    min={0}
                    onChange={(qty) => setLine(line.variantId, { qty }, line)}
                  />
                </View>
                <TextField
                  label={`Unit cost (${symbol})`}
                  value={String(line.unitCost)}
                  onChangeText={(v) => {
                    const cost = Number.parseFloat(v.replace(',', '.'));
                    setLine(line.variantId, { unitCost: Number.isFinite(cost) ? cost : 0 }, line);
                  }}
                  keyboardType="decimal-pad"
                />
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {draftLines.length > 0 ? (
        <Animated.View entering={FadeInDown.springify().damping(18)} className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-8 pt-3 dark:bg-surface-elevated">
          <View className="mb-3 flex-row items-center justify-between">
            <Text variant="body" tone="secondary">
              Total cost
            </Text>
            <CurrencyText amount={total} currency={currency} variant="h2" />
          </View>
          <Button label="Create purchase order" size="lg" fullWidth loading={createPo.isPending} onPress={submitPo} />
        </Animated.View>
      ) : null}

      <Sheet ref={pickerSheet} title="Add products" snapPoints={['70%']}>
        <ScrollView contentContainerClassName="gap-2 pb-6" showsVerticalScrollIndicator={false}>
          {products.length === 0 ? (
            <Text variant="body" tone="tertiary" className="py-6 text-center">
              No products yet — add some in the catalog first.
            </Text>
          ) : (
            products.flatMap((product) =>
              product.variants.map((variant) => {
                const inDraft = (draft[variant.id]?.qty ?? 0) > 0;
                const base: DraftLine = {
                  variantId: variant.id,
                  productName: product.name,
                  variantLabel: variantLabel(variant),
                  qty: 0,
                  unitCost: product.cost,
                };
                return (
                  <PressableScale
                    key={variant.id}
                    scaleTo={0.98}
                    haptic="selection"
                    onPress={() =>
                      setLine(variant.id, { qty: (draft[variant.id]?.qty ?? 0) + 1 }, base)
                    }
                    accessibilityRole="button"
                    className={`flex-row items-center gap-3 rounded-md px-3 py-2.5 ${inDraft ? 'bg-primary-tint' : ''}`}
                  >
                    <ProductImage product={product} size={40} radius={10} />
                    <View className="flex-1">
                      <Text variant="body" weight="medium" numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {variantLabel(variant)} · cost {formatMoney(product.cost, currency)}
                      </Text>
                    </View>
                    {inDraft ? <Badge label={`×${draft[variant.id]?.qty}`} tone="accent" /> : <Plus size={18} color={colors.inkTertiary} strokeWidth={2} />}
                  </PressableScale>
                );
              }),
            )
          )}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
