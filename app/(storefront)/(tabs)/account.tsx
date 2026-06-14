import { useRouter } from 'expo-router';
import { Heart, MapPin, Package, Store as StoreIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Card, PressableScale, Text } from '@/components/ui';
import { useWishlist } from '@/stores/wishlist';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { useTheme } from '@/theme';

export default function StorefrontAccount() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useStoreProfile((s) => s.store);
  const wishlistCount = useWishlist((s) => s.productIds.length);
  const cartCount = useStorefrontCart((s) => s.lines.length);

  const rows = [
    { icon: Package, label: t('storefront.myOrders'), caption: t('storefront.trackReorder'), onPress: () => toast.info(t('storefront.demoTitle'), t('storefront.demoOrders')) },
    { icon: Heart, label: t('storefront.wishlist'), caption: t('storefront.savedCount', { count: wishlistCount }), onPress: () => router.push('/(storefront)/(tabs)/wishlist') },
    { icon: MapPin, label: t('storefront.addresses'), caption: t('storefront.deliveryDetails'), onPress: () => toast.info(t('storefront.demoTitle'), t('storefront.demoAddresses')) },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-5 pb-28 pt-1" showsVerticalScrollIndicator={false}>
        <Text variant="h1" weight="bold">
          {t('storefront.navAccount')}
        </Text>

        <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5">
          <Card className="flex-row items-center gap-4">
            <Avatar name={t('storefront.guestShopper')} size={52} />
            <View className="flex-1">
              <Text variant="title" weight="semibold">
                {t('storefront.guestShopper')}
              </Text>
              <Text variant="caption" tone="tertiary">
                {t('storefront.browsing', { name: store?.name ?? t('storefront.theStore') })}
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} className="mt-5">
          <Card padded={false}>
            {rows.map((row, index) => (
              <PressableScale
                key={row.label}
                scaleTo={0.99}
                onPress={row.onPress}
                accessibilityRole="button"
                className={`flex-row items-center gap-3 px-4 py-3.5 ${index < rows.length - 1 ? 'border-b border-hairline' : ''}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                  <row.icon size={18} color={colors.inkSecondary} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text variant="body" weight="medium">
                    {row.label}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {row.caption}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} className="mt-5">
          <PressableScale
            onPress={() => router.replace('/(merchant)/(tabs)')}
            accessibilityRole="button"
            className="h-12 flex-row items-center justify-center gap-2 rounded-md bg-primary-tint"
          >
            <StoreIcon size={18} color={colors.primary} strokeWidth={2} />
            <Text variant="body" weight="semibold" tone="accent">
              {t('storefront.backToMerchant')}
            </Text>
          </PressableScale>
          {cartCount > 0 ? (
            <Text variant="micro" tone="tertiary" className="mt-3 text-center">
              {t('storefront.itemsWaiting', { count: cartCount })}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
