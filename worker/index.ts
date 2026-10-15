// Worker entry: POST /api/hercules runs the assistant; everything else is the static site.
// `run_worker_first: ["/api/*"]` in wrangler.jsonc means static pages never reach this code.
import Anthropic from '@anthropic-ai/sdk';
import { checkRequestShape, GuardError, parseHostnames, readHerculesBody, TURNSTILE_ACTION, verifyTurnstile } from './guards';
import { formatSse, runConversation, type ModelStream, type SseEvent, type StreamParams } from './hercules';
import { LEAD_SENDER_NAME, type LeadEmail } from './lead';

export interface Env {
  ASSETS: Fetcher;
  // Account-level Cloudflare Secrets Store bindings (wrangler.jsonc → secrets_store_secrets): read with await .get().
  ANTHROPIC_API_KEY: SecretsStoreSecret;
  TURNSTILE_SECRET: SecretsStoreSecret;
  /** Comma-separated hostnames the widget may run on (production must not include localhost). */
  TURNSTILE_HOSTNAMES: string;
  HERCULES_MODEL: string;
  LEAD_FROM: string;
  LEAD_TO: string;
  LEADS_EMAIL: SendEmail;
  CHAT_LIMITER: RateLimit;
}

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

/** A complete SSE response for errors that happen before the conversation starts. */
function sseError(code: 'invalid_request' | 'rate_limited' | 'unavailable', status: number): Response {
  const body = `event: error\ndata: ${JSON.stringify({ code })}\n\nevent: done\ndata: {}\n\n`;
  return new Response(body, { status, headers: SSE_HEADERS });
}

function log(entry: Record<string, unknown>): void {
  // Never message content or personal data: only events, counts and codes.
  console.log(JSON.stringify({ app: 'hercules', ...entry }));
}

async function handleHercules(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP');

  let parsed;
  try {
    // Origin/method/type first: rejected cross-site requests must not consume the visitor's quota.
    checkRequestShape(request);
    const { success } = await env.CHAT_LIMITER.limit({ key: ip ?? 'unknown' });
    if (!success) return sseError('rate_limited', 429);
    parsed = await readHerculesBody(request);
  } catch (err) {
    if (err instanceof GuardError) {
      log({ event: 'rejected', reason: err.message });
      return sseError(err.code, err.status);
    }
    throw err;
  }

  // Fail closed if a secret is missing or the store is unreachable; never log the values.
  let turnstileSecret: string;
  let apiKey: string;
  try {
    [turnstileSecret, apiKey] = await Promise.all([env.TURNSTILE_SECRET.get(), env.ANTHROPIC_API_KEY.get()]);
  } catch {
    log({ event: 'secret_unavailable' });
    return sseError('unavailable', 503);
  }

  const expected = { action: TURNSTILE_ACTION, hostnames: parseHostnames(env.TURNSTILE_HOSTNAMES) };
  if (!(await verifyTurnstile(parsed.turnstileToken, turnstileSecret, ip, expected))) {
    log({ event: 'rejected', reason: 'turnstile' });
    return sseError('invalid_request', 403);
  }

  const client = new Anthropic({ apiKey });
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const emit = (e: SseEvent) => void writer.write(encoder.encode(formatSse(e))).catch(() => {});

  const stream = (params: StreamParams): ModelStream => {
    const s = client.beta.messages.stream(params);
    return { onText: (listener) => void s.on('text', listener), finalMessage: () => s.finalMessage() };
  };

  const sendEmail = async (email: LeadEmail) => {
    await env.LEADS_EMAIL.send({
      from: { name: LEAD_SENDER_NAME, email: env.LEAD_FROM },
      to: env.LEAD_TO,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  };

  ctx.waitUntil(
    runConversation(
      { model: env.HERCULES_MODEL, locale: parsed.locale, history: parsed.messages, privacyAccepted: parsed.privacyAccepted },
      { stream, sendEmail, now: () => new Date(), log },
      emit,
    )
      .catch((err) => log({ event: 'crash', kind: err instanceof Error ? err.name : 'unknown' }))
      .finally(() => writer.close().catch(() => {})),
  );

  return new Response(readable, { headers: SSE_HEADERS });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/hercules') return handleHercules(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
