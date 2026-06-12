import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Counter DS haptic map (§5.7):
 * light on tap · medium on toggle/add-to-cart · success on completed sale ·
 * warning on errors. All calls are fire-and-forget and no-op on web.
 */
const canVibrate = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  tap(): void {
    if (canVibrate) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  press(): void {
    if (canVibrate) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success(): void {
    if (canVibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning(): void {
    if (canVibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  error(): void {
    if (canVibrate) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  selection(): void {
    if (canVibrate) void Haptics.selectionAsync();
  },
};
