import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Card,
  CurrencyText,
  IconButton,
  Screen,
  Skeleton,
  Text,
  useSheetRef,
} from '@/components/ui';
import { AdjustStockSheet } from '@/features/products/components/adjust-stock-sheet';
import { ProductImage } from '@/features/products/components/product-image';
import {
  useCategories,
  useDeleteProduct,
  useMovements,
  useProduct,
  useSetProductStatus,
} from '@/features/products/hooks';
import {
  marginRatio,
  totalStock,
  variantLabel,
  variantPrice,
  variantStockStatus,
} from '@/features/products/stock';
import { formatDateTime, formatMoney, formatPercentDelta } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import type { ProductVariant, StockMovement } from '@/types/models';

const MOVEMENT_META: Record<
  StockMovement['type'],
  { label: string; icon: typeof ArrowDownLeft }
> = {
  restock: { label: 'Restock', icon: ArrowDownLeft },
  sale: { label: 'Sale', icon: ArrowUpRight },
  adjustment: { label: 'Adjustment', icon: RotateCcw },
  return: { label: 'Return', icon: Undo2 },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');

  const productQuery = useProduct(id);
  const movementsQuery = useMovements(id);
  const categoriesQuery = useCategories();
  const setStatus = useSetProductStatus();
  const deleteProduct = useDeleteProduct();

  const adjustSheet = useSheetRef();
  const [adjusting, setAdjusting] = useState<ProductVariant | null>(null);

  const product = productQuery.data;

  if (productQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={220} radius={24} />
          <Skeleton height={28} width={220} />
          <Skeleton height={88} radius={20} />
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          This product no longer exists.
        </Text>
      </Screen>
    );
  }

  const category = categoriesQuery.data?.find((c) => c.id === product.categoryId);
  const units = totalStock(product.variants);
  const stockValue = product.variants.reduce((sum, v) => sum + v.stockQty * product.cost, 0);
  const margin = marginRatio(product.cost, product.basePrice);
  const archived = product.status === 'archived';

  const confirmDelete = () => {
    Alert.alert('Delete product', `"${product.name}" and its stock history will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteProduct.mutate(product.id, {
            onSuccess: () => {
              toast.success('Product deleted', product.name);
              router.back();
            },
          }),
      },
    ]);
  };

  const toggleArchive = () =>
    setStatus.mutate(
      { id: product.id, status: archived ? 'active' : 'archived' },
      {
        onSuccess: () =>
          toast.success(archived ? 'Product restored' : 'Product archived', product.name),
      },
    );

  const openAdjust = (variant: ProductVariant) => {
    setAdjusting(variant);
    adjustSheet.current?.present();
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <View className="flex-row gap-2">
          <IconButton
            icon={archived ? ArchiveRestore : Archive}
            accessibilityLabel={archived ? 'Restore product' : 'Archive product'}
            onPress={toggleArchive}
          />
          <IconButton icon={Trash2} accessibilityLabel="Delete product" onPress={confirmDelete} />
          <IconButton
            icon={Pencil}
            variant="tonal"
            accessibilityLabel="Edit product"
            onPress={() => router.push({ pathname: '/product-form', params: { id: product.id } })}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-16 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify().damping(18)}>
          {product.images.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
              <View className="flex-row gap-3 pr-10">
                {product.images.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={{ width: 240, height: 240, borderRadius: 24 }}
                    contentFit="cover"
                    transition={150}
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="items-center">
              <ProductImage product={product} size={240} radius={24} />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).springify().damping(18)} className="mt-5 gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            {archived ? <Badge label="Archived" tone="neutral" /> : null}
            {product.status === 'draft' ? <Badge label="Draft" tone="info" /> : null}
            {category ? <Badge label={category.name} tone="accent" /> : null}
            {product.brand ? <Badge label={product.brand} /> : null}
          </View>
          <Text variant="display" weight="bold">
            {product.name}
          </Text>
          <View className="flex-row items-baseline gap-3">
            <CurrencyText amount={product.basePrice} currency={currency} variant="h1" />
            {margin !== null ? (
              <Text variant="caption" tone={margin >= 0 ? 'positive' : 'negative'} tabular>
                {formatPercentDelta(margin).replace('+', '')} margin · cost{' '}
                {formatMoney(product.cost, currency)}
              </Text>
            ) : null}
          </View>
          {product.description ? (
            <Text variant="body" tone="secondary" className="mt-1">
              {product.description}
            </Text>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} className="mt-5 flex-row gap-3">
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="secondary">
              Units on hand
            </Text>
            <Text variant="displaySm" weight="semibold" tabular>
              {units}
            </Text>
          </Card>
          <Card className="flex-1 gap-1">
            <Text variant="caption" tone="secondary">
              Stock value (cost)
            </Text>
            <CurrencyText amount={stockValue} currency={currency} variant="displaySm" />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            Variants
          </Text>
          <Card padded={false}>
            {product.variants.map((variant, index) => {
              const status = variantStockStatus(variant);
              return (
                <View
                  key={variant.id}
                  className={index < product.variants.length - 1 ? 'border-b border-hairline' : ''}
                >
                  <Animated.View entering={FadeInDown.delay(140 + index * 30).springify().damping(18)}>
                    <View className="flex-row items-center gap-3 px-4 py-3.5">
                      <View className="flex-1">
                        <Text variant="body" weight="medium">
                          {variantLabel(variant)}
                        </Text>
                        <Text variant="caption" tone="tertiary" mono>
                          {variant.sku}
                          {variant.barcode ? ` · ${variant.barcode}` : ''}
                        </Text>
                      </View>
                      <Text variant="body" weight="semibold" tabular>
                        {formatMoney(variantPrice(product, variant), currency)}
                      </Text>
                      <IconButton
                        icon={RotateCcw}
                        size={36}
                        iconSize={16}
                        variant="surface"
                        accessibilityLabel={`Adjust stock for ${variantLabel(variant)}`}
                        onPress={() => openAdjust(variant)}
                      />
                      <Badge
                        label={String(variant.stockQty)}
                        tone={status === 'in-stock' ? 'positive' : status === 'low' ? 'caution' : 'negative'}
                        dot
                      />
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} className="mt-6 gap-3">
          <Text variant="h2" weight="semibold">
            Stock history
          </Text>
          {movementsQuery.data && movementsQuery.data.length > 0 ? (
            <Card padded={false}>
              {movementsQuery.data.slice(0, 12).map((movement, index, arr) => {
                const meta = MOVEMENT_META[movement.type];
                const variant = product.variants.find((v) => v.id === movement.variantId);
                const positive = movement.qty > 0;
                return (
                  <View
                    key={movement.id}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index < arr.length - 1 ? 'border-b border-hairline' : ''
                    }`}
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-full"
                      style={{ backgroundColor: positive ? colors.positiveTint : colors.negativeTint }}
                    >
                      <meta.icon
                        size={16}
                        color={positive ? colors.positive : colors.negative}
                        strokeWidth={2}
                      />
                    </View>
                    <View className="flex-1">
                      <Text variant="body" weight="medium">
                        {meta.label}
                        {variant && Object.keys(variant.attributes).length > 0
                          ? ` · ${variantLabel(variant)}`
                          : ''}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {movement.reason ? `${movement.reason} · ` : ''}
                        {formatDateTime(new Date(movement.createdAt))}
                      </Text>
                    </View>
                    <Text
                      variant="body"
                      weight="semibold"
                      tone={positive ? 'positive' : 'negative'}
                      tabular
                    >
                      {positive ? '+' : ''}
                      {movement.qty}
                    </Text>
                  </View>
                );
              })}
            </Card>
          ) : (
            <Text variant="caption" tone="tertiary">
              No movements yet — restocks, sales and adjustments will appear here.
            </Text>
          )}
        </Animated.View>
      </ScrollView>

      <AdjustStockSheet
        ref={adjustSheet}
        variant={adjusting}
        productId={product.id}
        dismiss={() => adjustSheet.current?.dismiss()}
      />
    </Screen>
  );
}
