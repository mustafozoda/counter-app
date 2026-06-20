import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';

import { FloatingTabBar } from '@/components/ui';
import { useLowStockNotifier } from '@/features/products/use-low-stock-notifier';
import { useIsWide } from '@/lib/responsive';

// A bottom-positioned Material Top Tabs navigator gives us a finger-tracking
// pager: screens slide in/out smoothly as you swipe between them, while the
// custom FloatingTabBar (with the center Sell FAB) replaces the default bar.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
  useLowStockNotifier();
  // On wide screens the persistent DesktopSidebar drives navigation, so the
  // floating bar is hidden and swipe is disabled — the pager just renders the
  // active route inside the desktop shell's content area.
  const isWide = useIsWide();

  return (
    <MaterialTopTabs
      tabBar={isWide ? () => null : (props) => <FloatingTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: !isWide }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
      <MaterialTopTabs.Screen name="products" options={{ title: 'Products' }} />
      <MaterialTopTabs.Screen name="orders" options={{ title: 'Orders' }} />
      <MaterialTopTabs.Screen name="more" options={{ title: 'More' }} />
    </MaterialTopTabs>
  );
}
