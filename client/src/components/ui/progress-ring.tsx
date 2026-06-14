import { useEffect, type ComponentProps } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { springs, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type AnimatedCircleProps = ComponentProps<typeof AnimatedCircle>;

export interface ProgressRingProps {
  /** 0–1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  tone?: 'primary' | 'positive' | 'caution';
  children?: React.ReactNode;
}

/** Animated circular progress — installment plans, goals. */
export function ProgressRing({
  progress,
  size = 72,
  strokeWidth = 7,
  tone = 'primary',
  children,
}: ProgressRingProps) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  const animated = useSharedValue(0);
  useEffect(() => {
    animated.value = withSpring(clamped, springs.gentle);
  }, [clamped, animated]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  const color =
    tone === 'positive' ? colors.positive : tone === 'caution' ? colors.caution : colors.primary;

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.hairline}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps as AnimatedCircleProps['animatedProps']}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? (
        <View className="absolute inset-0 items-center justify-center">{children}</View>
      ) : null}
    </View>
  );
}
