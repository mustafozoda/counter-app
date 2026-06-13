import { Layers } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import {
  priceRange,
  productStockStatus,
  totalStock,
  type ProductWithVariants,
} from '@/features/products/stock';
import { formatMoney } from '@/lib/format';

export interface ProductTileProps {
  product: ProductWithVariants;
  currency: string;
  /** Tile width from the grid layout. */
  width: number;
  onPress: () => void;
}

/** POS grid tile — built for speed: photo, name, price, sellability at a glance. */
export function ProductTile({ product, currency, width, onPress }: ProductTileProps) {
  const status = productStockStatus(product.variants);
  const out = status === 'out';
  const [minPrice] = priceRange(product);
  const multi = product.variants.length > 1;

  return (
    <Card
      onPress={out ? undefined : onPress}
      padded={false}
      elevation="sm"
      className={`overflow-hidden ${out ? 'opacity-50' : ''}`}
      style={{ width }}
    >
      <View>
        <ProductImage product={product} size={width} radius={0} />
        {multi ? (
          <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full bg-ink/70 px-2 py-1">
            <Layers size={11} color="#FFFFFF" strokeWidth={2.5} />
            <Text variant="micro" weight="semibold" tone="inverse">
              {product.variants.length}
            </Text>
          </View>
        ) : null}
        {status !== 'in-stock' ? (
          <View className="absolute bottom-2 left-2">
            <Badge
              label={out ? 'Out of stock' : `${totalStock(product.variants)} left`}
              tone={out ? 'negative' : 'caution'}
            />
          </View>
        ) : null}
      </View>
      <View className="gap-0.5 p-3">
        <Text variant="caption" weight="semibold" numberOfLines={1}>
          {product.name}
        </Text>
        <Text variant="caption" tone="secondary" tabular>
          {multi ? `from ${formatMoney(minPrice, currency)}` : formatMoney(minPrice, currency)}
        </Text>
      </View>
    </Card>
  );
}
