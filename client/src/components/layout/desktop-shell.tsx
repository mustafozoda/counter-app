import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DesktopSidebar } from './desktop-sidebar';

/**
 * Desktop/tablet chrome: a persistent left sidebar beside a flexible content
 * area that hosts the routed screen. Mounted only at wide widths — the phone
 * build never renders this, so the mobile UI is untouched.
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 flex-row bg-background">
      <DesktopSidebar />
      <View className="min-w-0 flex-1">{children}</View>
    </SafeAreaView>
  );
}
