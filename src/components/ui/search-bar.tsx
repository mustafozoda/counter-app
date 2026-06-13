import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { textStyle, useTheme } from '@/theme';

export interface SearchBarProps extends Omit<TextInputProps, 'style'> {
  value: string;
  onChangeText: (text: string) => void;
  className?: string;
}

/** Rounded search field with built-in clear action. */
export function SearchBar({ value, onChangeText, placeholder, className, ...rest }: SearchBarProps) {
  const { colors } = useTheme();

  return (
    <View
      className={cn(
        'h-12 flex-row items-center gap-2 rounded-full bg-surface-sunken px-4 dark:bg-surface-elevated',
        className,
      )}
    >
      <Search size={18} color={colors.inkTertiary} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search'}
        placeholderTextColor={colors.inkTertiary}
        className="flex-1 text-ink"
        style={textStyle('body')}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
        {...rest}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="h-5 w-5 items-center justify-center rounded-full bg-ink-tertiary/30"
        >
          <X size={12} color={colors.surface} strokeWidth={3} />
        </Pressable>
      ) : null}
    </View>
  );
}
