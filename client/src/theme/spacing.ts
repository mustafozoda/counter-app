/**
 * Counter DS spacing (4pt grid) and radius tokens.
 * Tailwind's default scale already covers the 4pt grid for classNames;
 * these constants are for imperative styles, layout math and animations.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  full: 9999,
} as const;

/** Minimum accessible hit target (pt). */
export const HIT_TARGET = 44;
