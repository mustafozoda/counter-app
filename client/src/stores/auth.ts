import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { User } from '@/types/models';

interface AuthState {
  user: User | null;
  hasHydrated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
}

/** Simulated network latency so demo-mode loading states feel real. */
const fakeNetwork = () => new Promise<void>((resolve) => setTimeout(resolve, 650));

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? 'Owner';
  const cleaned = handle.replace(/[._-]+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Owner';
}

/** Derive the in-app User from a Supabase session. Role is refined from the
 *  store membership elsewhere; signed-in owners are the common case. */
function userFromSession(session: Session): User {
  const u = session.user;
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? '',
    name: (meta.name as string) || nameFromEmail(u.email ?? ''),
    avatarUrl: (meta.avatar_url as string) ?? null,
    role: 'owner',
  };
}

const creator =
  (set: (partial: Partial<AuthState>) => void): AuthState => ({
    user: null,
    hasHydrated: false,

    signIn: async (email, password) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) set({ user: userFromSession(data.session) });
        return;
      }
      await fakeNetwork();
      set({
        user: { id: createLocalId(), name: nameFromEmail(email), email, avatarUrl: null, role: 'owner' },
      });
    },

    signUp: async (name, email, password) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
        // No session means email confirmation is on — caller surfaces an error.
        if (!data.session) throw new Error('Email confirmation required');
        set({ user: userFromSession(data.session) });
        return;
      }
      await fakeNetwork();
      set({ user: { id: createLocalId(), name, email, avatarUrl: null, role: 'owner' } });
    },

    signOut: () => {
      if (isSupabaseConfigured) void supabase.auth.signOut();
      set({ user: null });
    },

    setHasHydrated: (value) => set({ hasHydrated: value }),
  });

/**
 * Real Supabase auth when configured (Supabase persists the session itself);
 * otherwise a persisted mock so the app runs end-to-end with no backend.
 */
export const useAuthStore = isSupabaseConfigured
  ? create<AuthState>()((set) => creator(set))
  : create<AuthState>()(
      persist((set) => creator(set), {
        name: 'counter.auth',
        storage: persistStorage,
        partialize: (state) => ({ user: state.user }),
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      }),
    );

// Bootstrap + keep the in-app user in sync with the Supabase session.
if (isSupabaseConfigured) {
  void supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({
      user: data.session ? userFromSession(data.session) : null,
      hasHydrated: true,
    });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ user: session ? userFromSession(session) : null });
  });
}
