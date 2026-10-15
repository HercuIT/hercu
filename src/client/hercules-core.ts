// Pure helpers for the Hercules widget (specs/hercules-assistant/03): SSE parsing and the
// conversation "temporary variable" mirrored to sessionStorage. No DOM, so they are unit-tested.
import { MAX_ASSISTANT_CHARS, MAX_MESSAGES, MAX_USER_CHARS, TURNSTILE_ACTION, type ChatMessage } from '../../worker/guards';

export { MAX_USER_CHARS, TURNSTILE_ACTION, type ChatMessage };
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
    // Restore only what the server would accept back: complete user→assistant pairs (so the next
    // user message keeps it alternating), room for that message, and non-blank in-limit content.
    if (parsed.length % 2 !== 0 || parsed.length > MAX_MESSAGES - 1) return [];
    const valid = parsed.every((m, i) => {
      const max = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
      return m.role === (i % 2 === 0 ? 'user' : 'assistant') && m.content.trim() !== '' && m.content.length <= max;
    });
    return valid ? parsed : [];
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

/** The two Turnstile calls the gate needs (window.turnstile in the browser, a fake in tests). */
export type TurnstileApi = { reset(widgetId: string): void; execute(widgetId: string): void };

export const TURNSTILE_TIMEOUT_MS = 15_000;

/**
 * Hands out one fresh Turnstile token per message. `token()` waits until the widget has been
 * rendered (the api.js script loads asynchronously, so a quick reply can come first), then resets
 * and executes it and waits for the callback; each wait is bounded by `timeoutMs`.
 */
export class TurnstileGate {
  private api: TurnstileApi | null = null;
  private widgetId: string | null = null;
  private markReady!: () => void;
  private readonly ready = new Promise<void>((resolve) => (this.markReady = resolve));
  private pending: { resolve(token: string): void; reject(err: Error): void } | null = null;

  constructor(private readonly timeoutMs = TURNSTILE_TIMEOUT_MS) {}

  /** Call once the widget is rendered; releases every token() that was waiting for it. */
  setReady(api: TurnstileApi, widgetId: string): void {
    this.api = api;
    this.widgetId = widgetId;
    this.markReady();
  }

  /** Wire to the widget's `callback`. */
  resolveToken(token: string): void {
    this.pending?.resolve(token);
  }

  /** Wire to the widget's `error-callback`. */
  rejectToken(err = new Error('turnstile error')): void {
    this.pending?.reject(err);
  }

  async token(): Promise<string> {
    await this.within(this.ready, 'turnstile not ready');
    const api = this.api!;
    const widgetId = this.widgetId!;
    const callback = new Promise<string>((resolve, reject) => (this.pending = { resolve, reject }));
    api.reset(widgetId); // tokens are single-use
    api.execute(widgetId);
    try {
      return await this.within(callback, 'turnstile timeout');
    } finally {
      this.pending = null;
    }
  }

  private within<T>(promise: Promise<T>, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(message)), this.timeoutMs)));
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
}

export type StreamOutcome = { reply: string; sawDone: boolean; error: string | null; leadSent: boolean };
export type Settlement = {
  /** Store the reply as a complete assistant turn (else roll back the user message). */
  keep: boolean;
  /** The capped reply to store when `keep` is true. */
  stored: string;
  /** Error code to show the visitor, if any. */
  error: string | null;
  leadSent: boolean;
};

/**
 * Decides what a finished stream leaves in the conversation. A reply is kept only when the stream
 * completed cleanly (`done` seen, no `error`) and has text; a cut-off reply is never stored, replayed
 * to the model or emailed. A stream that ended without `done` counts as "unavailable".
 */
export function settleReply(o: StreamOutcome): Settlement {
  const error = o.error ?? (o.sawDone ? null : 'unavailable');
  const keep = o.sawDone && error === null && o.reply.trim() !== '';
  return { keep, stored: keep ? capAssistantReply(o.reply) : '', error, leadSent: o.leadSent };
}

export type NoticeStrings = { rateLimited: string; unavailable: string; refused: string; invalid: string; fallback: string };

/**
 * Visible + spoken text for a server error code. Errors are `urgent` (announced assertively);
 * unknown codes fall back to "unavailable". Always ends with the phone fallback.
 */
export function errorNotice(code: string, e: NoticeStrings, phone: string): { text: string; urgent: true } {
  const message =
    code === 'rate_limited' ? e.rateLimited : code === 'refused' ? e.refused : code === 'invalid_request' ? e.invalid : e.unavailable;
  return { text: `${message} ${e.fallback} ${phone}.`, urgent: true };
}
