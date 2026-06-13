import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Check, Search } from 'lucide-react-native';
import { forwardRef, useMemo, useState } from 'react';
import { View } from 'react-native';

import { PressableScale, Sheet, Text, type SheetRef } from '@/components/ui';
import { CURRENCIES, type CurrencyOption } from '@/constants/currencies';
import { textStyle, useTheme } from '@/theme';

export interface CurrencySheetProps {
  selected: string;
  onSelect: (code: string) => void;
}

/** Searchable currency picker used by store setup (and Settings later). */
export const CurrencySheet = forwardRef<SheetRef, CurrencySheetProps>(function CurrencySheet(
  { selected, onSelect },
  ref,
) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  const renderItem = ({ item }: { item: CurrencyOption }) => {
    const isSelected = item.code === selected;
    return (
      <PressableScale
        scaleTo={0.98}
        haptic="selection"
        onPress={() => {
          onSelect(item.code);
          (ref as React.RefObject<SheetRef | null>)?.current?.dismiss();
        }}
        className="mx-5 mb-1 flex-row items-center gap-3 rounded-md px-3 py-3"
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
          <Text variant="caption" weight="semibold" tone="secondary">
            {item.symbol}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body" weight="medium">
            {item.name}
          </Text>
          <Text variant="caption" tone="tertiary" mono>
            {item.code}
          </Text>
        </View>
        {isSelected ? <Check size={20} color={colors.primary} strokeWidth={2.5} /> : null}
      </PressableScale>
    );
  };

  return (
    <Sheet ref={ref} title="Currency" snapPoints={['75%']} raw onDismiss={() => setQuery('')}>
      <View className="mx-5 my-3 flex-row items-center gap-2 rounded-full bg-surface-sunken px-4 dark:bg-surface">
        <Search size={18} color={colors.inkTertiary} strokeWidth={2} />
        <BottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search currencies"
          placeholderTextColor={colors.inkTertiary}
          style={[textStyle('body'), { flex: 1, height: 44, color: colors.ink }]}
          autoCapitalize="none"
          accessibilityLabel="Search currencies"
        />
      </View>
      <BottomSheetFlatList
        data={filtered}
        keyExtractor={(item: CurrencyOption) => item.code}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </Sheet>
  );
});
