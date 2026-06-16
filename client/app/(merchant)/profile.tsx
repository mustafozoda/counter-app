import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Pencil,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar, Card, IconButton, PressableScale, Screen, Text } from '@/components/ui';
import { formatDayLabel } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { roleHasPermission, type Permission } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { STAGGER_MS, useTheme } from '@/theme';

interface ShortcutEntry {
  icon: LucideIcon;
  label: string;
  href: string;
  permission: Permission;
}

const SHORTCUTS: ShortcutEntry[] = [
  { icon: Settings, label: 'more.settings', href: '/settings', permission: 'manage_settings' },
  { icon: ShieldCheck, label: 'staff.title', href: '/staff', permission: 'manage_staff' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const store = useStoreProfile((s) => s.store);

  const role = user?.role ?? 'cashier';
  const shortcuts = SHORTCUTS.filter((s) => roleHasPermission(role, s.permission));

  const rows: { label: string; value: string }[] = [
    { label: t('profile.email'), value: user?.email ?? '—' },
    { label: t('profile.role'), value: t(`roles.${role}`) },
    { label: t('profile.store'), value: store?.name ?? '—' },
    {
      label: t('profile.memberSince'),
      value: store ? formatDayLabel(new Date(store.createdAt)) : '—',
    },
  ];

  const confirmSignOut = () =>
    Alert.alert(t('more.signOut'), t('more.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.signOut'), style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between pt-1">
        <View className="flex-row items-center gap-1">
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel={t('actions.back')}
            onPress={() => router.back()}
          />
          <Text variant="title" weight="semibold">
            {t('profile.title')}
          </Text>
        </View>
        <IconButton
          icon={Pencil}
          accessibilityLabel={t('profile.edit')}
          onPress={() => router.push('/profile-edit' as Parameters<typeof router.push>[0])}
        />
      </View>

      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        className="mt-6 items-center"
      >
        <Avatar name={user?.name ?? 'C'} size={88} />
        <Text variant="h1" weight="bold" className="mt-4 text-center">
          {user?.name}
        </Text>
        <Text variant="body" tone="secondary" className="mt-1">
          {user?.email}
        </Text>
        <View className="mt-3 rounded-full bg-primary-tint px-3.5 py-1">
          <Text variant="caption" weight="semibold" tone="accent">
            {t(`roles.${role}`)}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS).springify().damping(18)}
        className="mt-7 gap-2"
      >
        <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
          {t('profile.details')}
        </Text>
        <Card padded={false} className="overflow-hidden">
          {rows.map((row, index) => (
            <View
              key={row.label}
              className={
                index < rows.length - 1
                  ? 'flex-row items-center justify-between gap-4 border-b border-hairline px-4 py-3.5'
                  : 'flex-row items-center justify-between gap-4 px-4 py-3.5'
              }
            >
              <Text variant="body" tone="secondary">
                {row.label}
              </Text>
              <Text variant="body" weight="medium" numberOfLines={1} className="flex-1 text-right">
                {row.value}
              </Text>
            </View>
          ))}
        </Card>
      </Animated.View>

      {shortcuts.length > 0 ? (
        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)}
          className="mt-6"
        >
          <Card padded={false} className="overflow-hidden">
            {shortcuts.map((entry, index) => (
              <PressableScale
                key={entry.href}
                scaleTo={0.99}
                onPress={() => router.push(entry.href as Parameters<typeof router.push>[0])}
                accessibilityRole="button"
                className={
                  index < shortcuts.length - 1
                    ? 'flex-row items-center gap-3 border-b border-hairline px-4 py-3.5'
                    : 'flex-row items-center gap-3 px-4 py-3.5'
                }
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                  <entry.icon size={18} color={colors.inkSecondary} strokeWidth={2} />
                </View>
                <Text variant="body" weight="medium" className="flex-1">
                  {t(entry.label)}
                </Text>
                <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
              </PressableScale>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View
        entering={FadeInDown.delay(STAGGER_MS * 3).springify().damping(18)}
        className="mt-6"
      >
        <PressableScale
          onPress={confirmSignOut}
          accessibilityRole="button"
          className="h-12 flex-row items-center justify-center gap-2 rounded-md bg-negative-tint"
        >
          <LogOut size={18} color={colors.negative} strokeWidth={2} />
          <Text variant="body" weight="semibold" tone="negative">
            {t('more.signOut')}
          </Text>
        </PressableScale>
        <Text variant="micro" tone="tertiary" className="mt-4 text-center">
          Counter v0.1.0
        </Text>
      </Animated.View>
    </Screen>
  );
}
