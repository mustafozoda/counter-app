import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

import { PressableScale, type PressableScaleProps } from './pressable-scale';

export type IconButtonVariant = 'ghost' | 'tonal' | 'surface';

export interface IconButtonProps extends Omit<PressableScaleProps, 'children'> {
  icon: LucideIcon;
  /** Required for screen readers — icon-only controls have no visible label. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  iconColor?: string;
}

const variantClass: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent active:bg-surface-sunken',
  tonal: 'bg-primary-tint',
  surface: 'bg-surface border-hairline border',
};

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  variant = 'ghost',
  size = 44,
  iconSize = 22,
  iconColor,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const { colors } = useTheme();
  const resolvedColor =
    iconColor ?? (variant === 'tonal' ? colors.primary : colors.inkSecondary);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      scaleTo={0.9}
      className={cn('items-center justify-center rounded-full', variantClass[variant], className)}
      style={[{ width: size, height: size }, style as object]}
      {...rest}
    >
      <Icon size={iconSize} color={resolvedColor} strokeWidth={2} />
    </PressableScale>
  );
}
