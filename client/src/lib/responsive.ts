import { Platform, useWindowDimensions } from 'react-native';

/**
 * Galaxy A51-class phone width (logical points). The app is phone-first; on a
 * narrow web window we frame the UI to this width so a desktop browser preview
 * matches a real phone instead of stretching the phone layout across the glass.
 */
export const APP_FRAME_WIDTH = 412;

/**
 * Width at/above which the desktop-class layout (persistent sidebar shell)
 * renders instead of the phone UI. Tablets (iPad portrait is 768pt), laptops
 * and desktop browsers cross this line; phones never do (the app is locked to
 * portrait on device, where the widest phones sit well under it).
 */
export const WIDE_BREAKPOINT = 768;

/**
 * Comfortable reading cap for a single-column desktop screen, so forms and
 * lists never sprawl edge-to-edge on a wide monitor. Dashboard-style screens
 * opt out and use the full content area.
 */
export const READABLE_MAX_WIDTH = 960;

/** Outer cap for multi-column desktop dashboards on ultra-wide displays. */
export const CONTENT_MAX_WIDTH = 1400;

const isWeb = Platform.OS === 'web';

/** Layout tiers, coarse enough to drive column counts and chrome density. */
export type Breakpoint = 'compact' | 'tablet' | 'laptop' | 'desktop';

/** Per-tier overrides; missing tiers fall back to the nearest smaller one. */
export type ResponsiveValues<T> = {
  compact: T;
  tablet?: T;
  laptop?: T;
  desktop?: T;
};

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width < WIDE_BREAKPOINT) return 'compact';
  if (width < 1024) return 'tablet';
  if (width < 1440) return 'laptop';
  return 'desktop';
}

/**
 * True on tablets, laptops and desktops — the single gate that decides whether
 * the sidebar shell renders in place of the phone UI.
 */
export function useIsWide(): boolean {
  return useWindowDimensions().width >= WIDE_BREAKPOINT;
}

/** Pick a value for the current tier, cascading down to the nearest smaller. */
export function useResponsiveValue<T>(values: ResponsiveValues<T>): T {
  const bp = useBreakpoint();
  if (bp === 'desktop') return values.desktop ?? values.laptop ?? values.tablet ?? values.compact;
  if (bp === 'laptop') return values.laptop ?? values.tablet ?? values.compact;
  if (bp === 'tablet') return values.tablet ?? values.compact;
  return values.compact;
}

/**
 * Width the UI should lay layouts out against: the true device width on native,
 * but capped to the phone frame on web so grids size exactly as they do on the
 * phone. Phone-framed screens (auth, storefront) rely on this cap even on a wide
 * browser; desktop screens measure their own container instead (columnsForWidth).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return isWeb ? Math.min(width, APP_FRAME_WIDTH) : width;
}

/**
 * Column count for a fluid grid: as many `idealTileWidth`-wide tiles as fit in
 * `containerWidth`, clamped to [1, max]. Measure the container with onLayout and
 * feed its width here so tiles reflow smoothly between phone, tablet and desktop.
 */
export function columnsForWidth(containerWidth: number, idealTileWidth: number, max = 6): number {
  if (containerWidth <= 0) return 1;
  return Math.max(1, Math.min(max, Math.floor(containerWidth / idealTileWidth)));
}
