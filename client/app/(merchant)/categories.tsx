import { useRouter } from 'expo-router';
import { ArrowLeft, FolderPlus, FolderTree, Pencil, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Screen,
  Sheet,
  Skeleton,
  SwipeableRow,
  Text,
  TextField,
  useSheetRef,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import {
  useCategories,
  useDeleteCategory,
  useProducts,
  useSaveCategory,
} from '@/features/products/hooks';
import { toast } from '@/stores/toast';
import type { Category } from '@/types/models';

export default withPermission(CategoriesScreen, 'manage_inventory');

function CategoriesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const categoriesQuery = useCategories();
  const productsQuery = useProducts();
  const saveCategory = useSaveCategory();
  const deleteCategory = useDeleteCategory();

  const editSheet = useSheetRef();
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');

  const categories = categoriesQuery.data ?? [];
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of productsQuery.data ?? []) {
      if (product.categoryId && product.status !== 'archived') {
        map.set(product.categoryId, (map.get(product.categoryId) ?? 0) + 1);
      }
    }
    return map;
  }, [productsQuery.data]);

  const openEditor = (category: Category | null) => {
    setEditing(category);
    setName(category?.name ?? '');
    editSheet.current?.present();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error(t('categories.nameShort'), t('categories.nameShortBody'));
      return;
    }
    saveCategory.mutate(
      { id: editing?.id, name: trimmed, parentId: editing?.parentId ?? null },
      {
        onSuccess: () => {
          toast.success(editing ? t('categories.categoryRenamed') : t('categories.categoryAdded'), trimmed);
          editSheet.current?.dismiss();
        },
      },
    );
  };

  const confirmDelete = (category: Category) => {
    const count = counts.get(category.id) ?? 0;
    Alert.alert(
      t('categories.deleteCategory'),
      count > 0
        ? t('categories.deleteWithProducts', { count })
        : t('categories.deleteEmpty', { name: category.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () =>
            deleteCategory.mutate(category.id, {
              onSuccess: () => toast.success(t('categories.categoryDeleted'), category.name),
            }),
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-1 flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
          <Text variant="h1" weight="bold" numberOfLines={1} className="flex-1">
            {t('categories.title')}
          </Text>
        </View>
        <IconButton
          icon={FolderPlus}
          variant="tonal"
          accessibilityLabel={t('categories.addCategory')}
          onPress={() => openEditor(null)}
        />
      </View>

      {categoriesQuery.isLoading ? (
        <View className="gap-3 px-5 pt-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={64} radius={20} />
          ))}
        </View>
      ) : categories.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={FolderTree}
            title={t('categories.organizeTitle')}
            message={t('categories.organizeMsg')}
            actionLabel={t('categories.addACategory')}
            onAction={() => openEditor(null)}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2.5 px-5 pb-16 pt-5"
          showsVerticalScrollIndicator={false}
        >
          {categories.map((category, index) => (
            <Animated.View
              key={category.id}
              entering={FadeInDown.delay(Math.min(index, 10) * 35).springify().damping(18)}
              layout={LinearTransition.springify().damping(20)}
            >
              <SwipeableRow
                actions={[
                  { icon: Pencil, label: t('categories.rename'), tone: 'accent', onPress: () => openEditor(category) },
                  { icon: Trash2, label: t('common.delete'), tone: 'negative', onPress: () => confirmDelete(category) },
                ]}
              >
                <Card
                  padded={false}
                  className="flex-row items-center justify-between px-4 py-4"
                  onPress={() => openEditor(category)}
                >
                  <Text variant="body" weight="semibold">
                    {category.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" tabular>
                    {t('categories.productsCount', { count: counts.get(category.id) ?? 0 })}
                  </Text>
                </Card>
              </SwipeableRow>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Sheet ref={editSheet} title={editing ? t('categories.renameCategory') : t('categories.newCategory')}>
        <View className="gap-4">
          <TextField label={t('categories.categoryName')} value={name} onChangeText={setName} autoFocus />
          <Button
            label={editing ? t('common.save') : t('categories.addBtn')}
            size="lg"
            fullWidth
            loading={saveCategory.isPending}
            onPress={submit}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
