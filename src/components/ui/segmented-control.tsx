import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { springs, useTheme } from '@/theme';

import { Text } from './text';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const PADDING = 3;

/** Sliding-thumb segmented control (period switchers, theme picker). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const { shadows } = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);
  const segmentWidth = options.length > 0 ? innerWidth / options.length : 0;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(selectedIndex * segmentWidth, springs.standard) }],
  }));

  return (
    <View
      className={cn('h-11 flex-row rounded-full bg-surface-sunken dark:bg-surface', className)}
      style={{ padding: PADDING }}
      accessibilityRole="tablist"
      onLayout={(e) => setInnerWidth(e.nativeEvent.layout.width - PADDING * 2)}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          className="absolute rounded-full bg-surface dark:bg-surface-elevated"
          style={[
            { width: segmentWidth, top: PADDING, bottom: PADDING, left: PADDING },
            shadows.sm,
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className="flex-1 items-center justify-center rounded-full"
            onPress={() => {
              if (!selected) {
                haptics.selection();
                onChange(option.value);
              }
            }}
          >
            <Text variant="caption" weight={selected ? 'semibold' : 'medium'} tone={selected ? 'primary' : 'secondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
