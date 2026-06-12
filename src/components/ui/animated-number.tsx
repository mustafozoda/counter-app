import { cssInterop } from 'nativewind';
import { useEffect, type ComponentProps } from 'react';
import { TextInput, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { timing } from '@/theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
cssInterop(AnimatedTextInput, { className: 'style' });

// Reanimated drives a non-editable TextInput's `text` prop from the UI
// thread — the classic 60fps counter technique, no re-renders per frame.
Animated.addWhitelistedNativeProps({ text: true });

type AnimatedTextInputProps = ComponentProps<typeof AnimatedTextInput>;

export interface AnimatedNumberProps {
  value: number;
  /** Worklet-safe formatter; defaults to rounding. */
  format?: (value: number) => string;
  className?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

function defaultFormat(value: number): string {
  'worklet';
  return String(Math.round(value));
}

/** A number that counts up/down to its value with an exponential ease-out. */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  className,
  style,
  accessibilityLabel,
}: AnimatedNumberProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, timing.countUp);
  }, [value, progress]);

  const animatedProps = useAnimatedProps(() => {
    return { text: format(progress.value) };
  });

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={format(0)}
      // `text` is whitelisted above but absent from TextInputProps.
      animatedProps={animatedProps as AnimatedTextInputProps['animatedProps']}
      className={className}
      style={[{ padding: 0 }, style]}
      underlineColorAndroid="transparent"
      accessibilityLabel={accessibilityLabel ?? String(value)}
      allowFontScaling={false}
      pointerEvents="none"
    />
  );
}
