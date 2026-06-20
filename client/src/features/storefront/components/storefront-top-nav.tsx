import { usePathname, useRouter } from 'expo-router';
import { Heart, LogOut, ShoppingBag, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Logo, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { STOREFRONT_MAX_WIDTH } from '@/lib/responsive';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

type Href = Parameters<ReturnType<typeof useRouter>['navigate']>[0];

interface NavLink {
  labelKey: string;
  href: string;
  match: (path: string) => boolean;
}

const LINKS: NavLink[] = [
  { labelKey: 'storefront.navShop', href: '/(storefront)/(tabs)', match: (p) => p === '/' },
  {
    labelKey: 'storefront.navBrowse',
    href: '/(storefront)/(tabs)/catalog',
    match: (p) => p.startsWith('/catalog') || p.startsWith('/product'),
  },
  {
    labelKey: 'storefront.navSaved',
    href: '/(storefront)/(tabs)/wishlist',
    match: (p) => p.startsWith('/wishlist'),
  },
];

/**
 * Customer-facing top navigation for the desktop storefront — replaces the
 * phone's bottom tab bar. Full-width bar with the brand, primary links, and
 * cart/account actions; its inner row is centered to the storefront column.
 */
export function StorefrontTopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useStoreProfile((s) => s.store);
  const cartCount = useStorefrontCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));

  const go = (href: string) => router.navigate(href as Href);
  const cartActive = pathname.startsWith('/cart');
  const accountActive = pathname.startsWith('/account');

  return (
    <View className="border-b border-hairline bg-surface dark:bg-surface-elevated">
      <View
        className="w-full flex-row items-center gap-6 self-center px-6 py-3"
        style={{ maxWidth: STOREFRONT_MAX_WIDTH }}
      >
        {/* Brand */}
        <Pressable
          onPress={() => go('/(storefront)/(tabs)')}
          accessibilityRole="link"
          className="flex-row items-center gap-2.5"
        >
          <Logo size={34} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
          <Text variant="title" weight="bold" numberOfLines={1}>
            {store?.name ?? t('storefront.ourStore')}
          </Text>
        </Pressable>

        {/* Primary links */}
        <View className="flex-1 flex-row items-center gap-1">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Pressable
                key={link.href}
                onPress={() => go(link.href)}
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                className={cn(
                  'rounded-md px-3 py-2',
                  active ? 'bg-primary-tint' : 'hover:bg-surface-sunken dark:hover:bg-surface',
                )}
              >
                <Text
                  variant="body"
                  weight={active ? 'semibold' : 'medium'}
                  tone={active ? 'accent' : 'secondary'}
                >
                  {t(link.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Actions */}
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => go('/(storefront)/(tabs)/wishlist')}
            accessibilityRole="link"
            accessibilityLabel={t('storefront.navSaved')}
            className="h-10 w-10 items-center justify-center rounded-full hover:bg-surface-sunken dark:hover:bg-surface"
          >
            <Heart size={20} color={colors.inkSecondary} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={() => go('/(storefront)/(tabs)/cart')}
            accessibilityRole="link"
            accessibilityLabel={t('storefront.navCart')}
            className={cn(
              'h-10 w-10 items-center justify-center rounded-full',
              cartActive ? 'bg-primary-tint' : 'hover:bg-surface-sunken dark:hover:bg-surface',
            )}
          >
            <View>
              <ShoppingBag
                size={20}
                color={cartActive ? colors.primary : colors.inkSecondary}
                strokeWidth={2}
              />
              {cartCount > 0 ? (
                <View className="absolute -right-2 -top-1.5 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                  <Text variant="micro" weight="bold" tone="inverse" tabular>
                    {cartCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>

          <Pressable
            onPress={() => go('/(storefront)/(tabs)/account')}
            accessibilityRole="link"
            accessibilityLabel={t('storefront.navAccount')}
            className={cn(
              'h-10 w-10 items-center justify-center rounded-full',
              accountActive ? 'bg-primary-tint' : 'hover:bg-surface-sunken dark:hover:bg-surface',
            )}
          >
            <User
              size={20}
              color={accountActive ? colors.primary : colors.inkSecondary}
              strokeWidth={2}
            />
          </Pressable>

          <Pressable
            onPress={() => router.replace('/(merchant)/(tabs)' as Href)}
            accessibilityRole="button"
            accessibilityLabel={t('storefront.exitPreview')}
            className="ml-1 h-10 flex-row items-center gap-2 rounded-full border border-hairline px-3 hover:bg-surface-sunken dark:hover:bg-surface"
          >
            <LogOut size={16} color={colors.inkSecondary} strokeWidth={2} />
            <Text variant="caption" weight="medium" tone="secondary">
              {t('storefront.exitPreview')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
