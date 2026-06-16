import { AppState } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useStoreProfile } from '@/stores/store-profile';

/**
 * Staff time-in-app tracking. While a member is signed in with a store and the
 * app is foregrounded, we keep an open `staff_sessions` row whose `last_seen_at`
 * is heartbeated every minute. A new session is started after a long idle gap so
 * background/overnight time isn't counted. Active minutes ≈ Σ(last_seen−started).
 */

const BEAT_MS = 60_000;
const GAP_MS = 5 * 60_000; // a gap longer than this starts a fresh session

let sessionId: string | null = null;
let lastBeat = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function stopHeartbeat(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function beat(): Promise<void> {
  if (!sessionId) return;
  lastBeat = Date.now();
  await supabase
    .from('staff_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId);
}

async function startSession(): Promise<void> {
  const storeId = useStoreProfile.getState().store?.id ?? null;
  const { data } = await supabase
    .from('staff_sessions')
    .insert({ store_id: storeId })
    .select('id')
    .maybeSingle();
  sessionId = (data as { id?: string } | null)?.id ?? null;
  lastBeat = Date.now();
}

async function resume(): Promise<void> {
  // Fresh session on first run or after a long idle gap; otherwise keep going.
  if (!sessionId || Date.now() - lastBeat > GAP_MS) await startSession();
  stopHeartbeat();
  timer = setInterval(() => void beat(), BEAT_MS);
}

async function pause(): Promise<void> {
  stopHeartbeat();
  await beat(); // record the final foreground moment
}

function end(): void {
  stopHeartbeat();
  sessionId = null;
  lastBeat = 0;
}

if (isSupabaseConfigured) {
  let active = false;

  // Start tracking once a store is resolved (owner or staff); stop on logout.
  useStoreProfile.subscribe((state) => {
    const hasStore = state.store !== null;
    if (hasStore && !active) {
      active = true;
      void resume();
    } else if (!hasStore && active) {
      active = false;
      void pause();
      end();
    }
  });

  AppState.addEventListener('change', (next) => {
    if (!active) return;
    if (next === 'active') void resume();
    else void pause();
  });
}
