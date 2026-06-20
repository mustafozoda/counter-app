import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STOREFRONT_MAX_WIDTH } from '@/lib/responsive';

import { StorefrontTopNav } from './storefront-top-nav';

/**
 * Desktop/tablet storefront chrome: a full-width top navigation bar above a
 * centered content column. Mounted only at wide widths — the phone storefront
 * (bottom tab bar) is untouched.
 */
export function StorefrontDesktopShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <StorefrontTopNav />
      <View className="min-h-0 flex-1">
        <View className="w-full flex-1 self-center" style={{ maxWidth: STOREFRONT_MAX_WIDTH }}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}
