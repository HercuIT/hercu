// Pure helpers for the Hercules widget (specs/hercules-assistant/03): SSE parsing and the
// conversation "temporary variable" mirrored to sessionStorage. No DOM, so they are unit-tested.
import { MAX_ASSISTANT_CHARS, MAX_MESSAGES, MAX_USER_CHARS, type ChatMessage } from '../../worker/guards';

export { MAX_USER_CHARS, type ChatMessage };
export const STORAGE_KEY = 'hercules:v1';

export type ServerEvent =
  | { event: 'text'; delta: string }
  | { event: 'lead_sent' }
  | { event: 'error'; code: string }
  | { event: 'done' };

/**
 * Parses as many complete SSE events as `buffer` holds (events end with a blank line) and returns
 * the unconsumed remainder, so chunks split anywhere in the stream are handled.
 */
export function parseSse(buffer: string): { events: ServerEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const rest = parts.pop() ?? '';
  const events: ServerEvent[] = [];
  for (const part of parts) {
    let name = '';
    let data = '';
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    let payload: Record<string, unknown> = {};
    try {
      payload = data ? JSON.parse(data) : {};
    } catch {
      continue; // malformed event: skip it, keep the stream alive
    }
    if (name === 'text' && typeof payload.delta === 'string') events.push({ event: 'text', delta: payload.delta });
    else if (name === 'lead_sent') events.push({ event: 'lead_sent' });
    else if (name === 'error') events.push({ event: 'error', code: typeof payload.code === 'string' ? payload.code : 'unavailable' });
    else if (name === 'done') events.push({ event: 'done' });
    // unknown event names are ignored (forward compatible)
  }
  return { events, rest };
}

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const { role, content } = value as Record<string, unknown>;
  return (role === 'user' || role === 'assistant') && typeof content === 'string';
}

/** Reads the stored conversation; anything invalid or unreadable (private mode) yields []. */
export function loadConversation(storage: Pick<Storage, 'getItem'> | undefined): ChatMessage[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isMessage)) return [];
    // Must alternate user/assistant starting with user, or the server would reject the next send.
    if (!parsed.every((m, i) => m.role === (i % 2 === 0 ? 'user' : 'assistant'))) return [];
    return parsed.slice(0, MAX_MESSAGES);
  } catch {
    return [];
  }
}

export function saveConversation(storage: Pick<Storage, 'setItem'> | undefined, conversation: ChatMessage[]): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(conversation));
  } catch {
    // storage full or blocked: the in-memory conversation still works
  }
}

export function clearConversation(storage: Pick<Storage, 'removeItem'> | undefined): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** True when one more user message would exceed the server's history limit. */
export function isConversationFull(conversation: ChatMessage[]): boolean {
  return conversation.length + 1 > MAX_MESSAGES;
}

/** Normalizes a visitor message; null when there is nothing to send. */
export function prepareUserMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_USER_CHARS);
}

/** Assistant replies are stored capped to what the server accepts back in the history. */
export function capAssistantReply(text: string): string {
  return text.trim().slice(0, MAX_ASSISTANT_CHARS);
}
