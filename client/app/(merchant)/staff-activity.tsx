import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  History,
  PackagePlus,
  RotateCcw,
  ShoppingBag,
  SlidersHorizontal,
  Undo2,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CurrencyText, EmptyState, IconButton, Screen, Text } from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { MONEY_KINDS, useActivity } from '@/features/staff/insights';
import { formatDayLabel, formatTime } from '@/lib/format';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

const KIND_ICON: Record<string, LucideIcon> = {
  sale: ShoppingBag,
  refund: RotateCcw,
  restock: PackagePlus,
  adjustment: SlidersHorizontal,
  return: Undo2,
};

export default withPermission(StaffActivityScreen, 'manage_staff');

function StaffActivityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const currency = useStoreProfile((s) => s.store?.currencyCode ?? 'USD');
  const activityQuery = useActivity();
  const entries = activityQuery.data ?? [];

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-1 px-5 pt-1">
        <IconButton
          icon={ArrowLeft}
          accessibilityLabel={t('actions.back')}
          onPress={() => router.back()}
        />
        <Text variant="title" weight="semibold">
          {t('insights.activityTitle')}
        </Text>
      </View>

      {entries.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={History}
            title={t('insights.emptyActivity')}
            message={t('insights.emptyActivityMsg')}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2 px-5 pb-16 pt-3"
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry, index) => {
            const prev = entries[index - 1];
            const showDay =
              !prev ||
              new Date(prev.createdAt).toDateString() !== new Date(entry.createdAt).toDateString();
            const Icon = KIND_ICON[entry.kind] ?? History;
            const isMoney = MONEY_KINDS.includes(entry.kind);
            const positive = entry.amount > 0;
            return (
              <View key={entry.id} className="gap-2">
                {showDay ? (
                  <Text variant="micro" weight="medium" tone="tertiary" className="mt-2 px-1">
                    {formatDayLabel(new Date(entry.createdAt))}
                  </Text>
                ) : null}
                <Animated.View
                  entering={FadeInDown.delay(Math.min(index, 10) * 20)
                    .springify()
                    .damping(18)}
                >
                  <View className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 dark:bg-surface-elevated">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                      <Icon size={16} color={colors.inkSecondary} strokeWidth={2} />
                    </View>
                    <View className="flex-1">
                      <Text variant="body" weight="medium" numberOfLines={1}>
                        {t(`insights.kind_${entry.kind}`, { defaultValue: entry.kind })} ·{' '}
                        {entry.summary}
                      </Text>
                      <Text variant="caption" tone="tertiary" numberOfLines={1}>
                        {entry.actorName || t('insights.unattributed')} ·{' '}
                        {formatTime(new Date(entry.createdAt))}
                      </Text>
                    </View>
                    {isMoney ? (
                      <CurrencyText
                        amount={entry.amount}
                        currency={currency}
                        variant="body"
                        weight="semibold"
                        tone={positive ? 'positive' : 'negative'}
                      />
                    ) : (
                      <Text
                        variant="body"
                        weight="semibold"
                        tone={positive ? 'positive' : 'negative'}
                      >
                        {positive ? '+' : ''}
                        {entry.amount} {t('insights.unitsShort')}
                      </Text>
                    )}
                  </View>
                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
