import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';
import type { TextVariant } from '@/theme';

import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableScaleProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-primary-tint',
  ghost: 'bg-transparent',
  destructive: 'bg-negative',
};

const disabledClass: Record<ButtonVariant, string> = {
  primary: 'bg-ink-tertiary/40',
  secondary: 'bg-surface-sunken',
  ghost: 'bg-transparent',
  destructive: 'bg-ink-tertiary/40',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 rounded-sm',
  md: 'h-12 px-5 rounded-md',
  lg: 'h-14 px-6 rounded-md',
};

const labelVariant: Record<ButtonSize, TextVariant> = {
  sm: 'caption',
  md: 'body',
  lg: 'title',
};

const iconSize: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const contentColor =
    variant === 'primary' || variant === 'destructive'
      ? colors.onPrimary
      : variant === 'secondary'
        ? colors.primary
        : colors.primary;

  const labelTone =
    variant === 'primary' || variant === 'destructive'
      ? ('inverse' as const)
      : ('accent' as const);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      haptic={variant === 'destructive' ? 'press' : 'tap'}
      className={cn(
        'flex-row items-center justify-center gap-2',
        sizeClass[size],
        isDisabled ? disabledClass[variant] : containerClass[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {Icon ? <Icon size={iconSize[size]} color={contentColor} strokeWidth={2} /> : null}
          <Text
            variant={labelVariant[size]}
            weight="semibold"
            tone={labelTone}
            className={isDisabled && variant !== 'ghost' ? 'opacity-70' : undefined}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}
