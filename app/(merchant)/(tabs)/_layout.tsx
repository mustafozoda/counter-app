import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';

import { FloatingTabBar } from '@/components/ui';

// A bottom-positioned Material Top Tabs navigator gives us a finger-tracking
// pager: screens slide in/out smoothly as you swipe between them, while the
// custom FloatingTabBar (with the center Sell FAB) replaces the default bar.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
      <MaterialTopTabs.Screen name="products" options={{ title: 'Products' }} />
      <MaterialTopTabs.Screen name="orders" options={{ title: 'Orders' }} />
      <MaterialTopTabs.Screen name="more" options={{ title: 'More' }} />
    </MaterialTopTabs>
  );
}
