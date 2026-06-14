import type { LucideIcon } from 'lucide-react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { formatPercentDelta } from '@/lib/format';
import { textStyle, useTheme } from '@/theme';

import { AnimatedNumber } from './animated-number';
import { Card, type CardProps } from './card';
import { CurrencyText } from './currency-text';
import { Skeleton } from './skeleton';
import { Sparkline } from './sparkline';
import { Text } from './text';

export interface StatCardProps extends Pick<CardProps, 'onPress' | 'className'> {
  label: string;
  /** Money value (with `currency`) or plain count. */
  value: number;
  currency?: string;
  /** Period-over-period change as a ratio, e.g. 0.124 → "+12.4%". */
  delta?: number;
  sparkline?: number[];
  icon?: LucideIcon;
  loading?: boolean;
}

/**
 * Bento-grid stat tile: animated count-up hero number, movement chip,
 * trend sparkline. The dashboard's building block.
 */
export function StatCard({
  label,
  value,
  currency,
  delta,
  sparkline,
  icon: Icon,
  loading = false,
  onPress,
  className,
}: StatCardProps) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <Card className={cn('gap-3', className)}>
        <Skeleton width={96} height={14} />
        <Skeleton width={140} height={30} />
        <Skeleton width={72} height={18} radius={9} />
      </Card>
    );
  }

  const deltaPositive = (delta ?? 0) >= 0;
  const sparkTone = delta === undefined ? 'primary' : deltaPositive ? 'positive' : 'negative';

  return (
    <Card onPress={onPress} className={cn('gap-2', className)}>
      <View className="flex-row items-center justify-between">
        <Text variant="caption" weight="medium" tone="secondary">
          {label}
        </Text>
        {Icon ? (
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-tint">
            <Icon size={16} color={colors.primary} strokeWidth={2} />
          </View>
        ) : null}
      </View>

      {currency ? (
        <CurrencyText amount={value} currency={currency} animated variant="displaySm" />
      ) : (
        <AnimatedNumber value={value} className="text-ink" style={textStyle('displaySm', undefined, { tabular: true })} />
      )}

      <View className="flex-row items-end justify-between">
        {delta !== undefined ? (
          <View
            className={cn(
              'flex-row items-center gap-1 rounded-full px-2 py-1',
              deltaPositive ? 'bg-positive-tint' : 'bg-negative-tint',
            )}
          >
            {deltaPositive ? (
              <TrendingUp size={12} color={colors.positive} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} color={colors.negative} strokeWidth={2.5} />
            )}
            <Text variant="micro" weight="semibold" tone={deltaPositive ? 'positive' : 'negative'} tabular>
              {formatPercentDelta(delta)}
            </Text>
          </View>
        ) : (
          <View />
        )}
        {sparkline && sparkline.length > 1 ? (
          <Sparkline data={sparkline} tone={sparkTone} width={88} height={32} />
        ) : null}
      </View>
    </Card>
  );
}
