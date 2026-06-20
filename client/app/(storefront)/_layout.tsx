import { Stack } from 'expo-router';

import { StorefrontDesktopShell } from '@/features/storefront/components/storefront-desktop-shell';
import { useIsWide } from '@/lib/responsive';

export default function StorefrontLayout() {
  const isWide = useIsWide();
  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen
        name="checkout"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );

  // Wide widths get the top-nav storefront shell wrapping the same stack; phones
  // render the stack alone (bottom tab bar, full-screen push navigation).
  return isWide ? <StorefrontDesktopShell>{stack}</StorefrontDesktopShell> : stack;
}
