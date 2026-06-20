import { useLocalSearchParams } from 'expo-router';

import { ProductDetailView } from '@/features/products/components/product-detail-view';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetailView id={id} />;
}
