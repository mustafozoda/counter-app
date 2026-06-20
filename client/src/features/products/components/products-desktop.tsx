import { useRouter } from 'expo-router';
import { Package, PackageOpen, Plus, ScanBarcode } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { Chip, EmptyState, IconButton, SearchBar, Skeleton, Text } from '@/components/ui';
import { ProductCard } from '@/features/products/components/product-card';
import { ProductDetailView } from '@/features/products/components/product-detail-view';
import {
  defaultCatalogFilter,
  filterProducts,
  type CatalogFilter,
  type StockFilter,
} from '@/features/products/filtering';
import { useProducts } from '@/features/products/hooks';
import { cn } from '@/lib/cn';
import { useResponsiveValue } from '@/lib/responsive';
import { usePermission } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';

const STOCK_CHIPS: { value: StockFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'low', labelKey: 'products.low' },
  { value: 'out', labelKey: 'products.out' },
];

/**
 * Desktop/tablet Products: a master–detail split — searchable, selectable list
 * on the left and the full product record on the right. Reuses ProductCard and
 * ProductDetailView so behaviour matches the phone, just laid out for the glass.
 */
export function ProductsDesktop() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');
  const canManageInventory = usePermission('manage_inventory');
  const listWidth = useResponsiveValue({ compact: 360, tablet: 320, laptop: 380, desktop: 420 });

  const productsQuery = useProducts();
  const [filter, setFilter] = useState<CatalogFilter>(defaultCatalogFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const filtered = useMemo(() => filterProducts(products, filter), [products, filter]);

  // Keep a valid selection so the detail pane is never empty while items exist.
  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const patch = (p: Partial<CatalogFilter>) => setFilter((f) => ({ ...f, ...p }));

  return (
    <View className="flex-1 flex-row bg-background">
      {/* Master list */}
      <View style={{ width: listWidth }} className="border-r border-hairline">
        <View className="gap-3 px-4 pb-3 pt-3">
          <View className="flex-row items-center justify-between">
            <Text variant="h2" weight="bold">
              {t('products.title')}
            </Text>
            <View className="flex-row gap-2">
              <IconButton
                icon={ScanBarcode}
                accessibilityLabel={t('nav.sell')}
                onPress={() => router.push('/scan')}
              />
              {canManageInventory ? (
                <IconButton
                  icon={Plus}
                  variant="tonal"
                  accessibilityLabel={t('products.addProduct')}
                  onPress={() => router.push('/product-form')}
                />
              ) : null}
            </View>
          </View>
          <SearchBar
            value={filter.query}
            onChangeText={(query) => patch({ query })}
            placeholder={t('products.searchPlaceholder')}
          />
          <View className="flex-row flex-wrap gap-2">
            {STOCK_CHIPS.map((chip) => (
              <Chip
                key={chip.value}
                label={t(chip.labelKey)}
                selected={filter.stock === chip.value}
                onPress={() => patch({ stock: chip.value })}
              />
            ))}
          </View>
        </View>

        {productsQuery.isLoading ? (
          <View className="gap-3 px-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={88} radius={16} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filtered}
            className="flex-1"
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                icon={PackageOpen}
                title={t('products.noMatchTitle')}
                message={t('products.noMatchMessage')}
              />
            }
            renderItem={({ item }) => (
              <View
                className={cn(
                  'rounded-xl border-2',
                  selectedId === item.id ? 'border-primary' : 'border-transparent',
                )}
              >
                <ProductCard
                  product={item}
                  currency={currency}
                  onPress={() => setSelectedId(item.id)}
                />
              </View>
            )}
          />
        )}
      </View>

      {/* Detail pane */}
      <View className="min-w-0 flex-1">
        {selectedId ? (
          <ProductDetailView id={selectedId} embedded onClose={() => setSelectedId(null)} />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <EmptyState
              icon={Package}
              title={t('products.title')}
              message={t('products.emptyMessage')}
            />
          </View>
        )}
      </View>
    </View>
  );
}
