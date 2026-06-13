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
import { Alert, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card, Logo, PressableScale, Screen, SegmentedControl, Text } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';
import { usePreferences, type ThemeMode } from '@/stores/preferences';
import { useStoreProfile } from '@/stores/store-profile';
import { toast } from '@/stores/toast';
import { STAGGER_MS, useTheme } from '@/theme';

interface MenuEntry {
  icon: LucideIcon;
  label: string;
  description: string;
  phase: string;
  /** Route when the module is live; absent = coming-soon toast. */
  href?: string;
}

const MENU: MenuEntry[] = [
  { icon: Users, label: 'Customers', description: 'Profiles, history, loyalty', phase: 'Phase 3', href: '/customers' },
  { icon: Wallet, label: 'Finance', description: 'Revenue, expenses, profit', phase: 'Phase 4', href: '/finance' },
  { icon: HandCoins, label: 'Financing', description: 'Installments & layaway', phase: 'Phase 5', href: '/financing' },
  { icon: Truck, label: 'Suppliers', description: 'Purchase orders & restocks', phase: 'Phase 6', href: '/suppliers' },
  { icon: Tag, label: 'Promotions', description: 'Coupons & discounts', phase: 'Phase 6', href: '/promotions' },
  { icon: BarChart3, label: 'Reports', description: 'Best sellers, trends, exports', phase: 'Phase 6', href: '/reports' },
  { icon: Settings, label: 'Settings', description: 'Store, staff, receipts', phase: 'Phase 8' },
];

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const store = useStoreProfile((s) => s.store);
  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen scroll tabbed>
      <View className="mt-2">
        <Text variant="h1" weight="bold">
          More
        </Text>
      </View>

      <Animated.View entering={FadeInDown.springify().damping(18)} className="mt-5">
        <Card className="flex-row items-center gap-4">
          <Logo size={52} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
          <View className="flex-1">
            <Text variant="title" weight="semibold">
              {store?.name ?? 'Your store'}
            </Text>
            <Text variant="caption" tone="secondary">
              {user?.email}
            </Text>
          </View>
          <View className="rounded-full bg-primary-tint px-3 py-1">
            <Text variant="micro" weight="semibold" tone="accent">
              {user?.role === 'owner' ? 'Owner' : user?.role === 'manager' ? 'Manager' : 'Cashier'}
            </Text>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS).springify().damping(18)} className="mt-5 gap-2">
        <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
          APPEARANCE
        </Text>
        <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 2).springify().damping(18)} className="mt-6 gap-2">
        <Text variant="caption" weight="medium" tone="tertiary" className="px-1">
          MANAGE
        </Text>
        <Card padded={false} className="overflow-hidden">
          {MENU.map((entry, index) => (
            <PressableScale
              key={entry.label}
              scaleTo={0.99}
              onPress={() => {
                if (entry.href) router.push(entry.href as Parameters<typeof router.push>[0]);
                else toast.info(`${entry.label} is on the way`, `Arrives with ${entry.phase}.`);
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
                  {entry.label}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {entry.description}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
            </PressableScale>
          ))}
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 3).springify().damping(18)} className="mt-6">
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
              Preview storefront
            </Text>
            <Text variant="caption" tone="tertiary">
              See your shop the way customers do
            </Text>
          </View>
          <ChevronRight size={18} color={colors.inkTertiary} strokeWidth={2} />
        </PressableScale>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(STAGGER_MS * 4).springify().damping(18)} className="mt-6">
        <PressableScale
          onPress={confirmSignOut}
          accessibilityRole="button"
          className="h-12 flex-row items-center justify-center gap-2 rounded-md bg-negative-tint"
        >
          <LogOut size={18} color={colors.negative} strokeWidth={2} />
          <Text variant="body" weight="semibold" tone="negative">
            Sign out
          </Text>
        </PressableScale>
        <Text variant="micro" tone="tertiary" className="mt-4 text-center">
          Counter v0.1.0
        </Text>
      </Animated.View>
    </Screen>
  );
}
