import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createLocalId } from '@/lib/id';
import { persistStorage } from '@/lib/storage';

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

  setHasHydrated: (value: boolean) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
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

      deleteConversation: (id) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== id);
          const activeId = s.activeId === id ? (conversations[0]?.id ?? null) : s.activeId;
          return { conversations, activeId };
        }),

      renameConversation: (id, title) =>
        set((s) => mapConversation(s, id, (c) => ({ ...c, title: title.trim() }))),

      addMessage: (conversationId, message) =>
        set((s) =>
          mapConversation(s, conversationId, (c) => ({
            ...c,
            messages: [...c.messages, message],
            title: !c.title && message.role === 'user' ? deriveTitle(message.content) : c.title,
            updatedAt: new Date().toISOString(),
          })),
        ),

      appendToMessage: (conversationId, messageId, delta) =>
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

      truncateAfterMessage: (conversationId, messageId) =>
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
        ),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'counter.assistant',
      storage: persistStorage,
      partialize: (state) => ({ conversations: state.conversations, activeId: state.activeId }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
