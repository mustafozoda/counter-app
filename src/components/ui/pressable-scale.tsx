import { cssInterop } from 'nativewind';
import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { springs } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// NativeWind only auto-maps className on registered components; wrapped
// animated components need explicit registration.
cssInterop(AnimatedPressable, { className: 'style' });

export interface PressableScaleProps extends PressableProps {
  /** Scale while pressed. */
  scaleTo?: number;
  haptic?: 'tap' | 'press' | 'selection' | 'none';
  className?: string;
}

/**
 * Base tactile surface: spring scale on press + DS haptics. Button, Card,
 * Chip and the tab bar all build on this so the whole app shares one touch
 * physics model.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = 0.97, haptic = 'tap', onPressIn, onPress, style, ...rest },
  ref,
) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pressed.value * (scaleTo - 1) }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      style={[animatedStyle, style as object]}
      onPressIn={(e) => {
        pressed.value = withSpring(1, springs.snappy);
        onPressIn?.(e);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, springs.standard);
      }}
      onPress={(e) => {
        if (haptic !== 'none') haptics[haptic]();
        onPress?.(e);
      }}
      {...rest}
    />
  );
});
