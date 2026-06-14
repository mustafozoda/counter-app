import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useRef, type ReactNode } from 'react';
import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { InsideSheetContext } from './sheet-context';
import { Text } from './text';

export type SheetRef = BottomSheetModal;

export interface SheetProps {
  title?: string;
  children: ReactNode;
  /** Omit for dynamic content-height sizing. */
  snapPoints?: (string | number)[];
  /** Use when rendering your own scrollable (BottomSheetFlatList etc.). */
  raw?: boolean;
  onDismiss?: () => void;
}

/** Convenience: `const sheet = useSheetRef(); sheet.current?.present()`. */
export function useSheetRef() {
  return useRef<BottomSheetModal>(null);
}

/**
 * Counter DS bottom sheet — gesture-driven, themed surface, soft backdrop.
 * Requires <BottomSheetModalProvider> at the root (installed in app/_layout).
 */
export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(
  { title, children, snapPoints, raw = false, onDismiss },
  ref,
) {
  const { colors, isDark } = useTheme();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior="close"
      />
    ),
    [],
  );

  const header = title ? (
    <View className="border-b border-hairline px-5 pb-3 pt-1">
      <Text variant="h2" weight="semibold">
        {title}
      </Text>
    </View>
  ) : null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
        borderRadius: radius['2xl'],
      }}
      handleIndicatorStyle={{ backgroundColor: colors.inkTertiary, width: 40, height: 4 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      // Must stay "adjustPan": with "interactive" + "adjustResize", gorhom skips
      // its own keyboard-avoidance on Android and defers to an OS window resize
      // that doesn't happen here — leaving inputs hidden behind the keyboard.
      android_keyboardInputMode="adjustPan"
    >
      <InsideSheetContext.Provider value={true}>
        {raw ? (
          <>
            {header}
            {children}
          </>
        ) : (
          <BottomSheetView>
            {header}
            <View className="px-5 pb-10 pt-2">{children}</View>
          </BottomSheetView>
        )}
      </InsideSheetContext.Provider>
    </BottomSheetModal>
  );
});
