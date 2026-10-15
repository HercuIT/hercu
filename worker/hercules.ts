// Conversation runner for Hercules (specs/hercules-assistant/01 §4). All I/O is injected (model stream,
// email, clock, logger), so the whole tool loop is unit-testable without network.
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from './guards';
import { formatLeadEmail, headerSafe, validateLead, type Lead, type LeadEmail } from './lead';
import { buildSystemPrompt } from './prompt';
import { SUBMIT_LEAD, submitLeadTool } from './tool';

type BetaMessage = Anthropic.Beta.Messages.BetaMessage;
type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BetaToolResultBlockParam = Anthropic.Beta.Messages.BetaToolResultBlockParam;
export type StreamParams = Parameters<Anthropic['beta']['messages']['stream']>[0];

// Up to 2 tool rounds plus a reserved final turn (tools off) so the visitor always gets an answer.
export const MAX_ITERATIONS = 3;
export const MAX_TOKENS = 4096;

export type SseEvent =
  | { event: 'text'; data: { delta: string } }
  | { event: 'lead_sent'; data: { ok: true } }
  | { event: 'error'; data: { code: 'unavailable' | 'refused' } }
  | { event: 'done'; data: Record<string, never> };

export type ModelStream = {
  onText(listener: (delta: string) => void): void;
  finalMessage(): Promise<BetaMessage>;
};

export type Deps = {
  stream(params: StreamParams): ModelStream;
  sendEmail(email: LeadEmail): Promise<void>;
  now(): Date;
  log(entry: Record<string, unknown>): void;
};

const promptCache = new Map<'es' | 'en', string>();
function systemPrompt(locale: 'es' | 'en'): string {
  let prompt = promptCache.get(locale);
  if (!prompt) promptCache.set(locale, (prompt = buildSystemPrompt(locale)));
  return prompt;
}

export function buildParams(
  model: string,
  locale: 'es' | 'en',
  messages: BetaMessageParam[],
  options: { allowTools: boolean } = { allowTools: true },
): StreamParams {
  return {
    model,
    max_tokens: MAX_TOKENS,
    output_config: { effort: 'low' },
    // On a safety decline the API retries on a fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: systemPrompt(locale), cache_control: { type: 'ephemeral' } }],
    tools: [submitLeadTool],
    // 'none' on the reserved last turn: the model must reply in text. (Forced choices are not
    // supported on this model; 'auto' and 'none' are.)
    tool_choice: { type: options.allowTools ? 'auto' : 'none' },
    messages,
  };
}

/** Maps any model/SDK failure to a code the visitor sees; details only go to the log. */
function failureKind(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return 'rate_limit';
  if (err instanceof Anthropic.APIConnectionError) return 'connection';
  if (err instanceof Anthropic.APIError) return `api_${err.status ?? 'unknown'}`;
  return 'unknown';
}

export async function runConversation(
  input: { model: string; locale: 'es' | 'en'; history: ChatMessage[]; privacyAccepted: boolean },
  deps: Deps,
  emit: (e: SseEvent) => void,
): Promise<void> {
  const messages: BetaMessageParam[] = input.history.map((m) => ({ role: m.role, content: m.content }));
  let leadSent = false;
  let textEmitted = false; // any text already sent to the visitor in this request

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const finalTurn = iteration === MAX_ITERATIONS - 1;
      const stream = deps.stream(buildParams(input.model, input.locale, messages, { allowTools: !finalTurn }));
      let firstDeltaOfTurn = true;
      stream.onText((delta) => {
        // A later turn's reply starts a new paragraph instead of running into the previous one.
        const prefix = firstDeltaOfTurn && textEmitted ? '\n\n' : '';
        firstDeltaOfTurn = false;
        textEmitted = true;
        emit({ event: 'text', data: { delta: prefix + delta } });
      });

      let message: BetaMessage;
      try {
        message = await stream.finalMessage();
      } catch (err) {
        deps.log({ event: 'model_error', kind: failureKind(err), iteration });
        emit({ event: 'error', data: { code: 'unavailable' } });
        return;
      }

      deps.log({
        event: 'model_turn',
        iteration,
        stop_reason: message.stop_reason,
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
      });

      if (message.stop_reason === 'refusal') {
        emit({ event: 'error', data: { code: 'refused' } });
        return;
      }
      if (message.stop_reason !== 'tool_use') return; // end_turn, max_tokens, …: the reply is complete
      if (finalTurn) return; // never execute a tool whose result no later turn could explain

      // Replay the full assistant turn (thinking blocks included, unchanged), then the tool results.
      messages.push({ role: 'assistant', content: message.content });
      const results: BetaToolResultBlockParam[] = [];
      for (const block of message.content) {
        if (block.type !== 'tool_use') continue;
        results.push(await handleToolUse(block, input, deps, leadSent, emit));
        if (results.at(-1)?.content === 'sent') leadSent = true;
      }
      messages.push({ role: 'user', content: results });
    }
  } finally {
    emit({ event: 'done', data: {} });
  }
}

