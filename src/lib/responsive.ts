import { Platform, useWindowDimensions } from 'react-native';

/**
 * Galaxy A51-class phone width (logical points). The app is phone-first; on
 * web we frame the UI to this width so a desktop browser preview matches a
 * real phone instead of stretching grids across a wide window.
 */
export const APP_FRAME_WIDTH = 412;

const isWeb = Platform.OS === 'web';

/**
 * Width the UI should lay layouts out against: the true device width on
 * native, but capped to the phone frame on web so grids and galleries size
 * exactly as they do on the phone (the window can be far wider than the frame).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return isWeb ? Math.min(width, APP_FRAME_WIDTH) : width;
}
