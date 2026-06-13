import { PackageOpen } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';

export default function ProductsScreen() {
  const firstProductDraft = useStoreProfile((s) => s.firstProductDraft);

  return (
    <Screen tabbed>
      <View className="mt-2">
        <Text variant="h1" weight="bold">
          Products
        </Text>
      </View>
      <View className="flex-1 justify-center">
        <EmptyState
          icon={PackageOpen}
          title="Your shelves are coming"
          message={
            firstProductDraft
              ? `"${firstProductDraft.name}" is saved and will be your first product when inventory lands in Phase 1.`
              : 'Catalog, variants, barcodes and low-stock alerts arrive with Phase 1.'
          }
          actionLabel="Add a product"
          onAction={() => toast.info('Inventory is on the way', 'Product CRUD arrives with Phase 1.')}
        />
      </View>
    </Screen>
  );
}
