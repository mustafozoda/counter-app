import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Heart, Home, Search, ShoppingBag, User, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Text } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { useStorefrontCart } from '@/stores/storefront-cart';
import { useTheme } from '@/theme';

const TAB_META: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: Home, label: 'Shop' },
  catalog: { icon: Search, label: 'Browse' },
  cart: { icon: ShoppingBag, label: 'Cart' },
  wishlist: { icon: Heart, label: 'Saved' },
  account: { icon: User, label: 'Account' },
};

/** Clean customer-facing tab bar (no center FAB — this is shopping, not selling). */
export function StorefrontTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const cartCount = useStorefrontCart((s) => s.lines.reduce((sum, l) => sum + l.qty, 0));

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-0 left-0 right-0"
      style={{ paddingBottom: insets.bottom }}
    >
      <View
        className="flex-row border-t border-hairline bg-surface px-2 pt-2 dark:bg-surface-elevated"
        style={[shadows.lg, { paddingBottom: 8 }]}
      >
        {state.routes
          .filter((r) => TAB_META[r.name])
          .map((route) => {
            const meta = TAB_META[route.name]!;
            const routeIndex = state.routes.findIndex((r) => r.key === route.key);
            const focused = state.index === routeIndex;
            const isCart = route.name === 'cart';
            return (
              <PressableScale
                key={route.key}
                scaleTo={0.9}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={meta.label}
                className="flex-1 items-center justify-center gap-1 py-1"
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) {
                    haptics.tap();
                    navigation.navigate(route.name);
                  }
                }}
              >
                <View>
                  <meta.icon
                    size={23}
                    color={focused ? colors.primary : colors.inkTertiary}
                    strokeWidth={focused ? 2.25 : 2}
                  />
                  {isCart && cartCount > 0 ? (
                    <View className="absolute -right-2.5 -top-1.5 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                      <Text variant="micro" weight="bold" tone="inverse" tabular>
                        {cartCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="micro" weight={focused ? 'semibold' : 'medium'} tone={focused ? 'accent' : 'tertiary'}>
                  {meta.label}
                </Text>
              </PressableScale>
            );
          })}
      </View>
    </View>
  );
}
