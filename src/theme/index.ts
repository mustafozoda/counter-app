import { useColorScheme } from 'nativewind';

import { type ColorScheme, type ThemeColors, brandGradient, themeColors } from './colors';
import { type ElevationLevel, themeShadows } from './shadows';

export * from './colors';
export * from './motion';
export * from './shadows';
export * from './spacing';
export * from './typography';

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  shadows: Record<ElevationLevel, object>;
  gradient: typeof brandGradient;
}

/**
 * Resolved Counter DS theme for imperative styling (icon colors, shadows,
 * gradients, charts). For layout/colors prefer Tailwind classes — they react
 * to scheme changes automatically via CSS variables.
 */
export function useTheme(): Theme {
  const { colorScheme } = useColorScheme();
  const scheme: ColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    isDark: scheme === 'dark',
    colors: themeColors[scheme],
    shadows: themeShadows[scheme],
    gradient: brandGradient,
  };
}
