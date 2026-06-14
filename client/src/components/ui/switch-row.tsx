import { Switch, View } from 'react-native';

import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

import { Text } from './text';

export interface SwitchRowProps {
  label: string;
  caption?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

/** Labeled toggle with DS colors and a medium haptic (§5.7). */
export function SwitchRow({ label, caption, value, onChange, className }: SwitchRowProps) {
  const { colors } = useTheme();
  return (
    <View className={cn('flex-row items-center justify-between gap-4', className)}>
      <View className="flex-1">
        <Text variant="body" weight="medium">
          {label}
        </Text>
        {caption ? (
          <Text variant="caption" tone="tertiary">
            {caption}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.press();
          onChange(next);
        }}
        trackColor={{ false: colors.surfaceSunken, true: colors.primary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.surfaceSunken}
        accessibilityLabel={label}
      />
    </View>
  );
}
