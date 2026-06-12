import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesState {
  themeMode: ThemeMode;
  hasHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setHasHydrated: (value: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      hasHydrated: false,
      setThemeMode: (mode) => set({ themeMode: mode }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.preferences',
      storage: persistStorage,
      partialize: (state) => ({ themeMode: state.themeMode }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
