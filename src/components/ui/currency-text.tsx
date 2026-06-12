import { useMemo } from 'react';

import { cn } from '@/lib/cn';
import { formatMoney, formatMoneyWithSpec, getCurrencySpec } from '@/lib/format';
import { textStyle, type TextVariant, type TextWeight } from '@/theme';

import { AnimatedNumber } from './animated-number';
import { Text } from './text';

export interface CurrencyTextProps {
  amount: number;
  currency: string;
  variant?: TextVariant;
  weight?: TextWeight;
  /** Count up to the amount (dashboard heroes). Off = static (lists, receipts). */
  animated?: boolean;
  tone?: 'primary' | 'secondary' | 'positive' | 'negative' | 'inverse';
  className?: string;
}

const toneClass = {
  primary: 'text-ink',
  secondary: 'text-ink-secondary',
  positive: 'text-positive',
  negative: 'text-negative',
  inverse: 'text-on-primary',
} as const;

/**
 * Money, the hero of Counter (§5.1): display face, tabular figures, and an
 * animated count-up where the number is the headline.
 */
export function CurrencyText({
  amount,
  currency,
  variant = 'displaySm',
  weight,
  animated = false,
  tone = 'primary',
  className,
}: CurrencyTextProps) {
  const spec = useMemo(() => getCurrencySpec(currency), [currency]);

  if (!animated) {
    return (
      <Text
        variant={variant}
        weight={weight}
        tabular
        className={cn(toneClass[tone], className)}
        accessibilityLabel={formatMoney(amount, currency)}
      >
        {formatMoney(amount, currency)}
      </Text>
    );
  }

  return (
    <AnimatedNumber
      value={amount}
      format={(v) => {
        'worklet';
        return formatMoneyWithSpec(v, spec);
      }}
      className={cn(toneClass[tone], className)}
      style={textStyle(variant, weight, { tabular: true })}
      accessibilityLabel={formatMoney(amount, currency)}
    />
  );
}
