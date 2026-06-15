export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Set when the reply failed, so the bubble can render in an error tone. */
  error?: boolean;
  /** Data-URI images attached to a user message (vision input). */
  images?: string[];
}

export interface Conversation {
  id: string;
  /** Empty until the first user message; the UI shows a placeholder meanwhile. */
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
