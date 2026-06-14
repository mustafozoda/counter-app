import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import type { User } from '@/types/models';

interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** Simulated network latency so loading states behave like production. */
const fakeNetwork = () => new Promise<void>((resolve) => setTimeout(resolve, 650));

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? 'Owner';
  const cleaned = handle.replace(/[._-]+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Owner';
}

/**
 * Mock auth, persisted like a real session. The async signatures and error
 * paths match what the Supabase adapter will expose, so swapping the backend
 * in later only replaces these implementations.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,

      signIn: async (email) => {
        await fakeNetwork();
        set({
          user: {
            id: createLocalId(),
            name: nameFromEmail(email),
            email,
            avatarUrl: null,
            role: 'owner',
          },
        });
      },

      signUp: async (name, email) => {
        await fakeNetwork();
        set({
          user: {
            id: createLocalId(),
            name,
            email,
            avatarUrl: null,
            role: 'owner',
          },
        });
      },

      signOut: () => set({ user: null }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.auth',
      storage: persistStorage,
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
