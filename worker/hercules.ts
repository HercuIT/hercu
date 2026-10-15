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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Log entry for a failed send. Keeps Cloudflare's reason (e.g. "destination address not verified"),
 * but the binding received the visitor's Reply-To, name and summary, and its error may echo any of
 * them. So the message is redacted before logging: every value the visitor gave (when the lead is
 * known), then every email address not on hercuit.com. It is also single-lined, stripped of control
 * characters and capped, in that order, so a cap can't cut a value in half before it's redacted.
 */
export function emailFailureLog(err: unknown, lead?: Lead): { event: 'email_failed'; kind: string; message: string } {
  if (!(err instanceof Error)) return { event: 'email_failed', kind: 'unknown', message: '' };
  let message = headerSafe(err.message, Infinity);
  const visitorValues = [lead?.summary, lead?.email, lead?.name, lead?.company, lead?.phone]
    .map((value) => headerSafe(value ?? '', Infinity))
    .filter((value) => value.length >= 2)
    .sort((a, b) => b.length - a.length);
  for (const value of visitorValues) {
    message = message.replace(new RegExp(escapeRegExp(value), 'giu'), REDACTED);
  }
  message = message.replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/gu, (address) =>
    /@hercuit\.com\.?$/i.test(address) ? address : REDACTED,
  );
  return { event: 'email_failed', kind: err.name, message: message.slice(0, EMAIL_ERROR_MAX) };
}

/** SSE wire format: one event per message, JSON data on a single line. */
export function formatSse(e: SseEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`;
}
