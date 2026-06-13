import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PackageSearch } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, EmptyState, SearchBar, Skeleton, Text } from '@/components/ui';
import { useCategories, useProducts } from '@/features/products/hooks';
import { priceRange, productStockStatus, type ProductWithVariants } from '@/features/products/stock';
import { StorefrontProductCard } from '@/features/storefront/components/storefront-product-card';
import { useStoreProfile } from '@/stores/store-profile';

type Sort = 'featured' | 'price-asc' | 'price-desc';

export default function StorefrontCatalog() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { width } = useWindowDimensions();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');

  const productsQuery = useProducts();
  const categories = useCategories().data ?? [];

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(params.category ?? null);
  const [sort, setSort] = useState<Sort>('featured');

  const tileWidth = (width - 20 * 2 - 12) / 2;

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = (productsQuery.data ?? []).filter(
      (p) => p.status === 'active' && productStockStatus(p.variants) !== 'out',
    );
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q),
      );
    }
    const priced = (p: ProductWithVariants) => priceRange(p)[0];
    if (sort === 'price-asc') list = [...list].sort((a, b) => priced(a) - priced(b));
    if (sort === 'price-desc') list = [...list].sort((a, b) => priced(b) - priced(a));
    return list;
  }, [productsQuery.data, query, categoryId, sort]);

  const header = (
    <View className="gap-3 pb-3">
      <Text variant="h1" weight="bold">
        Browse
      </Text>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search products" />
      <View className="flex-row flex-wrap gap-2">
        <Chip label="All" selected={categoryId === null} onPress={() => setCategoryId(null)} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          />
        ))}
      </View>
      <View className="flex-row gap-2">
        {(
          [
            { label: 'Featured', value: 'featured' },
            { label: 'Price ↑', value: 'price-asc' },
            { label: 'Price ↓', value: 'price-desc' },
          ] as const
        ).map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={sort === option.value}
            onPress={() => setSort(option.value)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      {productsQuery.isLoading ? (
        <View className="gap-3 px-5 pt-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </View>
      ) : (
        <FlashList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<View className="px-5 pt-1">{header}</View>}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={PackageSearch}
              title="Nothing here"
              message="Try a different search or category."
              actionLabel="Clear filters"
              onAction={() => {
                setQuery('');
                setCategoryId(null);
              }}
            />
          }
          renderItem={({ item, index }) => (
            <View
              style={{
                paddingBottom: 12,
                paddingLeft: index % 2 === 1 ? 6 : 0,
                paddingRight: index % 2 === 0 ? 6 : 0,
              }}
            >
              <StorefrontProductCard
                product={item}
                currency={currency}
                width={tileWidth}
                onPress={() => router.push({ pathname: '/(storefront)/product/[id]', params: { id: item.id } })}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
