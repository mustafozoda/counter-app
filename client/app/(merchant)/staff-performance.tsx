import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, Trophy } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Card,
  CurrencyText,
  EmptyState,
  IconButton,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { useStaffSales, type StatRange } from '@/features/staff/insights';
import { useStaffStore } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { STAGGER_MS, useTheme } from '@/theme';

export default withPermission(StaffPerformanceScreen, 'manage_staff');

function StaffPerformanceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [range, setRange] = useState<StatRange>('7d');
  const members = useStaffStore((s) => s.members);
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const salesQuery = useStaffSales(range);

  const rangeOptions: { value: StatRange; label: string }[] = [
    { value: 'today', label: t('insights.today') },
    { value: '7d', label: t('insights.d7') },
    { value: '30d', label: t('insights.d30') },
    { value: 'all', label: t('insights.all') },
  ];

  const board = useMemo(() => {
    const byUser = new Map((salesQuery.data ?? []).map((s) => [s.userId, s]));
    return members
      .map((m) => {
        const stat = m.userId ? byUser.get(m.userId) : undefined;
        return { member: m, salesCount: stat?.salesCount ?? 0, revenue: stat?.revenue ?? 0 };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [members, salesQuery.data]);

  const totalSales = board.reduce((sum, r) => sum + r.salesCount, 0);
  const totalRevenue = board.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <Screen scroll>
      <View className="flex-row items-center gap-1 pt-1">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('actions.back')}
          onPress={() => router.back()}
        />
        <Text variant="title" weight="semibold">
          {t('insights.performanceTitle')}
        </Text>
      </View>

      <View className="mt-5">
        <SegmentedControl options={rangeOptions} value={range} onChange={setRange} />
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5">
        <Card className="flex-row items-end justify-between">
          <View>
            <Text variant="caption" tone="tertiary">
              {t('insights.totalSales')}
            </Text>
            <Text variant="h1" weight="bold">
              {totalSales}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="caption" tone="tertiary">
              {t('insights.totalRevenue')}
            </Text>
            <CurrencyText amount={totalRevenue} currency={currency} variant="h2" weight="bold" />
          </View>
        </Card>
      </Animated.View>

      <Text variant="caption" weight="medium" tone="tertiary" className="mt-6 px-1">
        {t('insights.leaderboard')}
      </Text>

      {board.length === 0 ? (
        <View className="mt-10">
          <EmptyState icon={Trophy} title={t('insights.noData')} message={t('insights.noDataMsg')} />
        </View>
      ) : (
        <View className="mt-2 gap-2">
          {board.map((row, index) => (
            <Animated.View
              key={row.member.id}
              entering={FadeInDown.delay(Math.min(index, 8) * STAGGER_MS)
                .springify()
                .damping(18)}
            >
              <Card className="flex-row items-center gap-3">
                <View className="w-6 items-center">
                  {index === 0 && row.revenue > 0 ? (
                    <Crown size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <Text variant="body" weight="bold" tone="tertiary">
                      {index + 1}
                    </Text>
                  )}
                </View>
                {row.member.avatarUrl ? (
                  <Image
                    source={{ uri: row.member.avatarUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    contentFit="cover"
                  />
                ) : (
                  <Avatar name={row.member.name} size={40} />
                )}
                <View className="flex-1">
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {row.member.name}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {t('insights.salesCount', { count: row.salesCount })}
                  </Text>
                </View>
                <CurrencyText amount={row.revenue} currency={currency} variant="body" weight="bold" />
              </Card>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}