async function handleToolUse(
  block: { id: string; name: string; input: unknown },
  input: { locale: 'es' | 'en'; history: ChatMessage[]; privacyAccepted: boolean },
  deps: Deps,
  leadSent: boolean,
  emit: (e: SseEvent) => void,
): Promise<BetaToolResultBlockParam> {
  const result = (content: string, isError = false): BetaToolResultBlockParam => ({
    type: 'tool_result',
    tool_use_id: block.id,
    content,
    ...(isError ? { is_error: true } : {}),
  });

  if (block.name !== SUBMIT_LEAD) return result(`Unknown tool "${block.name}".`, true);
  if (leadSent) return result('The request was already sent in this conversation; do not send it again.', true);

  // Consent is authorized by the visitor's own checkbox (sent by the widget), never by the model's say-so.
  if (!input.privacyAccepted) {
    return result(
      'Not sent: the visitor has not ticked the "accept the privacy notice" checkbox below the chat. Ask them to tick it and confirm again.',
      true,
    );
  }

  const validation = validateLead(block.input);
  if (!validation.ok) {
    deps.log({ event: 'lead_invalid', issues: validation.issues.length });
    return result(`Invalid lead, ask the visitor to correct it: ${validation.issues.join('; ')}`, true);
  }

  const email = formatLeadEmail(validation.lead, input.history, { locale: input.locale, sentAt: deps.now() });
  try {
    await deps.sendEmail(email);
  } catch (err) {
    deps.log(emailFailureLog(err, validation.lead));
    return result('Could not send the email. Apologize and give the visitor the phone number and the contact form.', true);
  }
  deps.log({ event: 'lead_sent' });
  emit({ event: 'lead_sent', data: { ok: true } });
  return result('sent');
}

/** Longest error message kept in the `email_failed` log. */
export const EMAIL_ERROR_MAX = 300;

export const REDACTED = '[redacted]';

/** Shortest stretch shared with a visitor value that is redacted; shorter values must match whole. */
export const MIN_SHARED = 6;

/** Characters of the raw error examined for redaction (bounds the work; only EMAIL_ERROR_MAX are logged). */
const REDACT_INPUT_MAX = 1000;

const isWordChar = (c: string | undefined) => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Compares characters ignoring case, and "_" and "+" as spaces (Q-encoding and form encoding). */
const fold = (c: string) => {
  const lower = c.toLowerCase();
  return lower === '_' || lower === '+' ? ' ' : lower;
};

/** Fewest digits shared with the visitor's phone for a number in the error to count as theirs. */
const MIN_PHONE_DIGITS = 7;

/** An RFC 2047 encoded word, e.g. =?UTF-8?Q?Juana_P=C3=A9rez?= or =?UTF-8?B?SnVhbmE=?=. */
const ENCODED_WORD = /=\?([^?\s]+)\?([QB])\?([^?\s]*)\?=/gi;

function qDecode(data: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const hex = data.slice(i + 1, i + 3);
    if (data[i] === '=' && /^[0-9a-f]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else if (data[i] === '_') {
      bytes.push(0x20);
    } else {
      bytes.push(...new TextEncoder().encode(data[i]));
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Decodes what an error may have copied from the email in encoded form: RFC 2047 encoded words
 * (adjacent ones joined, as the RFC says) and percent-encoding. Anything that can't be decoded
 * (unknown charset, broken base64 or UTF-8) is redacted outright: it can't be checked, so it isn't logged.
 */
function decodeEchoes(text: string): string {
  const words = text
    .replace(/(\?=)\s+(?==\?[^?\s]+\?[QB]\?)/gi, '$1')
    .replace(ENCODED_WORD, (_word, charset: string, encoding: string, data: string) => {
      try {
        const bytes = encoding.toUpperCase() === 'B' ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0)) : qDecode(data);
        return new TextDecoder(charset, { fatal: true, ignoreBOM: false }).decode(bytes);
      } catch {
        return REDACTED;
      }
    });
  return words.replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return REDACTED;
    }
  });
}

/** Length of the longest run of characters `a` and `b` share. */
function longestCommonRun(a: string, b: string): number {
  let best = 0;
  let previous = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const current = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) best = Math.max(best, (current[j] = previous[j - 1] + 1));
    }
    previous = current;
  }
  return best;
}

