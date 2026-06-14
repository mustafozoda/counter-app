import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { LanguageCode } from '@/i18n/translations';
import { persistStorage } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesState {
  themeMode: ThemeMode;
  /** null = follow the device language. */
  language: LanguageCode | null;
  hasHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: LanguageCode | null) => void;
  setHasHydrated: (value: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      language: null,
      hasHydrated: false,
      setThemeMode: (mode) => set({ themeMode: mode }),
      setLanguage: (language) => set({ language }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.preferences',
      storage: persistStorage,
      partialize: (state) => ({ themeMode: state.themeMode, language: state.language }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
