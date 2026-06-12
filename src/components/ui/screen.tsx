import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

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
}: ScreenProps) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn(padded && 'px-5', contentClassName)}
      contentContainerStyle={tabbed ? { paddingBottom: TAB_BAR_CLEARANCE } : undefined}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className={cn('flex-1', padded && 'px-5', contentClassName)}
      style={tabbed ? { paddingBottom: TAB_BAR_CLEARANCE } : undefined}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} className={cn('flex-1 bg-background', className)}>
      {keyboardAvoid && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
