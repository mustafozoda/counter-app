import { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Search, UserRoundPlus, UserRoundX } from 'lucide-react-native';
import { forwardRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Button, PressableScale, Sheet, Text, type SheetRef } from '@/components/ui';
import { useCustomers, useSaveCustomer } from '@/features/customers/hooks';
import { searchCustomers } from '@/features/customers/search';
import { textStyle, useTheme } from '@/theme';
import { toast } from '@/stores/toast';
import type { Customer } from '@/types/models';

export interface CustomerAttachSheetProps {
  attachedId: string | null;
  onAttach: (customer: { id: string; name: string } | null) => void;
  dismiss: () => void;
}

/** Attach a customer to the sale: search, pick, quick-add, or detach. */
export const CustomerAttachSheet = forwardRef<SheetRef, CustomerAttachSheetProps>(
  function CustomerAttachSheet({ attachedId, onAttach, dismiss }, ref) {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const customersQuery = useCustomers();
    const saveCustomer = useSaveCustomer();
    const [query, setQuery] = useState('');

    const customers = useMemo(
      () => searchCustomers(customersQuery.data ?? [], query),
      [customersQuery.data, query],
    );

    const quickAdd = () => {
      const name = query.trim();
      if (name.length < 2) return;
      saveCustomer.mutate(
        { name, phone: null, email: null, notes: '', tags: [] },
        {
          onSuccess: (customer) => {
            toast.success(t('pos.customerAdded'), customer.name);
            onAttach({ id: customer.id, name: customer.name });
            setQuery('');
            dismiss();
          },
        },
      );
    };

    const renderItem = ({ item }: { item: Customer }) => (
      <PressableScale
        scaleTo={0.98}
        haptic="selection"
        onPress={() => {
          onAttach({ id: item.id, name: item.name });
          dismiss();
        }}
        accessibilityRole="button"
        className={`mx-5 mb-1 flex-row items-center gap-3 rounded-md px-3 py-3 ${
          item.id === attachedId ? 'bg-primary-tint' : ''
        }`}
      >
        <Avatar name={item.name} size={38} />
        <View className="flex-1">
          <Text variant="body" weight="medium">
            {item.name}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {[item.phone, item.email].filter(Boolean).join(' · ') || t('common.noContact')}
          </Text>
        </View>
      </PressableScale>
    );

    return (
      <Sheet ref={ref} title={t('pos.attachCustomer')} snapPoints={['70%']} raw onDismiss={() => setQuery('')}>
        <View className="mx-5 my-3 flex-row items-center gap-2 rounded-full bg-surface-sunken px-4 dark:bg-surface">
          <Search size={18} color={colors.inkTertiary} strokeWidth={2} />
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('pos.searchOrAdd')}
            placeholderTextColor={colors.inkTertiary}
            style={[textStyle('body'), { flex: 1, height: 44, color: colors.ink }]}
            accessibilityLabel={t('pos.searchOrAdd')}
          />
        </View>

        {attachedId ? (
          <View className="mx-5 mb-2">
            <Button
              label={t('pos.detachCustomer')}
              variant="ghost"
              icon={UserRoundX}
              onPress={() => {
                onAttach(null);
                dismiss();
              }}
            />
          </View>
        ) : null}

        <BottomSheetFlatList
          data={customers}
          keyExtractor={(item: Customer) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View className="items-center gap-3 px-5 py-8">
              <Text variant="body" tone="tertiary" className="text-center">
                {query.trim().length >= 2
                  ? t('pos.noOneNamed', { name: query.trim() })
                  : t('pos.noCustomersYet')}
              </Text>
              {query.trim().length >= 2 ? (
                <Button
                  label={t('pos.addNamed', { name: query.trim() })}
                  icon={UserRoundPlus}
                  variant="secondary"
                  loading={saveCustomer.isPending}
                  onPress={quickAdd}
                />
              ) : null}
            </View>
          }
        />
      </Sheet>
    );
  },
);
