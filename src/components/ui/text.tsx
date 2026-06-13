import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';
import { textStyle, type TextVariant, type TextWeight } from '@/theme';

type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'positive'
  | 'negative'
  | 'caution'
  | 'inverse';

const toneClass: Record<TextTone, string> = {
  primary: 'text-ink',
  secondary: 'text-ink-secondary',
  tertiary: 'text-ink-tertiary',
  accent: 'text-primary',
  positive: 'text-positive',
  negative: 'text-negative',
  caution: 'text-caution',
  inverse: 'text-on-primary',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  /** Space Mono — SKUs, barcodes, order numbers. */
  mono?: boolean;
  /** Tabular figures — required for any number that changes in place. */
  tabular?: boolean;
  className?: string;
}

/**
 * The only way text is rendered in Counter. Locks every string to the DS
 * type scale; raw <RNText> elsewhere is a code-review error.
 */
export function Text({
  variant = 'body',
  weight,
  tone = 'primary',
  mono = false,
  tabular = false,
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      className={cn(toneClass[tone], className)}
      style={[textStyle(variant, weight, { mono, tabular }), style]}
      {...rest}
    />
  );
}
