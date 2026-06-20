import { Tabs } from 'expo-router';

import { StorefrontTabBar } from '@/features/storefront/components/storefront-tab-bar';
import { useIsWide } from '@/lib/responsive';

export default function StorefrontTabsLayout() {
  // On wide screens the StorefrontTopNav (in the desktop shell) drives
  // navigation, so the bottom tab bar is hidden.
  const isWide = useIsWide();

  return (
    <Tabs
      tabBar={isWide ? () => null : (props) => <StorefrontTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shop' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Browse' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Saved' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
