import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Supabase client — the real backend behind every data API and auth.
 *
 * Credentials come from the environment (Expo only exposes EXPO_PUBLIC_*):
 *   EXPO_PUBLIC_SUPABASE_URL       e.g. https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  the anon/public key (safe to ship — RLS
 *                                  is what actually protects the data)
 *
 * When these are unset, `isSupabaseConfigured` is false and the app falls back
 * to the local AsyncStorage demo implementations, so it still runs end-to-end
 * without a backend.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

// Create with placeholders when unconfigured so imports never crash; callers
// must gate real usage on `isSupabaseConfigured`.
export const supabase = createClient(url || 'http://localhost', anonKey || 'public-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session handoff on native; harmless to disable on web too.
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// In-memory access token
//
// The assistant streams over XHR and sets headers synchronously, so it can't
// await getSession(). We mirror the current token here on every auth change.
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

if (isSupabaseConfigured) {
  void supabase.auth.getSession().then(({ data }) => {
    accessToken = data.session?.access_token ?? null;
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
  });

  // Keep tokens fresh while the app is foregrounded (Supabase RN guidance).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
  }
}
