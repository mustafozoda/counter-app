import { Heart } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { ProductImage } from '@/features/products/components/product-image';
import { priceRange, productStockStatus, type ProductWithVariants } from '@/features/products/stock';
import { formatMoney } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useWishlist } from '@/stores/wishlist';
import { useTheme } from '@/theme';

export interface StorefrontProductCardProps {
  product: ProductWithVariants;
  currency: string;
  width: number;
  onPress: () => void;
}

/** Catalog tile for the customer storefront — photo, price, wishlist heart. */
export function StorefrontProductCard({
  product,
  currency,
  width,
  onPress,
}: StorefrontProductCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const wished = useWishlist((s) => s.productIds.includes(product.id));
  const toggle = useWishlist((s) => s.toggle);
  const [minPrice] = priceRange(product);
  const out = productStockStatus(product.variants) === 'out';

  return (
    <Card onPress={onPress} padded={false} elevation="sm" className="overflow-hidden" style={{ width }}>
      <View>
        <ProductImage product={product} size={width} radius={0} />
        <Pressable
          onPress={() => {
            haptics.tap();
            toggle(product.id);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={wished ? t('storefront.wishlistRemove') : t('storefront.wishlistAdd')}
          className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-surface/90"
        >
          <Heart
            size={18}
            color={wished ? colors.negative : colors.inkSecondary}
            fill={wished ? colors.negative : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
        {out ? (
          <View className="absolute bottom-2 left-2">
            <Badge label={t('storefront.soldOut')} tone="neutral" />
          </View>
        ) : null}
      </View>
      <View className="gap-0.5 p-3">
        <Text variant="caption" weight="semibold" numberOfLines={1}>
          {product.name}
        </Text>
        {product.brand ? (
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
        <Text variant="caption" weight="semibold" tone="accent" tabular>
          {product.variants.length > 1 ? t('storefront.fromPrice', { price: formatMoney(minPrice, currency) }) : formatMoney(minPrice, currency)}
        </Text>
      </View>
    </Card>
  );
}
