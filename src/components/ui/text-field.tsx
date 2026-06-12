import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useCallback, useRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { springs, textStyle, useTheme } from '@/theme';

import { Text } from './text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helper?: string;
  icon?: LucideIcon;
  /** Static prefix shown once the field is active, e.g. a currency symbol. */
  prefix?: string;
  containerClassName?: string;
}

/**
 * Counter DS text input: floating label, animated focus ring, error state.
 * Controlled — pair with react-hook-form's Controller.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    helper,
    icon: Icon,
    prefix,
    containerClassName,
    value,
    onFocus,
    onBlur,
    secureTextEntry,
    multiline,
    ...inputProps
  },
  forwardedRef,
) {
  const { colors } = useTheme();
  const innerRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasValue = (value?.length ?? 0) > 0;
  const floated = focused || hasValue;
  const hasError = Boolean(error);

  const floatProgress = useDerivedValue(
    () => withSpring(floated ? 1 : 0, springs.snappy),
    [floated],
  );
  const focusProgress = useDerivedValue(
    () => withTiming(focused ? 1 : 0, { duration: 160 }),
    [focused],
  );

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatProgress.value, [0, 1], [0, -11]) },
      { scale: interpolate(floatProgress.value, [0, 1], [1, 0.78]) },
    ],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? colors.negative
      : interpolateColor(focusProgress.value, [0, 1], [colors.hairline, colors.primary]),
  }));

  const setRefs = useCallback(
    (node: TextInput | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const labelColor = hasError
    ? colors.negative
    : focused
      ? colors.primary
      : colors.inkTertiary;

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      <Pressable accessible={false} onPress={() => innerRef.current?.focus()}>
        <Animated.View
          style={borderStyle}
          className={cn(
            'flex-row items-center rounded-md border bg-surface px-4 dark:bg-surface-elevated',
            multiline ? 'min-h-28 items-start py-3' : 'h-14',
          )}
        >
          {Icon ? (
            <View className="mr-3">
              <Icon size={20} color={focused ? colors.primary : colors.inkTertiary} strokeWidth={2} />
            </View>
          ) : null}

          <View className="flex-1 justify-center">
            <Animated.Text
              style={[
                textStyle('body'),
                { color: labelColor, transformOrigin: 'left center' },
                labelStyle,
              ]}
              className="absolute"
              numberOfLines={1}
            >
              {label}
            </Animated.Text>

            <View className="flex-row items-center">
              {prefix && floated ? (
                <Animated.Text
                  entering={FadeInDown.springify().damping(18)}
                  style={[textStyle('body'), { color: colors.inkSecondary }]}
                  className="mr-1 mt-3.5"
                >
                  {prefix}
                </Animated.Text>
              ) : null}
              <TextInput
                ref={setRefs}
                value={value}
                onFocus={handleFocus}
                onBlur={handleBlur}
                secureTextEntry={secureTextEntry && !revealed}
                multiline={multiline}
                className="flex-1 pt-3.5 text-ink"
                style={[textStyle('body'), { paddingBottom: multiline ? 0 : 2 }]}
                placeholderTextColor={colors.inkTertiary}
                cursorColor={colors.primary}
                selectionColor={colors.primary}
                accessibilityLabel={label}
                {...inputProps}
              />
            </View>
          </View>

          {secureTextEntry ? (
            <Pressable
              onPress={() => setRevealed((r) => !r)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              className="ml-2"
            >
              {revealed ? (
                <EyeOff size={20} color={colors.inkTertiary} strokeWidth={2} />
              ) : (
                <Eye size={20} color={colors.inkTertiary} strokeWidth={2} />
              )}
            </Pressable>
          ) : null}
        </Animated.View>
      </Pressable>

      {hasError ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)}>
          <Text className="px-1" variant="caption" tone="negative">
            {error}
          </Text>
        </Animated.View>
      ) : helper ? (
        <Text className="px-1" variant="caption" tone="tertiary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
