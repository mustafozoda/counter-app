import { Minus, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib/cn';
import { useTheme, textStyle } from '@/theme';

import { AnimatedNumber } from './animated-number';
import { PressableScale } from './pressable-scale';

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

/** Tactile − / + stepper with an animated count. */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  className,
}: QuantityStepperProps) {
  const { colors } = useTheme();
  const canDecrement = value > min;
  const canIncrement = value < max;

  const StepButton = ({
    icon: Icon,
    enabled,
    onPress,
    label,
  }: {
    icon: typeof Plus;
    enabled: boolean;
    onPress: () => void;
    label: string;
  }) => (
    <PressableScale
      onPress={onPress}
      disabled={!enabled}
      scaleTo={0.85}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-full',
        enabled ? 'bg-primary-tint' : 'bg-surface-sunken dark:bg-surface',
      )}
    >
      <Icon size={16} color={enabled ? colors.primary : colors.inkTertiary} strokeWidth={2.5} />
    </PressableScale>
  );

  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-1 rounded-full border border-hairline bg-surface p-1.5 dark:bg-surface-elevated',
        className,
      )}
      accessibilityRole="adjustable"
      accessibilityValue={{ now: value }}
    >
      <StepButton icon={Minus} enabled={canDecrement} onPress={() => onChange(value - 1)} label="Decrease" />
      <View className="min-w-12 items-center">
        <AnimatedNumber
          value={value}
          className="text-ink"
          style={textStyle('title', 'semibold', { tabular: true })}
        />
      </View>
      <StepButton icon={Plus} enabled={canIncrement} onPress={() => onChange(value + 1)} label="Increase" />
    </View>
  );
}
