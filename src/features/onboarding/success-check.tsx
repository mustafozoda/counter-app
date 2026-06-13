import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { brandGradient } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Length of the checkmark path below (two straight segments).
const CHECK_LENGTH = 34;

export interface SuccessCheckProps {
  size?: number;
}

/** Gradient badge with a hand-drawn checkmark stroke (§5.7 "sale complete" DNA). */
export function SuccessCheck({ size = 120 }: SuccessCheckProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      300,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }),
    );
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - progress.value),
  }));

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(14)}
      style={{
        width: size,
        height: size,
        shadowColor: brandGradient[0],
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
        shadowOpacity: 0.4,
        elevation: 12,
      }}
    >
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View className="flex-1 items-center justify-center">
        <Svg width={size * 0.52} height={size * 0.52} viewBox="0 0 52 52">
          <AnimatedPath
            d="M14 27l8 8 16-16"
            stroke="#FFFFFF"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={animatedProps}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}
