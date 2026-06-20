import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight, Store, Tag, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, EmptyState, IconButton, Logo, Skeleton, Text } from '@/components/ui';
import { useCategories, useProducts } from '@/features/products/hooks';
import { productStockStatus } from '@/features/products/stock';
import { usePromotions } from '@/features/promotions/hooks';
import { isPromotionLive, promotionSummary } from '@/features/promotions/validity';
import { StorefrontProductCard } from '@/features/storefront/components/storefront-product-card';
import { storefrontColumns, useContentWidth, useIsWide } from '@/lib/responsive';
import { useStoreProfile } from '@/stores/store-profile';
import { brandGradient } from '@/theme';

export default function StorefrontHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const width = useContentWidth();
  const isWide = useIsWide();
  const store = useStoreProfile((s) => s.store);
  const currency = store?.currencyCode ?? 'TJS';

  const productsQuery = useProducts();
  const categories = useCategories().data ?? [];
  const promotions = usePromotions().data ?? [];

  const featured = useMemo(
    () =>
      (productsQuery.data ?? [])
        .filter((p) => p.status === 'active' && productStockStatus(p.variants) !== 'out')
        .slice(0, 6),
    [productsQuery.data],
  );
  const livePromo = promotions.find((p) => isPromotionLive(p));
  const columns = isWide ? storefrontColumns(width) : 2;
  const tileWidth = isWide ? (width - 40) / columns - 12 : (width - 20 * 2 - 12) / 2;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-2 pt-1">
        <View className="flex-row items-center gap-3">
          <Logo size={40} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
          <View>
            <Text variant="caption" tone="tertiary">
              {t('storefront.welcomeTo')}
            </Text>
            <Text variant="title" weight="bold">
              {store?.name ?? t('storefront.ourStore')}
            </Text>
          </View>
        </View>
        <IconButton
          icon={X}
          accessibilityLabel={t('storefront.exitPreview')}
          onPress={() => router.replace('/(merchant)/(tabs)')}
        />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {/* Hero / promo banner */}
        <Animated.View entering={FadeInDown.springify().damping(18)} className="mx-5 mt-2">
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 24 }}
          >
            {livePromo ? (
              <>
                <View className="mb-2 flex-row items-center gap-1.5">
                  <Tag size={14} color="#FFFFFF" strokeWidth={2.5} />
                  <Text variant="micro" weight="bold" tone="inverse" className="opacity-90">
                    {t('storefront.limitedOffer')}
                  </Text>
                </View>
                <Text variant="display" weight="bold" tone="inverse">
                  {promotionSummary(livePromo)}
                </Text>
                <Text variant="body" tone="inverse" className="mt-1 opacity-90">
                  {livePromo.code ? t('storefront.useCode', { code: livePromo.code }) : livePromo.name}
                </Text>
              </>
            ) : (
              <>
                <Text variant="display" weight="bold" tone="inverse">
                  {t('storefront.heroTitle')}
                </Text>
                <Text variant="body" tone="inverse" className="mt-2 opacity-90">
                  {t('storefront.heroSubtitle')}
                </Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Categories */}
        {categories.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} className="mt-6">
            <Text variant="h2" weight="semibold" className="px-5">
              {t('storefront.shopByCategory')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingVertical: 12 }}
            >
              {categories.map((category) => (
                <Card
                  key={category.id}
                  padded={false}
                  className="h-20 w-28 items-center justify-center gap-2 px-3"
                  onPress={() => router.push({ pathname: '/(storefront)/(tabs)/catalog', params: { category: category.id } })}
                >
                  <Store size={20} color="#9C9AA3" strokeWidth={1.75} />
                  <Text variant="caption" weight="medium" numberOfLines={1}>
                    {category.name}
                  </Text>
                </Card>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Featured */}
        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-4">
          <View className="flex-row items-center justify-between px-5">
            <Text variant="h2" weight="semibold">
              {t('storefront.featured')}
            </Text>
            <IconButton
              icon={ChevronRight}
              accessibilityLabel={t('storefront.seeAll')}
              onPress={() => router.push('/(storefront)/(tabs)/catalog')}
            />
          </View>

          {productsQuery.isLoading ? (
            <View className="flex-row flex-wrap gap-3 px-5 pt-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} width={tileWidth} height={tileWidth + 64} radius={20} />
              ))}
            </View>
          ) : featured.length === 0 ? (
            <EmptyState icon={Store} title={t('storefront.emptyStockTitle')} message={t('storefront.emptyStockMsg')} />
          ) : (
            <View className="flex-row flex-wrap justify-between px-5 pt-2" style={{ gap: 12 }}>
              {featured.map((product) => (
                <StorefrontProductCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  width={tileWidth}
                  onPress={() => router.push({ pathname: '/(storefront)/product/[id]', params: { id: product.id } })}
                />
              ))}
            </View>
          )}
        </Animated.View>

        <View className="mt-6 items-center">
          <Badge label={t('storefront.previewBadge')} tone="accent" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
