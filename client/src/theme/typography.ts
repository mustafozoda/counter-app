import type { TextStyle } from 'react-native';

/**
 * Counter DS type scale.
 *
 * Display (big numbers, hero headlines) uses Space Grotesk; UI text uses
 * Inter; SKUs and codes use Space Mono. Fonts are loaded by exact
 * family-per-weight names (React Native runtime-loaded fonts cannot vary
 * `fontWeight` within one family).
 *
 * To swap the display face for Clash Display / Satoshi later, drop the TTFs
 * into /assets/fonts and remap `fontFamilies.display` here — nothing else
 * needs to change.
 */
export type TextVariant =
  | 'displayLg'
  | 'display'
  | 'displaySm'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'caption'
  | 'micro';

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

type FontRole = 'display' | 'sans' | 'mono';

export const fontFamilies: Record<FontRole, Record<TextWeight, string>> = {
  display: {
    regular: 'SpaceGrotesk_500Medium',
    medium: 'SpaceGrotesk_500Medium',
    semibold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  mono: {
    regular: 'SpaceMono_400Regular',
    medium: 'SpaceMono_400Regular',
    semibold: 'SpaceMono_700Bold',
    bold: 'SpaceMono_700Bold',
  },
};

interface VariantSpec {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  role: FontRole;
  defaultWeight: TextWeight;
}

export const textVariants: Record<TextVariant, VariantSpec> = {
  displayLg: {
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    role: 'display',
    defaultWeight: 'semibold',
  },
  display: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
    role: 'display',
    defaultWeight: 'semibold',
  },
  displaySm: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    role: 'display',
    defaultWeight: 'semibold',
  },
  h1: { fontSize: 24, lineHeight: 30, letterSpacing: -0.4, role: 'sans', defaultWeight: 'bold' },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    role: 'sans',
    defaultWeight: 'semibold',
  },
  title: { fontSize: 17, lineHeight: 22, role: 'sans', defaultWeight: 'semibold' },
  body: { fontSize: 15, lineHeight: 21, role: 'sans', defaultWeight: 'regular' },
  caption: { fontSize: 13, lineHeight: 18, role: 'sans', defaultWeight: 'regular' },
  micro: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.3,
    role: 'sans',
    defaultWeight: 'medium',
  },
};

export function textStyle(
  variant: TextVariant,
  weight?: TextWeight,
  options?: { mono?: boolean; tabular?: boolean },
): TextStyle {
  const spec = textVariants[variant];
  const role: FontRole = options?.mono ? 'mono' : spec.role;
  const resolvedWeight = weight ?? spec.defaultWeight;
  return {
    fontFamily: fontFamilies[role][resolvedWeight],
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    // Financial figures must never jiggle while animating.
    fontVariant: options?.tabular ? ['tabular-nums'] : undefined,
  };
}
