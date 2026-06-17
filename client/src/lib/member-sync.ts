import type { RealtimeChannel } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import type { StaffRole } from '@/types/models';

/**
 * Live membership sync. Each signed-in member subscribes (Supabase Realtime) to
 * their own store_members row so the owner's changes apply without a re-login:
 *   • role / permission changes → updated on the in-app user immediately
 *   • suspended (active = false)  → signed out on the spot
 */

let channel: RealtimeChannel | null = null;
let subscribedFor: string | null = null;

function unsubscribe(): void {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  subscribedFor = null;
}

function subscribe(userId: string): void {
  if (subscribedFor === userId) return; // ignore token refreshes for the same user
  unsubscribe();
  subscribedFor = userId;
  channel = supabase
    .channel(`member-sync:${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'store_members', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as {
          active?: boolean;
          role?: StaffRole;
          permissions?: Record<string, boolean> | null;
        };
        if (row.active === false) {
          // Suspended → log out immediately.
          useAuthStore.getState().signOut();
          return;
        }
        // Apply role / permission changes live.
        useAuthStore.setState((s) =>
          s.user
            ? {
                user: {
                  ...s.user,
                  role: row.role ?? s.user.role,
                  permissions: row.permissions ?? s.user.permissions ?? {},
                },
              }
            : {},
        );
      },
    )
    .subscribe();
}

if (isSupabaseConfigured) {
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) subscribe(data.session.user.id);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) subscribe(session.user.id);
    else unsubscribe();
  });
}
