import '../global.css';
import 'react-native-url-polyfill/auto';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { queryClient } from '@/api/query-client';
import { ToastHost } from '@/components/ui';
import { changeLanguage, deviceLanguage, initI18n, isRtlLanguage } from '@/i18n';
import { APP_FRAME_WIDTH } from '@/lib/responsive';
import { useAuthStore } from '@/stores/auth';
import { usePreferences } from '@/stores/preferences';
import { useStoreProfile } from '@/stores/store-profile';
import { navigationThemes } from '@/theme/navigation';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const user = useAuthStore((s) => s.user);
  const authHydrated = useAuthStore((s) => s.hasHydrated);
  const store = useStoreProfile((s) => s.store);
  const storeHydrated = useStoreProfile((s) => s.hasHydrated);
  const themeMode = usePreferences((s) => s.themeMode);
  const language = usePreferences((s) => s.language);
  const prefsHydrated = usePreferences((s) => s.hasHydrated);

  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    if (prefsHydrated) setColorScheme(themeMode);
  }, [prefsHydrated, themeMode, setColorScheme]);

  // Initialize translations once preferences are known, and keep the active
  // language + RTL layout direction in sync with the user's choice.
  useEffect(() => {
    if (!prefsHydrated) return;
    const active = language ?? deviceLanguage();
    initI18n(language);
    changeLanguage(active);
    const shouldRtl = isRtlLanguage(active);
    if (I18nManager.isRTL !== shouldRtl) {
      I18nManager.allowRTL(shouldRtl);
      I18nManager.forceRTL(shouldRtl);
      // A full RTL flip needs a reload to re-lay-out native views; new
      // launches pick it up. We avoid forcing a reload mid-session here.
    }
  }, [prefsHydrated, language]);

  const ready = fontsLoaded && authHydrated && storeHydrated && prefsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const signedIn = user !== null;
  const onboarded = store !== null;

  // On web, frame the app to a phone-width column centered on a dark backdrop
  // so a desktop browser preview matches a real phone. Native fills the screen.
  const isWeb = Platform.OS === 'web';

  return (
    <GestureHandlerRootView
      style={isWeb ? { flex: 1, alignItems: 'center', backgroundColor: '#000000' } : { flex: 1 }}
    >
      <KeyboardProvider>
        <View style={isWeb ? { flex: 1, width: '100%', maxWidth: APP_FRAME_WIDTH } : { flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={navigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={!signedIn}>
                    <Stack.Screen name="(auth)" />
                  </Stack.Protected>
                  <Stack.Protected guard={signedIn && !onboarded}>
                    <Stack.Screen name="onboarding" />
                  </Stack.Protected>
                  <Stack.Protected guard={signedIn && onboarded}>
                    <Stack.Screen name="(merchant)" />
                    <Stack.Screen name="(storefront)" />
                  </Stack.Protected>
                </Stack>
                <ToastHost />
                <StatusBar style="auto" />
              </BottomSheetModalProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </View>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
