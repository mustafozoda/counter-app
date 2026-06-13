import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { haptics } from '@/lib/haptics';
import { useTheme, type ThemeColors } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

export interface SwipeAction {
  icon: LucideIcon;
  label: string;
  tone: 'negative' | 'caution' | 'accent';
  onPress: () => void;
}

export interface SwipeableRowProps {
  children: ReactNode;
  /** Revealed by swiping left. */
  actions: SwipeAction[];
}

const toneToken: Record<SwipeAction['tone'], { bg: keyof ThemeColors; fg: keyof ThemeColors }> = {
  negative: { bg: 'negativeTint', fg: 'negative' },
  caution: { bg: 'cautionTint', fg: 'caution' },
  accent: { bg: 'primaryTint', fg: 'primary' },
};

/** Swipe-to-reveal actions (archive, restock…) on list rows. */
export function SwipeableRow({ children, actions }: SwipeableRowProps) {
  const { colors } = useTheme();
  const ref = useRef<SwipeableMethods>(null);

  const renderActions = () => (
    <View className="flex-row items-stretch gap-2 pl-2">
      {actions.map((action) => {
        const tokens = toneToken[action.tone];
        return (
          <PressableScale
            key={action.label}
            onPress={() => {
              ref.current?.close();
              action.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            className="w-20 items-center justify-center gap-1 rounded-md"
            style={{ backgroundColor: colors[tokens.bg] }}
          >
            <action.icon size={20} color={colors[tokens.fg]} strokeWidth={2} />
            <Text variant="micro" weight="semibold" style={{ color: colors[tokens.fg] }}>
              {action.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={renderActions}
      onSwipeableWillOpen={() => haptics.selection()}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
