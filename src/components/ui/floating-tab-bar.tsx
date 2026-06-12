import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  ScanBarcode,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/lib/haptics';
import { springs, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { Text } from './text';

const TAB_META: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: LayoutDashboard, label: 'Home' },
  products: { icon: Package, label: 'Products' },
  orders: { icon: ReceiptText, label: 'Orders' },
  more: { icon: Menu, label: 'More' },
};

interface TabItemProps {
  icon: LucideIcon;
  label: string;
  focused: boolean;
  onPress: () => void;
}

function TabItem({ icon: Icon, label, focused, onPress }: TabItemProps) {
  const { colors } = useTheme();
  const progress = useDerivedValue(
    () => withSpring(focused ? 1 : 0, springs.standard),
    [focused],
  );

  const pillStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -1]) }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      className="flex-1 items-center justify-center"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View className="items-center gap-1">
        <View className="h-9 w-14 items-center justify-center">
          <Animated.View
            className="absolute h-9 w-14 rounded-full bg-primary-tint"
            style={pillStyle}
          />
          <Animated.View style={iconStyle}>
            <Icon
              size={22}
              color={focused ? colors.primary : colors.inkTertiary}
              strokeWidth={focused ? 2.25 : 2}
            />
          </Animated.View>
        </View>
        <Text
          variant="micro"
          weight={focused ? 'semibold' : 'medium'}
          tone={focused ? 'accent' : 'tertiary'}
        >
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

function SellButton({ onPress }: { onPress: () => void }) {
  const { colors, gradient } = useTheme();

  return (
    <View className="w-[76px] items-center">
      <PressableScale
        onPress={onPress}
        scaleTo={0.88}
        haptic="press"
        accessibilityRole="button"
        accessibilityLabel="Sell — open point of sale"
        className="-mt-9"
        style={{
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 14,
          shadowOpacity: 0.45,
          elevation: 10,
        }}
      >
        <LinearGradient
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <ScanBarcode size={26} color="#FFFFFF" strokeWidth={2} />
        </LinearGradient>
      </PressableScale>
      <Text variant="micro" weight="semibold" tone="accent" className="mt-1">
        Sell
      </Text>
    </View>
  );
}

/**
 * Counter's floating navigation: a soft pill bar with four tabs and the
 * raised gradient Sell FAB in the center (§6.4). Slides away when the
 * keyboard opens.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, shadows, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const keyboardShown = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => {
      keyboardShown.value = withSpring(1, springs.standard);
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardShown.value = withSpring(0, springs.standard);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardShown]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(keyboardShown.value, [0, 1], [0, 160]) }],
    opacity: interpolate(keyboardShown.value, [0, 1], [1, 0]),
  }));

  const handleTabPress = (routeName: string, routeKey: string, focused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) {
      haptics.tap();
      navigation.navigate(routeName);
    }
  };

  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2);

  const renderRoute = (route: (typeof routes)[number]) => {
    const meta = TAB_META[route.name];
    if (!meta) return null;
    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === routeIndex;
    return (
      <TabItem
        key={route.key}
        icon={meta.icon}
        label={meta.label}
        focused={focused}
        onPress={() => handleTabPress(route.name, route.key, focused)}
      />
    );
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      className="absolute left-0 right-0"
      style={[{ bottom: insets.bottom + 10 }, barStyle]}
    >
      <View
        className="mx-5 h-[68px] flex-row items-center overflow-visible rounded-full border border-hairline"
        style={[
          shadows.lg,
          {
            backgroundColor: isDark
              ? colors.surfaceElevated
              : Platform.OS === 'ios'
                ? 'rgba(255,255,255,0.82)'
                : colors.surface,
          },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, styles.blur]}
          />
        ) : null}
        {leftRoutes.map(renderRoute)}
        <SellButton onPress={() => router.push('/sell')} />
        {rightRoutes.map(renderRoute)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blur: {
    borderRadius: 34,
    overflow: 'hidden',
  },
});
