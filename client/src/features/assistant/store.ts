import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { fetchConversations, removeConversation, saveConversation } from './conversations';
import type { ChatMessage, Conversation } from './types';

const TITLE_MAX = 42;

function deriveTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX)}…` : clean;
}

function mapConversation(
  state: AssistantState,
  id: string,
  fn: (conversation: Conversation) => Conversation,
): Pick<AssistantState, 'conversations'> {
  return { conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) };
}

interface AssistantState {
  conversations: Conversation[];
  activeId: string | null;
  hasHydrated: boolean;

  /** Start a fresh conversation and make it active. Returns its id. */
  createConversation: () => string;
  /** Discard empty chats and open a fresh one — used when (re)entering the screen. */
  startNewChat: () => string;
  /** Active conversation id, creating/selecting one if needed. */
  ensureConversation: () => string;
  setActive: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;

  addMessage: (conversationId: string, message: ChatMessage) => void;
  appendToMessage: (conversationId: string, messageId: string, delta: string) => void;
  patchMessage: (conversationId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  /** Drop every message after the given one (used when editing & resending). */
  truncateAfterMessage: (conversationId: string, messageId: string) => void;

  /** Push one conversation to the cloud (no-op in demo mode). Streaming uses
   *  this on completion rather than saving on every token. */
  commit: (conversationId: string) => void;
  /** Replace history when the signed-in user changes (cloud sync). */
  setConversations: (conversations: Conversation[]) => void;

  setHasHydrated: (value: boolean) => void;
}

const creator = (
  set: (partial: Partial<AssistantState> | ((s: AssistantState) => Partial<AssistantState>)) => void,
  get: () => AssistantState,
): AssistantState => ({
  conversations: [],
  activeId: null,
  hasHydrated: false,

  createConversation: () => {
    const id = createLocalId();
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id,
      title: '',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ conversations: [conversation, ...s.conversations], activeId: id }));
    return id;
  },

  startNewChat: () => {
    // Drop empty (unused) chats so reopening lands on a clean one without
    // cluttering history, then open a fresh conversation.
    set((s) => ({ conversations: s.conversations.filter((c) => c.messages.length > 0) }));
    return get().createConversation();
  },

  ensureConversation: () => {
    const { activeId, conversations } = get();
    if (activeId && conversations.some((c) => c.id === activeId)) return activeId;
    const first = conversations[0];
    if (first) {
      set({ activeId: first.id });
      return first.id;
    }
    return get().createConversation();
  },

  setActive: (id) => set({ activeId: id }),

  deleteConversation: (id) => {
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
      return { conversations, activeId };
    });
    if (isSupabaseConfigured) void removeConversation(id);
  },

  renameConversation: (id, title) => {
    set((s) => mapConversation(s, id, (c) => ({ ...c, title: title.trim() })));
    get().commit(id);
  },

  addMessage: (conversationId, message) => {
    set((s) =>
      mapConversation(s, conversationId, (c) => ({
        ...c,
        messages: [...c.messages, message],
        title: !c.title && message.role === 'user' ? deriveTitle(message.content) : c.title,
        updatedAt: new Date().toISOString(),
      })),
    );
    // Persist the turn (and create the cloud row on the first message).
    get().commit(conversationId);
  },

  appendToMessage: (conversationId, messageId, delta) =>
    // Per-token update — intentionally NOT committed to the cloud here; the
    // screen calls commit() once on stream completion.
    set((s) =>
      mapConversation(s, conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId ? { ...m, content: m.content + delta } : m,
        ),
        updatedAt: new Date().toISOString(),
      })),
    ),

  patchMessage: (conversationId, messageId, patch) =>
    set((s) =>
      mapConversation(s, conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      })),
    ),

  truncateAfterMessage: (conversationId, messageId) => {
    set((s) =>
      mapConversation(s, conversationId, (c) => {
        const idx = c.messages.findIndex((m) => m.id === messageId);
        if (idx < 0) return c;
        return {
          ...c,
          messages: c.messages.slice(0, idx + 1),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
    get().commit(conversationId);
  },

  commit: (conversationId) => {
    if (!isSupabaseConfigured) return;
    const conversation = get().conversations.find((c) => c.id === conversationId);
    // Only sync conversations that have content — skip empty "new chat" shells.
    if (conversation && conversation.messages.length > 0) void saveConversation(conversation);
  },

  setConversations: (conversations) =>
    set({ conversations, activeId: conversations[0]?.id ?? null }),

  setHasHydrated: (value) => set({ hasHydrated: value }),
});

/**
 * Cloud-synced per user when Supabase is configured (history follows the
 * account across devices, isolated by RLS); otherwise a local persisted store
 * so the app still runs in demo mode.
 */
export const useAssistantStore = isSupabaseConfigured
  ? create<AssistantState>()((set, get) => creator(set, get))
  : create<AssistantState>()(
      persist((set, get) => creator(set, get), {
        name: 'counter.assistant',
        storage: persistStorage,
        // Keep base64 image blobs out of AsyncStorage (tight size limits on
        // Android): attachments stay visible for the live session but aren't
        // persisted across restarts. Message text always persists.
        partialize: (state) => ({
          conversations: state.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((m) => (m.images ? { ...m, images: undefined } : m)),
          })),
          activeId: state.activeId,
        }),
        onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
      }),
    );

// Load the signed-in user's history from the cloud and swap it whenever the
// account changes. Deduped by user id so token refreshes don't reload.
if (isSupabaseConfigured) {
  let loadedUserId: string | null = null;
  const sync = async (session: Session | null) => {
    const uid = session?.user.id ?? null;
    if (uid === loadedUserId) return;
    loadedUserId = uid;
    if (!uid) {
      useAssistantStore.setState({ conversations: [], activeId: null, hasHydrated: true });
      return;
    }
    const conversations = await fetchConversations();
    useAssistantStore.setState({
      conversations,
      activeId: conversations[0]?.id ?? null,
      hasHydrated: true,
    });
  };

  void supabase.auth.getSession().then(({ data }) => sync(data.session));
  supabase.auth.onAuthStateChange((_event, session) => void sync(session));
}
