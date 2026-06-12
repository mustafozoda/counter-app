import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme, type ElevationLevel } from '@/theme';

import { PressableScale, type PressableScaleProps } from './pressable-scale';

interface CardBaseProps {
  /** Soft layered shadow level; dark mode leans on the hairline border instead. */
  elevation?: ElevationLevel | 'none';
  padded?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface CardProps extends ViewProps, CardBaseProps {
  /** Makes the card tactile (scale + haptic) and pressable. */
  onPress?: PressableScaleProps['onPress'];
}

/**
 * Counter DS surface: warm white (or elevated dark), generous radius,
 * depth through soft shadow + hairline — never hard borders alone.
 */
export function Card({
  elevation = 'sm',
  padded = true,
  className,
  style,
  children,
  onPress,
  ...rest
}: CardProps) {
  const { shadows } = useTheme();
  const baseClass = cn(
    'rounded-xl border border-hairline bg-surface dark:bg-surface-elevated',
    padded && 'p-5',
    className,
  );
  const shadowStyle = elevation === 'none' ? undefined : shadows[elevation];

  if (onPress) {
    return (
      <PressableScale
        scaleTo={0.985}
        onPress={onPress}
        className={baseClass}
        style={[shadowStyle, style as object]}
        accessibilityRole="button"
      >
        {children}
      </PressableScale>
    );
  }

  return (
    <View className={baseClass} style={[shadowStyle, style]} {...rest}>
      {children}
    </View>
  );
}
