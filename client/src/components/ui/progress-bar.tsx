import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { springs } from '@/theme';

export interface ProgressBarProps {
  /** 0–1. */
  progress: number;
  height?: number;
  tone?: 'primary' | 'positive' | 'caution' | 'negative';
  className?: string;
}

const toneClass = {
  primary: 'bg-primary',
  positive: 'bg-positive',
  caution: 'bg-caution',
  negative: 'bg-negative',
} as const;

/** Springy determinate progress (wizard steps, installment plans). */
export function ProgressBar({ progress, height = 6, tone = 'primary', className }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));

  const fillStyle = useAnimatedStyle(() => ({
    width: withSpring(`${clamped * 100}%`, springs.gentle),
  }));

  return (
    <View
      className={cn('w-full overflow-hidden rounded-full bg-surface-sunken dark:bg-surface-elevated', className)}
      style={{ height }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View className={cn('h-full rounded-full', toneClass[tone])} style={fillStyle} />
    </View>
  );
}
