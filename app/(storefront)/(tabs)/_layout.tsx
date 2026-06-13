import { Tabs } from 'expo-router';

import { StorefrontTabBar } from '@/features/storefront/components/storefront-tab-bar';

export default function StorefrontTabsLayout() {
  return (
    <Tabs tabBar={(props) => <StorefrontTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Shop' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Browse' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart' }} />
      <Tabs.Screen name="wishlist" options={{ title: 'Saved' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
