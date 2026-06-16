import { supabase } from '@/lib/supabase';

import type { ChatMessage, Conversation } from './types';

/**
 * Cloud sync for assistant chat history (table `assistant_conversations`).
 *
 * History is scoped per signed-in user by RLS, so every account — owner or
 * cashier — gets its own private conversations that follow it across devices.
 * The store calls these fire-and-forget; failures degrade to "this turn isn't
 * saved" rather than breaking the chat.
 */

interface ConversationRow {
  id: string;
  title: string | null;
  messages: ChatMessage[] | null;
  created_at: string;
  updated_at: string;
}

function rowToConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    title: row.title ?? '',
    messages: Array.isArray(row.messages) ? row.messages : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Drop heavy image data URIs before persisting — same policy as the old local
 *  cache. Message text always syncs; attachments stay device-only. */
function stripImages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => (m.images ? { ...m, images: undefined } : m));
}

/** Every conversation belonging to the signed-in user, newest first. */
export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('assistant_conversations')
    .select('id, title, messages, created_at, updated_at')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return (data as ConversationRow[]).map(rowToConversation);
}

/** Create or update one conversation. `user_id` defaults to auth.uid() on
 *  insert, so we never send it from the client. */
export async function saveConversation(conversation: Conversation): Promise<void> {
  await supabase.from('assistant_conversations').upsert(
    {
      id: conversation.id,
      title: conversation.title,
      messages: stripImages(conversation.messages),
      created_at: conversation.createdAt,
      updated_at: conversation.updatedAt,
    },
    { onConflict: 'id' },
  );
}

export async function removeConversation(id: string): Promise<void> {
  await supabase.from('assistant_conversations').delete().eq('id', id);
}
