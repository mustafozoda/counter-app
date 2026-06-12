/**
 * Counter DS — semantic color tokens (TypeScript mirror of global.css).
 *
 * Use Tailwind classes (`bg-surface`, `text-ink`) wherever possible.
 * Reach for these objects only when a hex value is required imperatively:
 * icon `color` props, gradients, shadows, charts, navigation themes.
 */
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSunken: string;
  surfaceElevated: string;
  hairline: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  primary: string;
  primaryTint: string;
  onPrimary: string;
  positive: string;
  positiveTint: string;
  caution: string;
  cautionTint: string;
  negative: string;
  negativeTint: string;
  info: string;
  infoTint: string;
}

export const lightColors: ThemeColors = {
  background: '#FBFAF8',
  surface: '#FFFFFF',
  surfaceSunken: '#F4F2EE',
  surfaceElevated: '#FFFFFF',
  hairline: '#ECEAE4',
  ink: '#16151A',
  inkSecondary: '#6B6A73',
  inkTertiary: '#9C9AA3',
  primary: '#4F46E5',
  primaryTint: '#EEF0FE',
  onPrimary: '#FFFFFF',
  positive: '#15803D',
  positiveTint: '#DCFCE7',
  caution: '#B45309',
  cautionTint: '#FEF3C7',
  negative: '#BE123C',
  negativeTint: '#FFE4E6',
  info: '#0369A1',
  infoTint: '#E0F2FE',
};

export const darkColors: ThemeColors = {
  background: '#0B0B0F',
  surface: '#15151B',
  surfaceSunken: '#101015',
  surfaceElevated: '#1C1C24',
  hairline: '#26262F',
  ink: '#F5F5F7',
  inkSecondary: '#A1A1AB',
  inkTertiary: '#71717C',
  primary: '#6366F1',
  primaryTint: '#242440',
  onPrimary: '#FFFFFF',
  positive: '#4ADE80',
  positiveTint: '#102E1F',
  caution: '#FBBF24',
  cautionTint: '#3A2A0C',
  negative: '#FB7185',
  negativeTint: '#3F1220',
  info: '#38BDF8',
  infoTint: '#0C2D40',
};

export const themeColors: Record<ColorScheme, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};

/** Signature brand gradient: indigo → violet. */
export const brandGradient = ['#4F46E5', '#7C3AED'] as const;
