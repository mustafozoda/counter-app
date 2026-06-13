import type { Theme as NavigationTheme } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

import { darkColors, lightColors } from './colors';

/** React Navigation themes derived from Counter DS tokens. */
export const navigationThemes: Record<'light' | 'dark', NavigationTheme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: lightColors.primary,
      background: lightColors.background,
      card: lightColors.surface,
      text: lightColors.ink,
      border: lightColors.hairline,
      notification: lightColors.negative,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: darkColors.primary,
      background: darkColors.background,
      card: darkColors.surface,
      text: darkColors.ink,
      border: darkColors.hairline,
      notification: darkColors.negative,
    },
  },
};
