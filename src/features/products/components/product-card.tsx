import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme';

import {
  priceRange,
  productStockStatus,
  totalStock,
  type ProductWithVariants,
  type StockStatus,
} from '../stock';

import { ProductImage } from './product-image';

const STOCK_BADGE: Record<StockStatus, { label: string; tone: 'positive' | 'caution' | 'negative' }> = {
  'in-stock': { label: 'In stock', tone: 'positive' },
  low: { label: 'Low', tone: 'caution' },
  out: { label: 'Out', tone: 'negative' },
};

export interface ProductCardProps {
  product: ProductWithVariants;
  currency: string;
  onPress: () => void;
}

/** Catalog row: cover, name, brand, price (or range), stock state. */
export function ProductCard({ product, currency, onPress }: ProductCardProps) {
  const { colors } = useTheme();
  const status = productStockStatus(product.variants);
  const badge = STOCK_BADGE[status];
  const [minPrice, maxPrice] = priceRange(product);
  const units = totalStock(product.variants);

  return (
    <Card onPress={onPress} padded={false} className="flex-row items-center gap-3 p-3">
      <ProductImage product={product} size={64} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text variant="body" weight="semibold" numberOfLines={1} className="flex-1">
            {product.name}
          </Text>
          {product.status === 'draft' ? <Badge label="Draft" tone="info" /> : null}
        </View>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {[product.brand, `${product.variants.length} variant${product.variants.length === 1 ? '' : 's'}`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text variant="body" weight="semibold" tabular>
            {minPrice === maxPrice
              ? formatMoney(minPrice, currency)
              : `${formatMoney(minPrice, currency)} – ${formatMoney(maxPrice, currency)}`}
          </Text>
          <View className="flex-row items-center gap-2">
            <Badge label={`${badge.label} · ${units}`} tone={badge.tone} dot />
            <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
          </View>
        </View>
      </View>
    </Card>
  );
}
