import type { ViewStyle } from 'react-native';

import type { ColorScheme } from './colors';

export type ElevationLevel = 'sm' | 'md' | 'lg';

/**
 * Soft layered shadows (light mode). In dark mode shadows read as mud, so
 * we keep them faint — dark surfaces should lean on hairline borders and
 * elevated background tints instead (Card handles this automatically).
 */
const lightShadows: Record<ElevationLevel, ViewStyle> = {
  sm: {
    shadowColor: '#16151A',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.04,
    elevation: 2,
  },
  md: {
    shadowColor: '#16151A',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.06,
    elevation: 6,
  },
  lg: {
    shadowColor: '#16151A',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 0.1,
    elevation: 12,
  },
};

const darkShadows: Record<ElevationLevel, ViewStyle> = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    shadowOpacity: 0.4,
    elevation: 12,
  },
};

export const themeShadows: Record<ColorScheme, Record<ElevationLevel, ViewStyle>> = {
  light: lightShadows,
  dark: darkShadows,
};
