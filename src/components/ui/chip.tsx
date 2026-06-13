import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

import { PressableScale, type PressableScaleProps } from './pressable-scale';
import { Text } from './text';

export interface ChipProps extends Omit<PressableScaleProps, 'children'> {
  label: string;
  icon?: LucideIcon;
  selected?: boolean;
}

/** Selectable pill — filters, attribute pickers, onboarding choices. */
export function Chip({ label, icon: Icon, selected = false, className, ...rest }: ChipProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      haptic="selection"
      scaleTo={0.95}
      className={cn(
        'h-11 flex-row items-center gap-2 rounded-full border px-4',
        selected ? 'border-primary bg-primary-tint' : 'border-hairline bg-surface dark:bg-surface-elevated',
        className,
      )}
      {...rest}
    >
      {Icon ? (
        <Icon size={16} color={selected ? colors.primary : colors.inkSecondary} strokeWidth={2} />
      ) : null}
      <Text
        variant="caption"
        weight={selected ? 'semibold' : 'medium'}
        tone={selected ? 'accent' : 'secondary'}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
