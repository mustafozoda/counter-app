import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/i18n';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Push & local notifications.
 *
 * Local (works on any build): a daily review reminder + low-stock alerts,
 * scheduled on the device. Remote (needs an EAS projectId + a deployed Edge
 * Function): the device's Expo push token is stored in `device_tokens` so the
 * server can notify the owner of new orders even when the app is closed.
 *
 * Everything degrades gracefully — missing permission, no projectId, or Expo Go
 * just means a notification doesn't fire, never a crash.
 */

const LOW_STOCK_KEY = 'counter.push.lowStockNotifiedOn';
const DAILY_ID = 'counter-daily-summary';

let currentToken: string | null = null;

// Show the banner (and play a sound) even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  return status === 'granted';
}

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

/** Fetch the Expo push token and store it for this user (enables remote push). */
export async function registerPushToken(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!Device.isDevice) return; // push tokens only work on physical devices
  const projectId = getProjectId();
  if (!projectId) return; // run `eas init` to enable remote push (local still works)

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    currentToken = token;
    await supabase
      .from('device_tokens')
      .upsert({ token, platform: Platform.OS }, { onConflict: 'token' });
  } catch {
    // Token fetch / upsert failed — remote push just won't fire.
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!isSupabaseConfigured || !currentToken) return;
  const token = currentToken;
  currentToken = null;
  try {
    await supabase.from('device_tokens').delete().eq('token', token);
  } catch {
    /* ignore */
  }
}

/** A gentle daily nudge to review the day's sales (8 PM local, repeating). */
export async function scheduleDailySummary(): Promise<void> {
  await ensureAndroidChannel();
  // Clear the previous one first so logins don't stack duplicates.
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: { title: i18n.t('push.dailyTitle'), body: i18n.t('push.dailyBody') },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailySummary(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => {});
}

/** Present a low-stock alert immediately — but at most once per calendar day. */
export async function notifyLowStock(count: number): Promise<void> {
  if (count <= 0) return;
  const today = new Date().toDateString();
  if ((await AsyncStorage.getItem(LOW_STOCK_KEY)) === today) return;
  await AsyncStorage.setItem(LOW_STOCK_KEY, today);
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('push.lowStockTitle'),
      body: i18n.t('push.lowStockBody', { count }),
    },
    trigger: null, // present now
  });
}

// Tie notifications to the auth session: ask once on login, register the push
// token, schedule the daily reminder; clean up on logout.
if (isSupabaseConfigured) {
  let active = false;
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session && !active) {
      active = true;
      void (async () => {
        if (await requestNotificationPermission()) {
          await registerPushToken();
          await scheduleDailySummary();
        }
      })();
    } else if (!session && active) {
      active = false;
      void unregisterPushToken();
      void cancelDailySummary();
    }
  });
}
