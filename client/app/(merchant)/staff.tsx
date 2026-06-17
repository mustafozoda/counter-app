import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  History,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  IconButton,
  Screen,
  SwipeableRow,
  Text,
} from '@/components/ui';
import { withPermission } from '@/components/require-permission';
import { useAuthStore } from '@/stores/auth';
import { useStaffStore } from '@/stores/staff';
import { toast } from '@/stores/toast';
import type { StaffMember, StaffRole } from '@/types/models';

const ROLE_TONE: Record<StaffRole, 'accent' | 'info' | 'neutral'> = {
  owner: 'accent',
  manager: 'info',
  cashier: 'neutral',
};

export default withPermission(StaffScreen, 'manage_staff');

function StaffScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const members = useStaffStore((s) => s.members);
  const refresh = useStaffStore((s) => s.refresh);
  const deleteStaff = useStaffStore((s) => s.deleteStaff);
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  // Pull a fresh list whenever the screen opens (reflects edits made elsewhere).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSelf = (m: StaffMember) => m.userId != null && m.userId === currentUserId;

  const openForm = (id?: string) =>
    router.push(
      (id ? { pathname: '/staff-form', params: { id } } : '/staff-form') as Parameters<
        typeof router.push
      >[0],
    );

  const openDetail = (id: string) =>
    router.push({ pathname: '/staff-detail', params: { id } } as unknown as Parameters<
      typeof router.push
    >[0]);

  const openAccess = (id: string) =>
    router.push({ pathname: '/staff-access', params: { id } } as unknown as Parameters<
      typeof router.push
    >[0]);

  const confirmRemove = (member: StaffMember) =>
    Alert.alert(t('staff.removeMember'), t('staff.removeBody', { name: member.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('actions.remove'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const error = await deleteStaff(member.id);
            if (error) toast.error(error);
          })();
        },
      },
    ]);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-1 flex-row items-center gap-3">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
          <Text variant="h1" weight="bold" numberOfLines={1} className="flex-1">
            {t('staff.title')}
          </Text>
        </View>
        <View className="flex-row items-center">
          <IconButton
            icon={BarChart3}
            accessibilityLabel={t('insights.performanceTitle')}
            onPress={() => router.push('/staff-performance' as Parameters<typeof router.push>[0])}
          />
          <IconButton
            icon={History}
            accessibilityLabel={t('insights.activityTitle')}
            onPress={() => router.push('/staff-activity' as Parameters<typeof router.push>[0])}
          />
          <IconButton
            icon={UserPlus}
            variant="tonal"
            accessibilityLabel={t('staff.addStaff')}
            onPress={() => openForm()}
          />
        </View>
      </View>

      {members.length === 0 ? (
        <View className="flex-1 justify-center pb-16">
          <EmptyState
            icon={ShieldCheck}
            title={t('staff.buildTeam')}
            message={t('staff.buildMsg')}
            actionLabel={t('staff.addAMember')}
            onAction={() => openForm()}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-2.5 px-5 pb-16 pt-3"
          showsVerticalScrollIndicator={false}
        >
          {members.map((member, index) => (
            <Animated.View
              key={member.id}
              entering={FadeInDown.delay(Math.min(index, 8) * 35)
                .springify()
                .damping(18)}
            >
              <SwipeableRow
                actions={[
                  {
                    icon: SlidersHorizontal,
                    label: t('staff.accessTitle'),
                    tone: 'accent' as const,
                    onPress: () => openAccess(member.id),
                  },
                  ...(isSelf(member)
                    ? []
                    : [
                        {
                          icon: Trash2,
                          label: t('actions.remove'),
                          tone: 'negative' as const,
                          onPress: () => confirmRemove(member),
                        },
                      ]),
                ]}
              >
                <Card
                  padded={false}
                  className="flex-row items-center gap-3 px-4 py-3.5"
                  onPress={() => openDetail(member.id)}
                >
                  {member.avatarUrl ? (
                    <Image
                      source={{ uri: member.avatarUrl }}
                      style={{ width: 44, height: 44, borderRadius: 22 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Avatar name={member.name} size={44} />
                  )}
                  <View className="flex-1">
                    <Text variant="body" weight="semibold" numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text variant="caption" tone="tertiary" numberOfLines={1}>
                      {member.title || member.email || t('staff.noEmail')}
                    </Text>
                  </View>
                  {!member.active ? (
                    <Badge label={t('staff.suspended')} tone="neutral" />
                  ) : (
                    <Badge label={t(`roles.${member.role}`)} tone={ROLE_TONE[member.role]} />
                  )}
                </Card>
              </SwipeableRow>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
