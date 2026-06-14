import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react-native';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  SlideInUp,
  SlideOutUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { springs, useTheme, type ThemeColors } from '@/theme';
import { useToastStore, type ToastItem, type ToastVariant } from '@/stores/toast';

import { Text } from './text';

const variantMeta: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; color: keyof ThemeColors; tint: keyof ThemeColors }
> = {
  success: { icon: CheckCircle2, color: 'positive', tint: 'positiveTint' },
  error: { icon: AlertCircle, color: 'negative', tint: 'negativeTint' },
  warning: { icon: AlertTriangle, color: 'caution', tint: 'cautionTint' },
  info: { icon: Info, color: 'info', tint: 'infoTint' },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { colors, shadows } = useTheme();
  const dismiss = useToastStore((s) => s.dismiss);
  const translateY = useSharedValue(0);

  const meta = variantMeta[toast.variant];
  const Icon = meta.icon;

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -24 || e.velocityY < -500) {
        runOnJS(dismiss)(toast.id);
      } else {
        translateY.value = withSpring(0, springs.snappy);
      }
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={SlideInUp.springify().damping(20)}
        exiting={SlideOutUp.duration(180)}
        layout={LinearTransition.springify().damping(20)}
        style={[shadows.lg, dragStyle]}
        className="mb-2 flex-row items-center gap-3 rounded-lg border border-hairline bg-surface p-4 dark:bg-surface-elevated"
        accessibilityRole="alert"
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: colors[meta.tint] }}
        >
          <Icon size={18} color={colors[meta.color]} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text variant="body" weight="semibold">
            {toast.title}
          </Text>
          {toast.message ? (
            <Text variant="caption" tone="secondary" numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Mount once at the root, above navigation. Swipe up to dismiss. */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 px-4"
      style={{ top: insets.top + 8 }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </View>
  );
}
