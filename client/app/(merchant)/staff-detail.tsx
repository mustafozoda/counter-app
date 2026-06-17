import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, Clock, Pencil, ShoppingBag, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  Avatar,
  Card,
  CurrencyText,
  IconButton,
  PressableScale,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import {
  useStaffHours,
  useStaffOrders,
  useStaffSales,
  useStaffSessions,
  type StatRange,
} from '@/features/staff/insights';
import { formatDayLabel, formatTime } from '@/lib/format';
import { useStaffStore } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

export default withPermission(StaffDetailScreen, 'manage_staff');

function StaffDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const member = useStaffStore((s) => s.members.find((m) => m.id === params.id) ?? null);
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const [range, setRange] = useState<StatRange>('7d');

  const userId = member?.userId ?? null;
  const sales = useStaffSales(range).data?.find((s) => s.userId === userId);
  const hours = useStaffHours(range).data?.find((h) => h.userId === userId);
  const ordersQuery = useStaffOrders(userId);
  const sessionsQuery = useStaffSessions(userId);

  const rangeOptions: { value: StatRange; label: string }[] = [
    { value: 'today', label: t('insights.today') },
    { value: '7d', label: t('insights.d7') },
    { value: '30d', label: t('insights.d30') },
    { value: 'all', label: t('insights.all') },
  ];

  const formatDuration = (startedAt: string, lastSeenAt: string) => {
    const mins = (new Date(lastSeenAt).getTime() - new Date(startedAt).getTime()) / 60000;
    return mins < 60
      ? t('insights.minutes', { m: Math.max(1, Math.round(mins)) })
      : t('insights.hours', { h: (mins / 60).toFixed(1) });
  };

  if (!member) {
    return (
      <Screen>
        <View className="flex-row items-center gap-1 pt-1">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  const orders = ordersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between pt-1">
        <View className="flex-1 flex-row items-center gap-1">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
          <Text variant="title" weight="semibold" numberOfLines={1} className="flex-1">
            {member.name}
          </Text>
        </View>
        <IconButton
          icon={Pencil}
          accessibilityLabel={t('staff.editStaff')}
          onPress={() =>
            router.push({ pathname: '/staff-form', params: { id: member.id } } as Parameters<
              typeof router.push
            >[0])
          }
        />
      </View>

      {/* Identity */}
      <View className="mt-4 flex-row items-center gap-3">
        {member.avatarUrl ? (
          <Image
            source={{ uri: member.avatarUrl }}
            style={{ width: 56, height: 56, borderRadius: 28 }}
            contentFit="cover"
          />
        ) : (
          <Avatar name={member.name} size={56} />
        )}
        <View className="flex-1">
          <Text variant="body" weight="semibold">
            {member.title || t(`roles.${member.role}`)}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {member.email}
          </Text>
        </View>
        <View className="rounded-full bg-primary-tint px-3 py-1">
          <Text variant="micro" weight="semibold" tone="accent">
            {t(`roles.${member.role}`)}
          </Text>
        </View>
      </View>

      <PressableScale
        scaleTo={0.99}
        onPress={() =>
          router.push({ pathname: '/staff-access', params: { id: member.id } } as unknown as Parameters<
            typeof router.push
          >[0])
        }
        accessibilityRole="button"
        className="mt-4"
      >
        <Card className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
            <SlidersHorizontal size={16} color={colors.inkSecondary} strokeWidth={2} />
          </View>
          <Text variant="body" weight="medium" className="flex-1">
            {t('staff.manageAccess')}
          </Text>
          <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
        </Card>
      </PressableScale>

      <View className="mt-5">
        <SegmentedControl options={rangeOptions} value={range} onChange={setRange} />
      </View>

      {/* Stats */}
      <Card className="mt-4 flex-row justify-between">
        <View>
          <Text variant="caption" tone="tertiary">
            {t('insights.totalSales')}
          </Text>
          <Text variant="title" weight="bold">
            {sales?.salesCount ?? 0}
          </Text>
        </View>
        <View className="items-center">
          <Text variant="caption" tone="tertiary">
            {t('insights.totalRevenue')}
          </Text>
          <CurrencyText
            amount={sales?.revenue ?? 0}
            currency={currency}
            variant="title"
            weight="bold"
          />
        </View>
        <View className="items-end">
          <Text variant="caption" tone="tertiary">
            {t('insights.hoursLabel')}
          </Text>
          <Text variant="title" weight="bold">
            {t('insights.hours', { h: ((hours?.minutes ?? 0) / 60).toFixed(1) })}
          </Text>
        </View>
      </Card>

      {/* Recent sales */}
      <Text variant="caption" weight="medium" tone="tertiary" className="mt-6 px-1">
        {t('insights.recentSales')}
      </Text>
      {orders.length === 0 ? (
        <Text variant="caption" tone="tertiary" className="mt-2 px-1">
          {t('insights.noData')}
        </Text>
      ) : (
        <View className="mt-2 gap-2">
          {orders.map((order) => (
            <View
              key={order.id}
              className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 dark:bg-surface-elevated"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                <ShoppingBag size={16} color={colors.inkSecondary} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text variant="body" weight="medium">
                  {order.number}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {formatDayLabel(new Date(order.createdAt))} · {formatTime(new Date(order.createdAt))}
                </Text>
              </View>
              <CurrencyText amount={order.total} currency={currency} variant="body" weight="semibold" />
            </View>
          ))}
        </View>
      )}

      {/* Session log */}
      <Text variant="caption" weight="medium" tone="tertiary" className="mt-6 px-1">
        {t('insights.sessions')}
      </Text>
      {sessions.length === 0 ? (
        <Text variant="caption" tone="tertiary" className="mb-4 mt-2 px-1">
          {t('insights.noSessions')}
        </Text>
      ) : (
        <View className="mb-4 mt-2 gap-2">
          {sessions.map((session) => (
            <View
              key={session.id}
              className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 dark:bg-surface-elevated"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                <Clock size={16} color={colors.inkSecondary} strokeWidth={2} />
              </View>
              <View className="flex-1">
                <Text variant="body" weight="medium">
                  {formatDayLabel(new Date(session.startedAt))}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {formatTime(new Date(session.startedAt))} – {formatTime(new Date(session.lastSeenAt))}
                </Text>
              </View>
              <Text variant="body" weight="semibold" tone="secondary">
                {formatDuration(session.startedAt, session.lastSeenAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
