import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Heart, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge, Button, IconButton, PressableScale, Screen, Skeleton, Text } from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import { useProduct } from '@/features/products/hooks';
import { variantLabel, variantPrice, variantStockStatus } from '@/features/products/stock';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useWishlist } from '@/stores/wishlist';
import { useTheme } from '@/theme';
import type { ProductVariant } from '@/types/models';

export default function StorefrontProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');

  const productQuery = useProduct(id);
  const product = productQuery.data;

  const add = useStorefrontCart((s) => s.add);
  const wished = useWishlist((s) => s.productIds.includes(id));
  const toggleWish = useWishlist((s) => s.toggle);

  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Default to the first in-stock variant once loaded.
  const selected = useMemo<ProductVariant | null>(() => {
    if (!product) return null;
    if (variantId) return product.variants.find((v) => v.id === variantId) ?? null;
    return product.variants.find((v) => v.stockQty > 0) ?? product.variants[0] ?? null;
  }, [product, variantId]);

  if (productQuery.isLoading) {
    return (
      <Screen>
        <View className="mt-2 gap-4">
          <Skeleton height={44} width={44} radius={22} />
          <Skeleton height={320} radius={24} />
          <Skeleton height={28} width={200} />
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen contentClassName="justify-center">
        <Text variant="h2" weight="semibold" className="text-center">
          This product is unavailable.
        </Text>
      </Screen>
    );
  }

  const price = selected ? variantPrice(product, selected) : product.basePrice;
  const soldOut = !selected || selected.stockQty <= 0;
  const maxQty = selected?.stockQty ?? 0;

  const addToCart = () => {
    if (!selected || soldOut) return;
    const ok = add(
      {
        variantId: selected.id,
        productId: product.id,
        productName: product.name,
        variantLabel: variantLabel(selected),
        unitPrice: price,
        available: selected.stockQty,
        imageUri: product.images[0] ?? null,
      },
      qty,
    );
    if (ok) {
      haptics.success();
      toast.success('Added to cart', `${qty} × ${product.name}`);
      router.back();
    } else {
      haptics.warning();
      toast.warning('Not enough stock', 'Reduce the quantity and try again.');
    }
  };

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <View className="absolute left-5 right-5 top-2 z-10 flex-row justify-between" style={{ marginTop: 4 }}>
        <IconButton icon={ArrowLeft} variant="surface" accessibilityLabel="Back" onPress={() => router.back()} />
        <IconButton
          icon={Heart}
          variant="surface"
          iconColor={wished ? colors.negative : colors.inkSecondary}
          accessibilityLabel={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          onPress={() => {
            haptics.tap();
            toggleWish(product.id);
          }}
        />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-40" showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        {product.images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {product.images.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width, height: width }} contentFit="cover" transition={150} />
            ))}
          </ScrollView>
        ) : (
          <ProductImage product={product} size={width} radius={0} />
        )}

        <View className="px-5 pt-5">
          <Animated.View entering={FadeInDown.springify().damping(18)}>
            {product.brand ? (
              <Text variant="caption" weight="medium" tone="tertiary">
                {product.brand}
              </Text>
            ) : null}
            <Text variant="display" weight="bold">
              {product.name}
            </Text>
            <Text variant="h1" weight="bold" tone="accent" className="mt-1" tabular>
              {formatMoney(price, currency)}
            </Text>
            {product.description ? (
              <Text variant="body" tone="secondary" className="mt-3">
                {product.description}
              </Text>
            ) : null}
          </Animated.View>

          {/* Variant picker */}
          {product.variants.length > 1 ? (
            <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} className="mt-6 gap-3">
              <Text variant="title" weight="semibold">
                Choose an option
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const out = variantStockStatus(variant) === 'out';
                  const isSelected = selected?.id === variant.id;
                  return (
                    <PressableScale
                      key={variant.id}
                      scaleTo={0.95}
                      haptic="selection"
                      disabled={out}
                      onPress={() => {
                        setVariantId(variant.id);
                        setQty(1);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected, disabled: out }}
                      className={`h-11 flex-row items-center gap-2 rounded-full border px-4 ${
                        isSelected ? 'border-primary bg-primary-tint' : 'border-hairline bg-surface dark:bg-surface-elevated'
                      } ${out ? 'opacity-40' : ''}`}
                    >
                      {isSelected ? <Check size={14} color={colors.primary} strokeWidth={2.5} /> : null}
                      <Text variant="caption" weight={isSelected ? 'semibold' : 'medium'} tone={isSelected ? 'accent' : 'secondary'}>
                        {variantLabel(variant)}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {!soldOut ? (
            <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} className="mt-6 flex-row items-center gap-4">
              <Text variant="title" weight="semibold">
                Quantity
              </Text>
              <View className="h-11 flex-row items-center gap-1 rounded-full border border-hairline bg-surface p-1.5 dark:bg-surface-elevated">
                <IconButton icon={Minus} size={32} iconSize={15} variant="tonal" accessibilityLabel="Decrease" onPress={() => setQty((q) => Math.max(1, q - 1))} />
                <Text variant="title" weight="semibold" tabular className="min-w-8 text-center">
                  {qty}
                </Text>
                <IconButton icon={Plus} size={32} iconSize={15} variant="tonal" accessibilityLabel="Increase" onPress={() => setQty((q) => Math.min(maxQty, q + 1))} />
              </View>
              {maxQty <= 5 ? (
                <Badge label={`Only ${maxQty} left`} tone="caution" />
              ) : null}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-9 pt-4 dark:bg-surface-elevated">
        {soldOut ? (
          <Button label="Sold out" size="lg" fullWidth disabled onPress={() => {}} />
        ) : (
          <Button label={`Add to cart · ${formatMoney(price * qty, currency)}`} icon={ShoppingBag} size="lg" fullWidth onPress={addToCart} />
        )}
      </View>
    </Screen>
  );
}
