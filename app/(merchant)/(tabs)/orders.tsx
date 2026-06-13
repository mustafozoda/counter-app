import { ReceiptText } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState, Screen, Text } from '@/components/ui';
import { toast } from '@/stores/toast';

export default function OrdersScreen() {
  return (
    <Screen tabbed>
      <View className="mt-2">
        <Text variant="h1" weight="bold">
          Orders
        </Text>
      </View>
      <View className="flex-1 justify-center">
        <EmptyState
          icon={ReceiptText}
          title="No orders yet"
          message="POS and online orders will flow in here with their full status pipeline in Phase 3."
          actionLabel="Make a sale"
          onAction={() => toast.info('POS is on the way', 'The point of sale arrives with Phase 2.')}
        />
      </View>
    </Screen>
  );
}
