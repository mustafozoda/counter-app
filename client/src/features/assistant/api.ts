import { getAccessToken } from '@/lib/supabase';

import { CHAT_API_URL } from './config';

/** A single piece of a multimodal message: text or an image (data URI / URL). */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface WireMessage {
  role: 'user' | 'assistant';
  /** Plain text, or multimodal parts when the turn includes images. */
  content: string | ContentPart[];
}

export interface StreamHandlers {
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (detail: string) => void;
}

/**
 * Streams a chat completion from the backend and feeds deltas to `handlers`.
 *
 * Uses XMLHttpRequest rather than fetch: React Native's XHR delivers partial
 * `responseText` via `onprogress` as the server flushes SSE frames, which is
 * the most reliable way to stream tokens across iOS/Android/Expo Go.
 *
 * Returns a cancel function that aborts the in-flight request.
 */
export function streamChat(messages: WireMessage[], handlers: StreamHandlers): () => void {
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let buffer = '';
  let finished = false;

  const finish = (run: () => void) => {
    if (finished) return;
    finished = true;
    run();
  };

  const processFrame = (frame: string) => {
    const line = frame.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (data === '[DONE]') {
      finish(handlers.onDone);
      return;
    }
    try {
      const parsed = JSON.parse(data) as { delta?: string; error?: string };
      if (parsed.error) {
        finish(() => handlers.onError(parsed.error ?? 'unknown'));
      } else if (parsed.delta) {
        handlers.onDelta(parsed.delta);
      }
    } catch {
      // Incomplete/non-JSON frame — ignore; the rest arrives next tick.
    }
  };

  const drain = () => {
    const text = xhr.responseText;
    if (text.length <= cursor) return;
    buffer += text.slice(cursor);
    cursor = text.length;
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) processFrame(part);
  };

  xhr.open('POST', `${CHAT_API_URL}/chat`);
  xhr.setRequestHeader('Content-Type', 'application/json');
  // Authenticate the request with the current Supabase session, when present.
  const token = getAccessToken();
  if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.onprogress = drain;
  xhr.onload = () => {
    drain();
    if (buffer.trim()) processFrame(buffer);
    finish(handlers.onDone);
  };
  xhr.onerror = () => finish(() => handlers.onError('network'));
  xhr.ontimeout = () => finish(() => handlers.onError('timeout'));

  try {
    xhr.send(JSON.stringify({ messages }));
  } catch {
    finish(() => handlers.onError('network'));
  }

  return () => {
    try {
      xhr.abort();
    } catch {
      // already settled
    }
  };
}
