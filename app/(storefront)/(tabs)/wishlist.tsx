import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useMemo } from 'react';
import { useWindowDimensions, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, Text } from '@/components/ui';
import { useProducts } from '@/features/products/hooks';
import { StorefrontProductCard } from '@/features/storefront/components/storefront-product-card';
import { useStoreProfile } from '@/stores/store-profile';
import { useWishlist } from '@/stores/wishlist';

export default function StorefrontWishlist() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const productIds = useWishlist((s) => s.productIds);
  const productsQuery = useProducts();

  const saved = useMemo(
    () => (productsQuery.data ?? []).filter((p) => productIds.includes(p.id)),
    [productsQuery.data, productIds],
  );
  const tileWidth = (width - 20 * 2 - 12) / 2;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="px-5 pb-2 pt-1">
        <Text variant="h1" weight="bold">
          Saved
        </Text>
        {saved.length > 0 ? (
          <Text variant="caption" tone="tertiary">
            {saved.length} item{saved.length === 1 ? '' : 's'} you love
          </Text>
        ) : null}
      </View>

      {saved.length === 0 ? (
        <View className="flex-1 justify-center pb-20">
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            message="Tap the heart on any product to save it for later."
            actionLabel="Start browsing"
            onAction={() => router.push('/(storefront)/(tabs)/catalog')}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between" style={{ gap: 12 }}>
            {saved.map((product) => (
              <StorefrontProductCard
                key={product.id}
                product={product}
                currency={currency}
                width={tileWidth}
                onPress={() => router.push({ pathname: '/(storefront)/product/[id]', params: { id: product.id } })}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
