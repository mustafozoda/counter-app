import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, UserRoundPlus, UsersRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  IconButton,
  SearchBar,
  Skeleton,
  Text,
  useSheetRef,
} from '@/components/ui';
import { CustomerFormSheet } from '@/features/customers/components/customer-form-sheet';
import { useCustomers } from '@/features/customers/hooks';
import { searchCustomers } from '@/features/customers/search';
import { useTheme } from '@/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomersScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const customersQuery = useCustomers();
  const [query, setQuery] = useState('');
  const formSheet = useSheetRef();

  const customers = useMemo(
    () => searchCustomers(customersQuery.data ?? [], query),
    [customersQuery.data, query],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-1 flex-row items-center gap-3">
          <IconButton icon={ArrowLeft} accessibilityLabel={t('actions.back')} onPress={() => router.back()} />
          <View className="flex-1">
            <Text variant="h1" weight="bold" numberOfLines={1}>
              {t('customers.title')}
            </Text>
            {customersQuery.data && customersQuery.data.length > 0 ? (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {t('customers.total', { count: customersQuery.data.length })}
              </Text>
            ) : null}
          </View>
        </View>
        <IconButton
          icon={UserRoundPlus}
          variant="tonal"
          accessibilityLabel={t('customers.addCustomer')}
          onPress={() => formSheet.current?.present()}
        />
      </View>

      <View className="px-5 py-3">
        <SearchBar value={query} onChangeText={setQuery} placeholder={t('customers.searchPlaceholder')} />
      </View>

      {customersQuery.isLoading ? (
        <View className="gap-3 px-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={20} />
          ))}
        </View>
      ) : customers.length === 0 ? (
        <View className="flex-1 justify-center pb-20">
          <EmptyState
            icon={UsersRound}
            title={query ? t('customers.noMatches') : t('customers.emptyTitle')}
            message={query ? t('customers.tryDifferent') : t('customers.emptyMsg')}
            actionLabel={query ? t('customers.clearSearch') : t('customers.addACustomer')}
            onAction={() => (query ? setQuery('') : formSheet.current?.present())}
          />
        </View>
      ) : (
        <FlashList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 10) * 35).springify().damping(18)}
              className="pb-2.5"
            >
              <Card
                padded={false}
                className="flex-row items-center gap-3 px-4 py-3"
                onPress={() => router.push({ pathname: '/customer/[id]', params: { id: item.id } })}
              >
                <Avatar name={item.name} size={44} />
                <View className="flex-1">
                  <Text variant="body" weight="semibold">
                    {item.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {[item.phone, item.email].filter(Boolean).join(' · ') || t('common.noContact')}
                  </Text>
                </View>
                {item.tags[0] ? <Badge label={item.tags[0]} tone="accent" /> : null}
                <ChevronRight size={16} color={colors.inkTertiary} strokeWidth={2} />
              </Card>
            </Animated.View>
          )}
        />
      )}

      <CustomerFormSheet ref={formSheet} customer={null} dismiss={() => formSheet.current?.dismiss()} />
    </SafeAreaView>
  );
}
