import { useRouter } from 'expo-router';
import { ArrowLeft, FolderPlus, FolderTree, Pencil, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
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
import {
  useCategories,
  useDeleteCategory,
  useProducts,
  useSaveCategory,
} from '@/features/products/hooks';
import { toast } from '@/stores/toast';
import type { Category } from '@/types/models';

export default function CategoriesScreen() {
  const router = useRouter();
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
      toast.error('Name too short', 'Category names need at least 2 characters.');
      return;
    }
    saveCategory.mutate(
      { id: editing?.id, name: trimmed, parentId: editing?.parentId ?? null },
      {
        onSuccess: () => {
          toast.success(editing ? 'Category renamed' : 'Category added', trimmed);
          editSheet.current?.dismiss();
        },
      },
    );
  };

  const confirmDelete = (category: Category) => {
    const count = counts.get(category.id) ?? 0;
    Alert.alert(
      'Delete category',
      count > 0
        ? `${count} product${count === 1 ? '' : 's'} will become uncategorized.`
        : `Remove "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteCategory.mutate(category.id, {
              onSuccess: () => toast.success('Category deleted', category.name),
            }),
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => router.back()} />
          <Text variant="h1" weight="bold">
            Categories
          </Text>
        </View>
        <IconButton
          icon={FolderPlus}
          variant="tonal"
          accessibilityLabel="Add category"
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
            title="Organize your catalog"
            message="Categories power filtering here and the storefront later."
            actionLabel="Add a category"
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
                  { icon: Pencil, label: 'Rename', tone: 'accent', onPress: () => openEditor(category) },
                  { icon: Trash2, label: 'Delete', tone: 'negative', onPress: () => confirmDelete(category) },
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
                    {counts.get(category.id) ?? 0} products
                  </Text>
                </Card>
              </SwipeableRow>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      <Sheet ref={editSheet} title={editing ? 'Rename category' : 'New category'}>
        <View className="gap-4">
          <TextField label="Category name" value={name} onChangeText={setName} autoFocus />
          <Button
            label={editing ? 'Save' : 'Add category'}
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
