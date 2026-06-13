import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { cn } from '@/lib/cn';
import { STAGGER_MS, useTheme } from '@/theme';

import { Button } from './button';
import { Text } from './text';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Friendly empty state (§5.5): never a bare "No data" — an icon with a warm
 * tint, a headline, one line of guidance, and a way forward.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View className={cn('items-center justify-center px-8 py-12', className)}>
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-primary-tint"
      >
        <Icon size={34} color={colors.primary} strokeWidth={1.75} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(STAGGER_MS).springify().damping(18)}>
        <Text variant="h2" weight="semibold" className="text-center">
          {title}
        </Text>
      </Animated.View>
      {message ? (
        <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)}>
          <Text variant="body" tone="secondary" className="mt-2 text-center">
            {message}
          </Text>
        </Animated.View>
      ) : null}
      {actionLabel && onAction ? (
        <Animated.View entering={FadeInDown.delay(STAGGER_MS * 3).springify().damping(18)}>
          <Button label={actionLabel} onPress={onAction} className="mt-6" />
        </Animated.View>
      ) : null}
    </View>
  );
}
