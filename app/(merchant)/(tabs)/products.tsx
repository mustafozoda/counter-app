import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import {
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  FolderTree,
  MoreVertical,
  PackageOpen,
  PackageSearch,
  Pencil,
  Plus,
  ScanBarcode,
  Share2,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Badge,
  Button,
  Chip,
  EmptyState,
  IconButton,
  PressableScale,
  SearchBar,
  Sheet,
  Skeleton,
  SwipeableRow,
  Text,
  useSheetRef,
} from '@/components/ui';
import { TAB_BAR_CLEARANCE } from '@/components/ui/screen';
import { CategoryPickerSheet, SortSheet } from '@/features/products/components/picker-sheets';
import { ProductCard } from '@/features/products/components/product-card';
import { shareCatalogCsv } from '@/features/products/export';
import {
  defaultCatalogFilter,
  filterProducts,
  type CatalogFilter,
  type ProductSort,
  type StockFilter,
} from '@/features/products/filtering';
import {
  useAddSampleCatalog,
  useCategories,
  useImportFirstProductDraft,
  useProducts,
  useSetProductStatus,
} from '@/features/products/hooks';
import type { ProductWithVariants } from '@/features/products/stock';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const STOCK_CHIPS: { value: StockFilter; labelKey: string }[] = [
  { value: 'all', labelKey: 'common.all' },
  { value: 'low', labelKey: 'products.low' },
  { value: 'out', labelKey: 'products.out' },
];

/** Sort value → translation key for the sort chip + sheet. */
export const SORT_KEY: Record<ProductSort, string> = {
  newest: 'products.sortNewest',
  name: 'products.sortName',
  'price-asc': 'products.sortPriceAsc',
  'price-desc': 'products.sortPriceDesc',
  'stock-asc': 'products.sortStock',
};

