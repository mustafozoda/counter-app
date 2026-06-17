import { useRouter } from 'expo-router';
import { ArrowLeft, PackageCheck, RotateCcw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Screen,
  Skeleton,
  Text,
  useSheetRef,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { AdjustStockSheet } from '@/features/products/components/adjust-stock-sheet';
import { ProductImage } from '@/features/products/components/product-image';
import { lowStockProducts } from '@/features/products/filtering';
import { useProducts } from '@/features/products/hooks';
import { variantLabel, variantStockStatus } from '@/features/products/stock';
import type { ProductVariant } from '@/types/models';

export default withPermission(LowStockScreen, 'manage_inventory');

function LowStockScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const productsQuery = useProducts();
  const adjustSheet = useSheetRef();
  const [target, setTarget] = useState<{
    variant: ProductVariant;
    productId: string;
    cost: number;
    supplierId: string | null;
  } | null>(null);

  const attention = useMemo(() => lowStockProducts(productsQuery.data ?? []), [productsQuery.data]);

  const openRestock = (
    variant: ProductVariant,
    productId: string,
    cost: number,
    supplierId: string | null,
  ) => {
    setTarget({ variant, productId, cost, supplierId });
    adjustSheet.current?.present();
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-5 pt-2">
        <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        <View>
          <Text variant="h1" weight="bold">
            {t('lowStock.title')}
          </Text>
          {attention.length > 0 ? (
            <Text variant="caption" tone="tertiary">
              {t('lowStock.needAttention', { count: attention.length })}
            </Text>
          ) : null}
        </View>
      </View>

      {productsQuery.isLoading ? (
        <View className="gap-3 px-5 pt-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </View>
      ) : attention.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={PackageCheck}
            title={t('lowStock.healthyTitle')}
            message={t('lowStock.healthyMsg')}
            actionLabel={t('lowStock.backToProducts')}
            onAction={() => router.back()}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-5 pb-16 pt-5"
          showsVerticalScrollIndicator={false}
        >
          {attention.map((product, index) => {
            const urgent = product.variants.filter((v) => variantStockStatus(v) !== 'in-stock');
            return (
              <Animated.View
                key={product.id}
                entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}
              >
                <Card padded={false}>
                  <View className="flex-row items-center gap-3 p-3">
                    <ProductImage product={product} size={48} radius={12} />
                    <View className="flex-1">
                      <Text variant="body" weight="semibold" numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {t('lowStock.variantsAffected', { affected: urgent.length, total: product.variants.length })}
                      </Text>
                    </View>
                    <Button
                      label={t('lowStock.view')}
                      size="sm"
                      variant="ghost"
                      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
                    />
                  </View>
                  {urgent.map((variant) => {
                    const status = variantStockStatus(variant);
                    return (
                      <View
                        key={variant.id}
                        className="flex-row items-center gap-3 border-t border-hairline px-4 py-3"
                      >
                        <View className="flex-1">
                          <Text variant="body" weight="medium">
                            {variantLabel(variant)}
                          </Text>
                          <Text variant="caption" tone="tertiary" mono>
                            {variant.sku}
                          </Text>
                        </View>
                        <Badge
                          label={status === 'out' ? t('lowStock.out') : t('lowStock.left', { count: variant.stockQty })}
                          tone={status === 'out' ? 'negative' : 'caution'}
                          dot
                        />
                        <Button
                          label={t('lowStock.restock')}
                          size="sm"
                          variant="secondary"
                          icon={RotateCcw}
                          onPress={() => openRestock(variant, product.id, product.cost, product.supplierId)}
                        />
                      </View>
                    );
                  })}
                </Card>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      <AdjustStockSheet
        ref={adjustSheet}
        variant={target?.variant ?? null}
        productId={target?.productId ?? ''}
        defaultCost={target?.cost}
        supplierId={target?.supplierId}
        dismiss={() => adjustSheet.current?.dismiss()}
      />
    </Screen>
  );
}
