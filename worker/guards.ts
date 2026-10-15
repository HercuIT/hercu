// Request guards for POST /api/hercules (specs/hercules-assistant/01 §3). Pure except verifyTurnstile,
// which takes its fetch as a parameter so tests can stub it.

export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_MESSAGES = 30;
export const MAX_USER_CHARS = 2000;
export const MAX_ASSISTANT_CHARS = 4000;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type HerculesRequest = { locale: 'es' | 'en'; turnstileToken: string; messages: ChatMessage[] };

export class GuardError extends Error {
  constructor(
    readonly code: 'invalid_request' | 'rate_limited',
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Checks method, origin, content type and size, then parses and validates the body. */
export async function parseHerculesRequest(request: Request): Promise<HerculesRequest> {
  if (request.method !== 'POST') throw new GuardError('invalid_request', 'method not allowed', 405);
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new GuardError('invalid_request', 'cross-origin request', 403);
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new GuardError('invalid_request', 'content type must be application/json', 415);
  }
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) throw new GuardError('invalid_request', 'body too large', 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new GuardError('invalid_request', 'body too large', 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new GuardError('invalid_request', 'body is not JSON');
  }
  return validateBody(body);
}

export function validateBody(body: unknown): HerculesRequest {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new GuardError('invalid_request', 'body must be an object');
  const { locale, turnstileToken, messages } = body as Record<string, unknown>;
  if (locale !== 'es' && locale !== 'en') throw new GuardError('invalid_request', 'unknown locale');
  if (typeof turnstileToken !== 'string' || turnstileToken.length === 0 || turnstileToken.length > 2048) {
    throw new GuardError('invalid_request', 'missing turnstile token');
  }
  return { locale, turnstileToken, messages: validateHistory(messages) };
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
