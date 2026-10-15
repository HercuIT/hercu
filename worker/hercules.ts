// Conversation runner for Hercules (specs/hercules-assistant/01 §4). All I/O is injected (model stream,
// email, clock, logger), so the whole tool loop is unit-testable without network.
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from './guards';
import { formatLeadEmail, validateLead, type LeadEmail } from './lead';
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
    deps.log(emailFailureLog(err));
    return result('Could not send the email. Apologize and give the visitor the phone number and the contact form.', true);
  }
  deps.log({ event: 'lead_sent' });
  emit({ event: 'lead_sent', data: { ok: true } });
  return result('sent');
}

/**
 * Why a send failed, as a fixed category. Checked in order; the first match wins. The error text
 * itself is never logged: the binding received the visitor's Reply-To, name, summary and transcript,
 * and its error may echo any of them, in any encoding, so no redaction can be shown to be complete.
 */
const EMAIL_FAILURE_REASONS = [
  ['destination_not_verified', /\bnot\s+verified\b|\bunverified\b/i],
  ['not_allowed', /\bnot\s+allowed\b|\bforbidden\b|\bunauthori[sz]ed\b|\bpermission\b|\bdenied\b/i],
  ['rate_limited', /\brate[\s_-]*limit|\btoo\s+many\b|\bquota\b/i],
  ['timeout', /\btime[ds]?[\s_-]*out\b|\btimeout\b/i],
  ['invalid_message', /\binvalid\b|\bmalformed\b|\btoo\s+(large|long|big)\b/i],
] as const;

export type EmailFailureReason = (typeof EMAIL_FAILURE_REASONS)[number][0] | 'other';

/**
 * Log entry for a failed send: the error type, a fixed reason category and the message length.
 * Enough to tell "destination not verified" from a rate limit or an outage; for anything logged
 * as "other", reproduce the failure and read the error directly.
 */
export function emailFailureLog(err: unknown): { event: 'email_failed'; kind: string; reason: EmailFailureReason; length: number } {
  if (!(err instanceof Error)) return { event: 'email_failed', kind: 'unknown', reason: 'other', length: 0 };
  const reason = EMAIL_FAILURE_REASONS.find(([, pattern]) => pattern.test(err.message))?.[0] ?? 'other';
  // err.name is free text too; keep it only when it looks like an error class name.
  const kind = /^[A-Za-z]{1,40}$/.test(err.name) ? err.name : 'unknown';
  return { event: 'email_failed', kind, reason, length: err.message.length };
}

/** SSE wire format: one event per message, JSON data on a single line. */
export function formatSse(e: SseEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
}