export default function ProductsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'TJS');

  const productsQuery = useProducts();
  const categoriesQuery = useCategories();
  const setStatus = useSetProductStatus();
  const addSamples = useAddSampleCatalog();
  useImportFirstProductDraft();

  const [filter, setFilter] = useState<CatalogFilter>(defaultCatalogFilter);
  const categorySheet = useSheetRef();
  const sortSheet = useSheetRef();
  const actionsSheet = useSheetRef();

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const filtered = useMemo(() => filterProducts(products, filter), [products, filter]);

  const currentCount = products.filter((p) => p.status !== 'archived').length;
  const hasAnyCurrent = currentCount > 0;
  const selectedCategory = categories.find((c) => c.id === filter.categoryId);
  const sortLabel = t(SORT_KEY[filter.sort]);

  const patchFilter = (patch: Partial<CatalogFilter>) => setFilter((f) => ({ ...f, ...patch }));

  const toggleArchive = (product: ProductWithVariants) => {
    const archiving = product.status !== 'archived';
    setStatus.mutate(
      { id: product.id, status: archiving ? 'archived' : 'active' },
      {
        onSuccess: () =>
          toast.success(archiving ? t('products.archive') : t('products.restore'), product.name),
      },
    );
  };

  const renderItem = ({ item, index }: { item: ProductWithVariants; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 10) * 40).springify().damping(18)}
      className="px-5 pb-3"
    >
      <SwipeableRow
        actions={[
          {
            icon: Pencil,
            label: t('products.edit'),
            tone: 'accent',
            onPress: () => router.push({ pathname: '/product-form', params: { id: item.id } }),
          },
          item.status === 'archived'
            ? { icon: ArchiveRestore, label: t('products.restore'), tone: 'accent', onPress: () => toggleArchive(item) }
            : { icon: Archive, label: t('products.archive'), tone: 'caution', onPress: () => toggleArchive(item) },
        ]}
      >
        <ProductCard
          product={item}
          currency={currency}
          onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
        />
      </SwipeableRow>
    </Animated.View>
  );

  const listHeader = (
    <View className="gap-3 px-5 pb-4">
      <SearchBar
        value={filter.query}
        onChangeText={(query) => patchFilter({ query })}
        placeholder={t('products.searchPlaceholder')}
      />
      <View className="flex-row flex-wrap items-center gap-2">
        <Chip
          icon={SlidersHorizontal}
          label={selectedCategory?.name ?? t('products.allCategories')}
          selected={filter.categoryId !== null}
          onPress={() => categorySheet.current?.present()}
        />
        {STOCK_CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            label={t(chip.labelKey)}
            selected={filter.stock === chip.value}
            onPress={() => patchFilter({ stock: chip.value })}
          />
        ))}
        <Chip icon={ArrowUpDown} label={sortLabel} onPress={() => sortSheet.current?.present()} />
        {filter.archived ? (
          <Chip label={`${t('products.archived')} ×`} selected onPress={() => patchFilter({ archived: false })} />
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
        <View>
          <Text variant="h1" weight="bold">
            {t('products.title')}
          </Text>
          {hasAnyCurrent ? (
            <Text variant="caption" tone="tertiary">
              {t('products.inCatalog', { count: currentCount })}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={ScanBarcode}
            accessibilityLabel={t('nav.sell')}
            onPress={() => router.push('/scan')}
          />
          <IconButton
            icon={MoreVertical}
            accessibilityLabel={t('products.catalog')}
            onPress={() => actionsSheet.current?.present()}
          />
          <IconButton
            icon={Plus}
            variant="tonal"
            accessibilityLabel={t('products.addProduct')}
            onPress={() => router.push('/product-form')}
          />
        </View>
      </View>

      {productsQuery.isLoading ? (
        <View className="gap-3 px-5 pt-2">
          <Skeleton height={48} radius={24} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={88} radius={20} />
          ))}
        </View>
      ) : !hasAnyCurrent && !filter.archived ? (
        <View className="flex-1 justify-center pb-24">
          <EmptyState
            icon={PackageOpen}
            title={t('products.emptyTitle')}
            message={t('products.emptyMessage')}
            actionLabel={t('products.addProduct')}
            onAction={() => router.push('/product-form')}
          />
          <View className="items-center">
            <Button
              label={t('products.addSample')}
              variant="ghost"
              icon={Sparkles}
              loading={addSamples.isPending}
              onPress={() => addSamples.mutate()}
            />
          </View>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={PackageSearch}
              title={t('products.noMatchTitle')}
              message={filter.archived ? t('products.noArchived') : t('products.noMatchMessage')}
              actionLabel={t('products.clearFilters')}
              onAction={() => setFilter(defaultCatalogFilter)}
            />
          }
        />
      )}

      <CategoryPickerSheet
        ref={categorySheet}
        categories={categories}
        selected={filter.categoryId}
        nullLabel={t('products.allCategories')}
        onSelect={(categoryId) => patchFilter({ categoryId })}
        dismiss={() => categorySheet.current?.dismiss()}
      />
      <SortSheet
        ref={sortSheet}
        selected={filter.sort}
        onSelect={(sort) => patchFilter({ sort })}
        dismiss={() => sortSheet.current?.dismiss()}
      />

      <Sheet ref={actionsSheet} title={t('products.catalog')}>
        <View className="gap-1">
          {(
            [
              {
                icon: FolderTree,
                label: t('products.manageCategories'),
                onPress: () => {
                  actionsSheet.current?.dismiss();
                  router.push('/categories');
                },
              },
              {
                icon: PackageSearch,
                label: t('products.lowStockView'),
                onPress: () => {
                  actionsSheet.current?.dismiss();
                  router.push('/low-stock');
                },
              },
              {
                icon: Share2,
                label: t('products.exportCsv'),
                onPress: () => {
                  actionsSheet.current?.dismiss();
                  void shareCatalogCsv(products, categories);
                },
              },
              {
                icon: filter.archived ? ArchiveRestore : Archive,
                label: filter.archived ? t('products.showCurrent') : t('products.showArchived'),
                onPress: () => {
                  patchFilter({ archived: !filter.archived });
                  actionsSheet.current?.dismiss();
                },
              },
            ] as const
          ).map((action) => (
            <PressableScale
              key={action.label}
              scaleTo={0.98}
              onPress={action.onPress}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-md px-3 py-3.5"
            >
              <action.icon size={20} color={colors.inkSecondary} strokeWidth={2} />
              <Text variant="body" weight="medium">
                {action.label}
              </Text>
            </PressableScale>
          ))}
          {!hasAnyCurrent ? null : (
            <View className="mt-2 px-3">
              <Badge label={`${products.length} products · ${categories.length} categories`} />
            </View>
          )}
        </View>
      </Sheet>
    </SafeAreaView>
  );
}
