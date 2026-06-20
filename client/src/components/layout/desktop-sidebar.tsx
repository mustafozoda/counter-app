import { usePathname, useRouter } from 'expo-router';
import {
  BarChart3,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  ScanBarcode,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';

import { Logo, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useResponsiveValue } from '@/lib/responsive';
import { useAuthStore } from '@/stores/auth';
import { effectivePermission, type Permission } from '@/stores/staff';
import { useStoreProfile } from '@/stores/store-profile';
import { useTheme } from '@/theme';

interface NavItem {
  icon: LucideIcon;
  /** Translation key for the label. */
  labelKey: string;
  href: string;
  /** Whether the given pathname should light this item up. */
  match: (path: string) => boolean;
  /** Hide unless the signed-in role holds this permission. */
  permission?: Permission;
  /** Push (modal/overlay) instead of navigate (page/tab swap). */
  push?: boolean;
}

const MAIN: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.home', href: '/', match: (p) => p === '/' },
  {
    icon: Package,
    labelKey: 'nav.products',
    href: '/products',
    match: (p) => p === '/products' || p.startsWith('/product'),
  },
  {
    icon: ReceiptText,
    labelKey: 'nav.orders',
    href: '/orders',
    match: (p) => p === '/orders' || p.startsWith('/order') || p.startsWith('/receipt'),
  },
  { icon: ScanBarcode, labelKey: 'nav.sell', href: '/sell', match: () => false, push: true },
];

const MANAGE: NavItem[] = [
  {
    icon: Users,
    labelKey: 'more.customers',
    href: '/customers',
    match: (p) => p.startsWith('/customer'),
  },
  {
    icon: Wallet,
    labelKey: 'more.finance',
    href: '/finance',
    match: (p) => p === '/finance',
    permission: 'view_finance',
  },
  {
    icon: HandCoins,
    labelKey: 'more.financing',
    href: '/financing',
    match: (p) => p === '/financing' || p.startsWith('/plan'),
    permission: 'view_finance',
  },
  {
    icon: Truck,
    labelKey: 'more.suppliers',
    href: '/suppliers',
    match: (p) => p.startsWith('/supplier'),
    permission: 'manage_inventory',
  },
  {
    icon: Tag,
    labelKey: 'more.promotions',
    href: '/promotions',
    match: (p) => p === '/promotions',
    permission: 'manage_inventory',
  },
  {
    icon: BarChart3,
    labelKey: 'more.reports',
    href: '/reports',
    match: (p) => p === '/reports',
    permission: 'view_finance',
  },
  {
    icon: ShieldCheck,
    labelKey: 'staff.title',
    href: '/staff',
    match: (p) => p.startsWith('/staff'),
    permission: 'manage_staff',
  },
];

const FOOTER: NavItem[] = [
  {
    icon: Sparkles,
    labelKey: 'assistant.title',
    href: '/assistant',
    match: (p) => p === '/assistant',
    permission: 'use_assistant',
  },
  {
    icon: Settings,
    labelKey: 'more.settings',
    href: '/settings',
    match: (p) => p === '/settings',
    permission: 'manage_settings',
  },
  {
    icon: ShoppingBag,
    labelKey: 'more.previewStorefront',
    href: '/(storefront)/(tabs)',
    match: () => false,
    push: true,
  },
];

function NavRow({ item, active, onPress }: { item: NavItem; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      className={cn(
        'flex-row items-center gap-3 rounded-md px-3 py-2.5',
        active ? 'bg-primary-tint' : 'hover:bg-surface-sunken dark:hover:bg-surface',
      )}
    >
      <item.icon
        size={20}
        color={active ? colors.primary : colors.inkSecondary}
        strokeWidth={active ? 2.4 : 2}
      />
      <Text
        variant="body"
        weight={active ? 'semibold' : 'medium'}
        tone={active ? 'accent' : 'secondary'}
        numberOfLines={1}
        className="flex-1"
      >
        {t(item.labelKey)}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="micro" weight="semibold" tone="tertiary" className="mb-1.5 mt-5 px-3 uppercase">
      {children}
    </Text>
  );
}

/**
 * Persistent left navigation for the desktop/tablet shell — replaces the phone's
 * floating tab bar. Mirrors the "More" menu's destinations and permission gates,
 * and highlights the active route. Only mounted at wide widths.
 */
export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const width = useResponsiveValue({ compact: 264, tablet: 248, laptop: 268, desktop: 288 });

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const store = useStoreProfile((s) => s.store);
  const role = user?.role ?? 'cashier';
  const overrides = user?.permissions;

  const allowed = (item: NavItem) =>
    !item.permission || effectivePermission(role, overrides, item.permission);

  const go = (item: NavItem) => {
    const href = item.href as Parameters<typeof router.push>[0];
    if (item.push) router.push(href);
    else router.navigate(href);
  };

  const confirmSignOut = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('more.signOutConfirm'))) signOut();
      return;
    }
    Alert.alert(t('more.signOut'), t('more.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('more.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const renderRow = (item: NavItem) => (
    <NavRow key={item.href} item={item} active={item.match(pathname)} onPress={() => go(item)} />
  );

  return (
    <View
      style={{ width }}
      className="h-full border-r border-hairline bg-surface dark:bg-surface-elevated"
    >
      {/* Store identity — tap to open the profile */}
      <Pressable
        onPress={() => router.push('/profile' as Parameters<typeof router.push>[0])}
        accessibilityRole="button"
        className="flex-row items-center gap-3 border-b border-hairline px-4 py-4 hover:bg-surface-sunken dark:hover:bg-surface"
      >
        <Logo size={40} letter={(store?.name.trim()[0] ?? 'C').toUpperCase()} />
        <View className="flex-1">
          <Text variant="title" weight="semibold" numberOfLines={1}>
            {store?.name ?? t('home.yourStore')}
          </Text>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {t(`roles.${role}`)}
          </Text>
        </View>
      </Pressable>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-3 pb-4 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {MAIN.filter(allowed).map(renderRow)}
        <SectionLabel>{t('more.manage')}</SectionLabel>
        {MANAGE.filter(allowed).map(renderRow)}
      </ScrollView>

      {/* Footer: assistant, settings, storefront preview, sign out */}
      <View className="gap-1 border-t border-hairline px-3 py-3">
        {FOOTER.filter(allowed).map(renderRow)}
        <Pressable
          onPress={confirmSignOut}
          accessibilityRole="button"
          className="mt-1 flex-row items-center gap-3 rounded-md px-3 py-2.5 hover:bg-negative-tint"
        >
          <LogOut size={20} color={colors.negative} strokeWidth={2} />
          <Text variant="body" weight="medium" tone="negative">
            {t('more.signOut')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
