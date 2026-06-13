import { View } from 'react-native';

import { cn } from '@/lib/cn';

import { Text } from './text';

export type BadgeTone = 'positive' | 'caution' | 'negative' | 'info' | 'neutral' | 'accent';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Leading status dot. */
  dot?: boolean;
  className?: string;
}

const toneClasses: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  positive: { bg: 'bg-positive-tint', text: 'text-positive', dot: 'bg-positive' },
  caution: { bg: 'bg-caution-tint', text: 'text-caution', dot: 'bg-caution' },
  negative: { bg: 'bg-negative-tint', text: 'text-negative', dot: 'bg-negative' },
  info: { bg: 'bg-info-tint', text: 'text-info', dot: 'bg-info' },
  neutral: { bg: 'bg-surface-sunken dark:bg-surface', text: 'text-ink-secondary', dot: 'bg-ink-tertiary' },
  accent: { bg: 'bg-primary-tint', text: 'text-primary', dot: 'bg-primary' },
};

/** Status pill — stock states, order states, plan states. */
export function Badge({ label, tone = 'neutral', dot = false, className }: BadgeProps) {
  const classes = toneClasses[tone];
  return (
    <View
      className={cn('flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1', classes.bg, className)}
    >
      {dot ? <View className={cn('h-1.5 w-1.5 rounded-full', classes.dot)} /> : null}
      <Text variant="micro" weight="semibold" className={classes.text}>
        {label}
      </Text>
    </View>
  );
}
