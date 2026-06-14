import {
  BarChart3,
  ChevronRight,
  HandCoins,
  LogOut,
  Settings,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Card,
  Logo,
  PressableScale,
  Screen,
  SegmentedControl,
  SwipeTabs,
  Text,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { usePreferences, type ThemeMode } from '@/stores/preferences';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { STAGGER_MS, useTheme } from '@/theme';

interface MenuEntry {
  icon: LucideIcon;
  /** translation keys under `more.*` */
  labelKey: string;
  descKey: string;
  phase: string;
  /** Route when the module is live; absent = coming-soon toast. */
  href?: string;
}

const MENU: MenuEntry[] = [
  {
    icon: Users,
    labelKey: 'more.customers',
    descKey: 'more.customersDesc',
    phase: 'Phase 3',
    href: '/customers',
  },
  {
    icon: Wallet,
    labelKey: 'more.finance',
    descKey: 'more.financeDesc',
    phase: 'Phase 4',
    href: '/finance',
  },
  {
    icon: HandCoins,
    labelKey: 'more.financing',
    descKey: 'more.financingDesc',
    phase: 'Phase 5',
    href: '/financing',
  },
  {
    icon: Truck,
    labelKey: 'more.suppliers',
    descKey: 'more.suppliersDesc',
    phase: 'Phase 6',
    href: '/suppliers',
  },
  {
    icon: Tag,
    labelKey: 'more.promotions',
    descKey: 'more.promotionsDesc',
    phase: 'Phase 6',
    href: '/promotions',
  },
  {
    icon: BarChart3,
    labelKey: 'more.reports',
    descKey: 'more.reportsDesc',
    phase: 'Phase 6',
    href: '/reports',
  },
  {
    icon: Settings,
    labelKey: 'more.settings',
    descKey: 'more.settingsDesc',
    phase: 'Phase 8',
    href: '/settings',
  },
];

const THEME_VALUES: ThemeMode[] = ['system', 'light', 'dark'];

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const store = useStoreProfile((s) => s.store);
  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);

  const themeOptions = THEME_VALUES.map((value) => ({ value, label: t(`more.${value}`) }));
  const roleLabel = t(`roles.${user?.role ?? 'cashier'}`);

  const confirmSignOut = () => {
    Alert.alert(t('more.signOut'), t('more.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SwipeTabs name="more">
      <Screen scroll tabbed>
        <View className="mt-2">
          <Text variant="h1" weight="bold">
            {t('more.title')}
          </Text>
        </View>

        <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5">
          <Card className="flex-row items-center gap-4">
            <Logo size={52} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
            <View className="flex-1">
              <Text variant="title" weight="semibold">
                {store?.name ?? t('home.yourStore')}
              </Text>
              <Text variant="caption" tone="secondary">
                {user?.email}
              </Text>
            </View>
            <View className="rounded-full bg-primary-tint px-3 py-1">
              <Text variant="micro" weight="semibold" tone="accent">
                {roleLabel}
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS).springify().damping(18)}
          className="mt-5 gap-2"
        >
          <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
            {t('more.appearance')}
          </Text>
          <SegmentedControl options={themeOptions} value={themeMode} onChange={setThemeMode} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS * 2)
            .springify()
            .damping(18)}
          className="mt-6 gap-2"
        >
          <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
            {t('more.manage')}
          </Text>
          <Card padded={false} className="overflow-hidden">
            {MENU.map((entry, index) => (
              <PressableScale
                key={entry.labelKey}
                scaleTo={0.99}
                onPress={() => {
                  if (entry.href) router.push(entry.href as Parameters<typeof router.push>[0]);
                  else
                    toast.info(
                      t('more.comingSoon', { feature: t(entry.labelKey) }),
                      t('more.comingSoonBody', { phase: entry.phase }),
                    );
                }}
                accessibilityRole="button"
                className={
                  index < MENU.length - 1
                    ? 'flex-row items-center gap-3 border-b border-hairline px-4 py-3.5'
                    : 'flex-row items-center gap-3 px-4 py-3.5'
                }
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface">
                  <entry.icon size={18} color={colors.inkSecondary} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text variant="body" weight="medium">
                    {t(entry.labelKey)}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {t(entry.descKey)}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
              </PressableScale>
            ))}
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS * 3)
            .springify()
            .damping(18)}
          className="mt-6"
        >
          <PressableScale
            onPress={() => router.push('/(storefront)/(tabs)')}
            accessibilityRole="button"
            className="flex-row items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3.5 dark:bg-surface-elevated"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-tint">
              <ShoppingBag size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text variant="body" weight="medium">
                {t('more.previewStorefront')}
              </Text>
              <Text variant="caption" tone="tertiary">
                {t('more.previewStorefrontDesc')}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
          </PressableScale>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(STAGGER_MS * 4)
            .springify()
            .damping(18)}
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
    </SwipeTabs>
  );
}
