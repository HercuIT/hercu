// Request guards for POST /api/hercules (specs/hercules-assistant/01 §3). Pure except verifyTurnstile,
// which takes its fetch as a parameter so tests can stub it.

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_MESSAGES = 30;
export const MAX_USER_CHARS = 2000;
export const MAX_ASSISTANT_CHARS = 4000;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type HerculesRequest = {
  locale: 'es' | 'en';
  turnstileToken: string;
  /** True only while the visitor has ticked the privacy-notice checkbox in the widget. */
  privacyAccepted: boolean;
  messages: ChatMessage[];
};

export class GuardError extends Error {
  constructor(
    readonly code: 'invalid_request' | 'rate_limited',
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Cheap header-only checks (method, origin, content type, declared size). Runs BEFORE the rate
 * limiter, so a hostile page's cross-origin form posts can't burn a visitor's per-IP quota.
 */
export function checkRequestShape(request: Request): void {
  if (request.method !== 'POST') throw new GuardError('invalid_request', 'method not allowed', 405);
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new GuardError('invalid_request', 'cross-origin request', 403);
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new GuardError('invalid_request', 'content type must be application/json', 415);
  }
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) throw new GuardError('invalid_request', 'body too large', 413);
}

/**
 * Reads the body incrementally and cancels as soon as it exceeds MAX_BODY_BYTES, so a missing or
 * false Content-Length can't make the Worker buffer an unbounded body.
 */
export async function readCappedBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new GuardError('invalid_request', 'body too large', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Reads (capped) and validates the body. Call after checkRequestShape. */
export async function readHerculesBody(request: Request): Promise<HerculesRequest> {
  const raw = await readCappedBody(request);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new GuardError('invalid_request', 'body is not JSON');
  }
  return validateBody(body);
}

/** Shape checks, then the capped body read and validation (no rate limiting in between). */
export async function parseHerculesRequest(request: Request): Promise<HerculesRequest> {
  checkRequestShape(request);
  return readHerculesBody(request);
}

export function validateBody(body: unknown): HerculesRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new GuardError('invalid_request', 'body must be an object');
  const { locale, turnstileToken, privacyAccepted, messages } = body as Record<string, unknown>;
  if (locale !== 'es' && locale !== 'en') throw new GuardError('invalid_request', 'unknown locale');
  if (typeof privacyAccepted !== 'boolean') throw new GuardError('invalid_request', 'privacyAccepted must be a boolean');
  if (typeof turnstileToken !== 'string' || turnstileToken.length === 0 || turnstileToken.length > 2048) {
    throw new GuardError('invalid_request', 'missing turnstile token');
  }
  return { locale, turnstileToken, privacyAccepted, messages: validateHistory(messages) };
}

/**
 * Text-only, alternating, user-first and user-last history. Tool blocks are never accepted from the
 * client, so the only submit_lead the server executes is one the model produced in this request.
 */
export function validateHistory(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new GuardError('invalid_request', `history must have 1–${MAX_MESSAGES} messages`);
  }
  const history = messages.map((m, i): ChatMessage => {
    if (typeof m !== 'object' || m === null) throw new GuardError('invalid_request', `message ${i} is not an object`);
    const { role, content } = m as Record<string, unknown>;
    const expected = i % 2 === 0 ? 'user' : 'assistant';
    if (role !== expected) throw new GuardError('invalid_request', `message ${i} must be from ${expected}`);
    if (typeof content !== 'string') throw new GuardError('invalid_request', `message ${i} must be plain text`);
    const max = role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (content.trim() === '' || content.length > max) throw new GuardError('invalid_request', `message ${i} is empty or too long`);
    return { role: expected, content };
  });
  if (history[history.length - 1].role !== 'user') throw new GuardError('invalid_request', 'history must end with a user message');
  return history;
}

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN_LENGTH = 2048;

/** The action the Hercules widget stamps on every token; siteverify must echo it back. */
export const TURNSTILE_ACTION = 'hercules';

/** Parses the TURNSTILE_HOSTNAMES var ("a.com, b.com") into a lowercase allowlist. */
export function parseHostnames(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Verifies a single-use Turnstile token (one per message, so a forged history can't skip it).
 * Fails closed: any missing input, network error, non-OK response, failed challenge, wrong action
 * or hostname outside the allowlist returns false.
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  expected: { action: string; hostnames: string[] },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > MAX_TOKEN_LENGTH || !secret || expected.hostnames.length === 0) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  try {
    const res = await fetchImpl(SITEVERIFY, { method: 'POST', body: form });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown; action?: unknown; hostname?: unknown };
    return (
      data.success === true &&
      data.action === expected.action &&
      typeof data.hostname === 'string' &&
      expected.hostnames.includes(data.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}
