import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Shirt } from 'lucide-react-native';

import { Text } from '@/components/ui';
import type { Product } from '@/types/models';

export interface ProductImageProps {
  product: Pick<Product, 'name' | 'images'>;
  size: number;
  radius?: number;
}

/** Hash a name to a stable pastel pair so placeholders feel intentional. */
function placeholderColors(name: string): [string, string] {
  const palettes: [string, string][] = [
    ['#C7D2FE', '#A5B4FC'],
    ['#BBF7D0', '#86EFAC'],
    ['#FDE68A', '#FCD34D'],
    ['#FECDD3', '#FDA4AF'],
    ['#BAE6FD', '#7DD3FC'],
    ['#DDD6FE', '#C4B5FD'],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length] ?? palettes[0]!;
}

/** Cover photo, or a warm generated placeholder when none exists yet. */
export function ProductImage({ product, size, radius = 16 }: ProductImageProps) {
  const cover = product.images[0];

  if (cover) {
    return (
      <Image
        source={{ uri: cover }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`${product.name} photo`}
      />
    );
  }

  const [from, to] = placeholderColors(product.name);
  const initial = (product.name.trim()[0] ?? '?').toUpperCase();

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}
    >
      {size >= 72 ? (
        <Shirt size={size * 0.32} color="rgba(22,21,26,0.45)" strokeWidth={1.75} />
      ) : (
        <Text weight="bold" style={{ color: 'rgba(22,21,26,0.5)', fontSize: size * 0.4, lineHeight: size * 0.5 }}>
          {initial}
        </Text>
      )}
    </LinearGradient>
  );
}
