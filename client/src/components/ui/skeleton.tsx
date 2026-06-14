import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  className?: string;
}

/** Breathing placeholder block. Compose into screen-specific skeletons. */
export function Skeleton({ width = '100%', height = 16, radius = 8, className }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={cn('bg-surface-sunken dark:bg-surface-elevated', className)}
      style={[{ width, height, borderRadius: radius }, animatedStyle]}
      accessibilityElementsHidden
    />
  );
}
