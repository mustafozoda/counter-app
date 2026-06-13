import { Check, FolderOpen } from 'lucide-react-native';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PressableScale, Sheet, Text, type SheetRef } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Category, Id } from '@/types/models';

import { SORT_OPTIONS, type ProductSort } from '../filtering';

/** Sort value → translation key (mirrors the catalog screen). */
const SORT_KEY: Record<ProductSort, string> = {
  newest: 'products.sortNewest',
  name: 'products.sortName',
  'price-asc': 'products.sortPriceAsc',
  'price-desc': 'products.sortPriceDesc',
  'stock-asc': 'products.sortStock',
};

interface SheetOptionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  indent?: boolean;
}

function SheetOptionRow({ label, selected, onPress, indent = false }: SheetOptionRowProps) {
  const { colors } = useTheme();
  return (
    <PressableScale
      scaleTo={0.98}
      haptic="selection"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-row items-center justify-between rounded-md px-3 py-3.5 ${indent ? 'ml-6' : ''}`}
    >
      <Text variant="body" weight={selected ? 'semibold' : 'regular'} tone={selected ? 'accent' : 'primary'}>
        {label}
      </Text>
      {selected ? <Check size={18} color={colors.primary} strokeWidth={2.5} /> : null}
    </PressableScale>
  );
}

export interface CategorySheetProps {
  categories: Category[];
  selected: Id | null;
  onSelect: (id: Id | null) => void;
  /** Label for the null choice — "All categories" (filter) or "No category" (form). */
  nullLabel: string;
  dismiss: () => void;
}

/** Category picker shared by the catalog filter and the product form. */
export const CategoryPickerSheet = forwardRef<SheetRef, CategorySheetProps>(
  function CategoryPickerSheet({ categories, selected, onSelect, nullLabel, dismiss }, ref) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const roots = categories.filter((c) => c.parentId === null);
    const childrenOf = (id: Id) => categories.filter((c) => c.parentId === id);

    const choose = (id: Id | null) => {
      onSelect(id);
      dismiss();
    };

    return (
      <Sheet ref={ref} title={t('products.category')}>
        <View className="gap-0.5">
          <SheetOptionRow label={nullLabel} selected={selected === null} onPress={() => choose(null)} />
          {roots.length === 0 ? (
            <View className="items-center gap-2 py-8">
              <FolderOpen size={28} color={colors.inkTertiary} strokeWidth={1.75} />
              <Text variant="caption" tone="tertiary">
                No categories yet — add them in Manage categories.
              </Text>
            </View>
          ) : null}
          {roots.map((category) => (
            <View key={category.id}>
              <SheetOptionRow
                label={category.name}
                selected={selected === category.id}
                onPress={() => choose(category.id)}
              />
              {childrenOf(category.id).map((child) => (
                <SheetOptionRow
                  key={child.id}
                  label={child.name}
                  selected={selected === child.id}
                  onPress={() => choose(child.id)}
                  indent
                />
              ))}
            </View>
          ))}
        </View>
      </Sheet>
    );
  },
);

export interface SortSheetProps {
  selected: ProductSort;
  onSelect: (sort: ProductSort) => void;
  dismiss: () => void;
}

export const SortSheet = forwardRef<SheetRef, SortSheetProps>(function SortSheet(
  { selected, onSelect, dismiss },
  ref,
) {
  const { t } = useTranslation();
  return (
    <Sheet ref={ref} title={t('products.sortBy')}>
      <View className="gap-0.5">
        {SORT_OPTIONS.map((option) => (
          <SheetOptionRow
            key={option.value}
            label={t(SORT_KEY[option.value])}
            selected={selected === option.value}
            onPress={() => {
              onSelect(option.value);
              dismiss();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
});
