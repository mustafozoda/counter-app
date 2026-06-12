import { useRouter } from 'expo-router';
import { ScanBarcode, X } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, IconButton, Screen, Text } from '@/components/ui';

export default function SellScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View className="mt-2 flex-row items-center justify-between">
        <Text variant="h1" weight="bold">
          Point of Sale
        </Text>
        <IconButton icon={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      <View className="flex-1 justify-center">
        <EmptyState
          icon={ScanBarcode}
          title="Scan. Tap. Sold."
          message="The lightning POS — barcode scanning, a tactile cart, split payments and instant receipts — arrives with Phase 2."
          actionLabel="Can't wait"
          onAction={() => router.back()}
        />
      </View>
    </Screen>
  );
}
