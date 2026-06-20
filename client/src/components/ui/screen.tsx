import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';
import { READABLE_MAX_WIDTH, useIsWide } from '@/lib/responsive';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Horizontal gutter (px-5). */
  padded?: boolean;
  /** Extra bottom padding so content clears the floating tab bar. */
  tabbed?: boolean;
  keyboardAvoid?: boolean;
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
  /** Let content span the full width on wide screens (dashboards, split views). */
  wideFullBleed?: boolean;
}

/** Clearance for the floating tab bar (height + offsets). */
export const TAB_BAR_CLEARANCE = 118;

/** Base screen container: themed background, safe areas, scroll/keyboard. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  tabbed = false,
  keyboardAvoid = false,
  edges = ['top', 'left', 'right'],
  className,
  contentClassName,
  wideFullBleed = false,
}: ScreenProps) {
  const isWide = useIsWide();
  // On wide screens, cap a screen's content to a readable column and center it
  // so forms and lists don't sprawl across the desktop shell's content area.
  // Phones never hit this branch, so the mobile layout is unchanged.
  const capped = isWide && !wideFullBleed;

  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn(padded && 'px-5', contentClassName)}
      contentContainerStyle={tabbed ? { paddingBottom: TAB_BAR_CLEARANCE } : undefined}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {capped ? (
        <View className="w-full self-center" style={{ maxWidth: READABLE_MAX_WIDTH }}>
          {children}
        </View>
      ) : (
        children
      )}
    </ScrollView>
  ) : (
    <View
      className={cn('flex-1', padded && 'px-5', contentClassName)}
      style={tabbed ? { paddingBottom: TAB_BAR_CLEARANCE } : undefined}
    >
      {capped ? (
        <View className="w-full flex-1 self-center" style={{ maxWidth: READABLE_MAX_WIDTH }}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-background', className)}>
      {keyboardAvoid ? (
        // keyboard-controller's KeyboardAvoidingView works on Android too, which
        // matters under edge-to-edge where the OS no longer resizes the window
        // for the soft keyboard (RN's built-in version is effectively iOS-only).
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
