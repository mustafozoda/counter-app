import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Heart, Minus, Plus, ShoppingBag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badge, Button, IconButton, PressableScale, Screen, Skeleton, Text } from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import { useProduct } from '@/features/products/hooks';
import { variantLabel, variantPrice, variantStockStatus } from '@/features/products/stock';
import { formatMoney } from '@/lib/format';
import { useContentWidth, useIsWide } from '@/lib/responsive';
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
  const { t } = useTranslation();
  const width = useContentWidth();
  const isWide = useIsWide();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

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
          {t('storefront.productUnavailable')}
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
      toast.success(t('storefront.addedToCart'), `${qty} × ${product.name}`);
      router.back();
    } else {
      haptics.warning();
      toast.warning(t('storefront.notEnoughStock'), t('storefront.reduceQty'));
    }
  };

  // Desktop/tablet: a centered two-column product page (gallery + buy box).
  if (isWide) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']} wideFullBleed>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full" style={{ maxWidth: 1000 }}>
            <IconButton
              icon={ArrowLeft}
              variant="surface"
              accessibilityLabel={t('actions.back')}
              onPress={() => router.back()}
            />
            <View className="mt-4 flex-row gap-10">
              {/* Gallery */}
              <View style={{ flex: 1 }} className="gap-3">
                <View className="overflow-hidden rounded-2xl border border-hairline">
                  {product.images[0] ? (
                    <Image
                      source={{ uri: product.images[0] }}
                      style={{ width: '100%', aspectRatio: 1 }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <ProductImage product={product} size={460} radius={0} />
                  )}
                </View>
                {product.images.length > 1 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {product.images.slice(0, 5).map((uri) => (
                      <Image
                        key={uri}
                        source={{ uri }}
                        style={{ width: 76, height: 76, borderRadius: 12 }}
                        contentFit="cover"
                      />
                    ))}
                  </View>
                ) : null}
              </View>

              {/* Buy box */}
              <View style={{ flex: 1 }}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    {product.brand ? (
                      <Text variant="caption" weight="medium" tone="tertiary">
                        {product.brand}
                      </Text>
                    ) : null}
                    <Text variant="display" weight="bold">
                      {product.name}
                    </Text>
                  </View>
                  <IconButton
                    icon={Heart}
                    variant="surface"
                    iconColor={wished ? colors.negative : colors.inkSecondary}
                    accessibilityLabel={
                      wished ? t('storefront.wishlistRemove') : t('storefront.wishlistSave')
                    }
                    onPress={() => {
                      haptics.tap();
                      toggleWish(product.id);
                    }}
                  />
                </View>
                <Text variant="displaySm" weight="bold" tone="accent" className="mt-2" tabular>
                  {formatMoney(price, currency)}
                </Text>
                {product.description ? (
                  <Text variant="body" tone="secondary" className="mt-3">
                    {product.description}
                  </Text>
                ) : null}

                {product.variants.length > 1 ? (
                  <View className="mt-6 gap-3">
                    <Text variant="title" weight="semibold">
                      {t('storefront.chooseOption')}
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
                              isSelected
                                ? 'border-primary bg-primary-tint'
                                : 'border-hairline bg-surface dark:bg-surface-elevated'
                            } ${out ? 'opacity-40' : ''}`}
                          >
                            {isSelected ? (
                              <Check size={14} color={colors.primary} strokeWidth={2.5} />
                            ) : null}
                            <Text
                              variant="caption"
                              weight={isSelected ? 'semibold' : 'medium'}
                              tone={isSelected ? 'accent' : 'secondary'}
                            >
                              {variantLabel(variant)}
                            </Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {!soldOut ? (
                  <View className="mt-6 flex-row items-center gap-4">
                    <Text variant="title" weight="semibold">
                      {t('storefront.quantity')}
                    </Text>
                    <View className="h-11 flex-row items-center gap-1 rounded-full border border-hairline bg-surface p-1.5 dark:bg-surface-elevated">
                      <IconButton
                        icon={Minus}
                        size={32}
                        iconSize={15}
                        variant="tonal"
                        accessibilityLabel={t('storefront.decrease')}
                        onPress={() => setQty((q) => Math.max(1, q - 1))}
                      />
                      <Text variant="title" weight="semibold" tabular className="min-w-8 text-center">
                        {qty}
                      </Text>
                      <IconButton
                        icon={Plus}
                        size={32}
                        iconSize={15}
                        variant="tonal"
                        accessibilityLabel={t('storefront.increase')}
                        onPress={() => setQty((q) => Math.min(maxQty, q + 1))}
                      />
                    </View>
                    {maxQty <= 5 ? (
                      <Badge label={t('storefront.onlyLeft', { count: maxQty })} tone="caution" />
                    ) : null}
                  </View>
                ) : null}

                <View className="mt-8">
                  {soldOut ? (
                    <Button
                      label={t('storefront.soldOut')}
                      size="lg"
                      fullWidth
                      disabled
                      onPress={() => {}}
                    />
                  ) : (
                    <Button
                      label={t('storefront.addToCartPrice', {
                        price: formatMoney(price * qty, currency),
                      })}
                      icon={ShoppingBag}
                      size="lg"
                      fullWidth
                      onPress={addToCart}
                    />
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      <View className="absolute left-5 right-5 top-2 z-10 flex-row justify-between" style={{ marginTop: 4 }}>
        <IconButton icon={ArrowLeft} variant="surface" accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
        <IconButton
          icon={Heart}
          variant="surface"
          iconColor={wished ? colors.negative : colors.inkSecondary}
          accessibilityLabel={wished ? t('storefront.wishlistRemove') : t('storefront.wishlistSave')}
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
                {t('storefront.chooseOption')}
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
                {t('storefront.quantity')}
              </Text>
              <View className="h-11 flex-row items-center gap-1 rounded-full border border-hairline bg-surface p-1.5 dark:bg-surface-elevated">
                <IconButton icon={Minus} size={32} iconSize={15} variant="tonal" accessibilityLabel={t('storefront.decrease')} onPress={() => setQty((q) => Math.max(1, q - 1))} />
                <Text variant="title" weight="semibold" tabular className="min-w-8 text-center">
                  {qty}
                </Text>
                <IconButton icon={Plus} size={32} iconSize={15} variant="tonal" accessibilityLabel={t('storefront.increase')} onPress={() => setQty((q) => Math.min(maxQty, q + 1))} />
              </View>
              {maxQty <= 5 ? (
                <Badge label={t('storefront.onlyLeft', { count: maxQty })} tone="caution" />
              ) : null}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-hairline bg-surface px-5 pb-9 pt-4 dark:bg-surface-elevated">
        {soldOut ? (
          <Button label={t('storefront.soldOut')} size="lg" fullWidth disabled onPress={() => {}} />
        ) : (
          <Button label={t('storefront.addToCartPrice', { price: formatMoney(price * qty, currency) })} icon={ShoppingBag} size="lg" fullWidth onPress={addToCart} />
        )}
      </View>
    </Screen>
  );
}