/**
 * Redacts a number in any format ("528711234567", "(871) 123-4567", "871.123.4567") that shares
 * MIN_PHONE_DIGITS+ consecutive digits with the visitor's phone, whatever format they typed it in.
 */
function redactPhone(text: string, phone: string | undefined): string {
  const target = (phone ?? '').replace(/\D/g, '');
  if (target.length < MIN_PHONE_DIGITS) return text;
  return text.replace(/[+(]*\d[\d\s().-]*\d/g, (run) =>
    longestCommonRun(run.replace(/\D/g, ''), target) >= MIN_PHONE_DIGITS ? REDACTED : run,
  );
}

/**
 * Marks in `mask` every stretch of `message` (case-insensitive, per character) that also appears in
 * `value` and starts at a word boundary in the message: an echo or quote starts at a word, while
 * "ender" inside "sender" is just a word the summary happens to share.
 *  - A value of MIN_SHARED+ characters: any such stretch of MIN_SHARED+ characters, which may end
 *    mid-word (a header or quote cut short).
 *  - A shorter value, down to one character: only the whole value, and only as a whole word, so a
 *    name like "Al" never turns "not allowed" into "not [redacted]lowed", nor a company "X" "Xenon".
 * Dynamic programming over common suffixes: for each message position, the longest shared stretch
 * ending there is trimmed to its first word start, and marked if it still qualifies.
 */
function markShared(message: string[], value: string[], mask: boolean[]): void {
  const wholeWordOnly = value.length < MIN_SHARED;
  const min = Math.min(MIN_SHARED, value.length);
  const a = message.map(fold);
  const b = value.map(fold);
  let previous = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const current = new Uint16Array(b.length + 1);
    let longest = 0;
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
        longest = Math.max(longest, current[j]);
      }
    }
    let start = i - longest;
    while (start < i && start > 0 && isWordChar(message[start - 1])) start++;
    while (start < i && message[start] === ' ') start++;
    const endsWord = !isWordChar(message[i]);
    if (i - start >= min && (endsWord || !wholeWordOnly)) mask.fill(true, start, i);
    previous = current;
  }
}

/**
 * Log entry for a failed send. Keeps Cloudflare's reason (e.g. "destination address not verified"),
 * but the binding received the visitor's Reply-To, name and summary, and its error may echo any of
 * them, whole or cut short (the subject caps the name at 150 characters; an error may quote part
 * of the body), and possibly encoded (=?UTF-8?Q?Juana_P=C3=A9rez?=, juana%40empresa.com). So
 * before logging, the message is decoded (decodeEchoes), single-lined, stripped of control
 * characters and NFC-normalized, like each visitor value, then redacted:
 *  1. every stretch of MIN_SHARED+ characters shared with a visitor value (a shorter value only
 *     as a whole word), ignoring case and treating "_" and "+" as spaces;
 *  2. every number sharing MIN_PHONE_DIGITS+ digits with the visitor's phone, in any format;
 *  3. every email address not on hercuit.com.
 * Capping comes last, so the cap can't cut a value short of being recognized.
 */
export function emailFailureLog(err: unknown, lead?: Lead): { event: 'email_failed'; kind: string; message: string } {
  if (!(err instanceof Error)) return { event: 'email_failed', kind: 'unknown', message: '' };
  // Bound the decoding work too; encoded text shrinks when decoded, so allow a few times more.
  const decoded = decodeEchoes(err.message.slice(0, REDACT_INPUT_MAX * 4));
  const chars = Array.from(headerSafe(decoded, Infinity).normalize('NFC')).slice(0, REDACT_INPUT_MAX);
  const mask = chars.map(() => false);
  for (const field of [lead?.summary, lead?.email, lead?.name, lead?.company, lead?.phone]) {
    const value = Array.from(headerSafe(field ?? '', Infinity).normalize('NFC'));
    // No length floor: company may be one character ("X"), and whole-word matching keeps that safe.
    if (value.length > 0) markShared(chars, value, mask);
  }
  const redacted = chars.map((c, i) => (!mask[i] ? c : mask[i - 1] ? '' : REDACTED)).join('');
  const message = redactPhone(redacted, lead?.phone).replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/gu, (address) =>
    /@hercuit\.com\.?$/i.test(address) ? address : REDACTED,
  );
  return { event: 'email_failed', kind: err.name, message: message.slice(0, EMAIL_ERROR_MAX) };
}

/** SSE wire format: one event per message, JSON data on a single line. */
export function formatSse(e: SseEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
}
