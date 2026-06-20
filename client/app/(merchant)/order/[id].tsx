import { useLocalSearchParams } from 'expo-router';

import { OrderDetailView } from '@/features/pos/components/order-detail-view';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailView id={id} />;
}
