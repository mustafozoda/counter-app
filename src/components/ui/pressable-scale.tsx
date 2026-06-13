import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';

import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';

export interface PressableScaleProps extends PressableProps {
  /** Scale while pressed (smaller = more pronounced). */
  scaleTo?: number;
  haptic?: 'tap' | 'press' | 'selection' | 'none';
  className?: string;
}

/**
 * Base tactile surface: a press-scale via NativeWind's `active:` variant plus
 * DS haptics. Button, Card, Chip and the tab bar build on this.
 *
 * Note: this is a plain Pressable (not a Reanimated `createAnimatedComponent`).
 * Putting a `useAnimatedStyle` value in the `style` array of a custom animated
 * component drops NativeWind className styles (flex/layout), which collapses
 * every consumer's layout — so the press animation is CSS-driven here.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { scaleTo = 0.97, haptic = 'tap', onPress, className, children, ...rest },
  ref,
) {
  // Standard Tailwind scale utilities (static classes the compiler can see).
  const pressClass = scaleTo <= 0.92 ? 'active:scale-90' : 'active:scale-95';

  return (
    <Pressable
      ref={ref}
      className={cn(pressClass, className)}
      onPress={(e) => {
        if (haptic !== 'none') haptics[haptic]();
        onPress?.(e);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
});
