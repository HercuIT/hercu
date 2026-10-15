// Worker entry: POST /api/hercules runs the assistant; everything else is the static site.
// `run_worker_first: ["/api/*"]` in wrangler.jsonc means static pages never reach this code.
import Anthropic from '@anthropic-ai/sdk';
import { GuardError, parseHerculesRequest, verifyTurnstile } from './guards';
import { formatSse, runConversation, type ModelStream, type SseEvent, type StreamParams } from './hercules';
import type { LeadEmail } from './lead';

export interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  TURNSTILE_SECRET: string;
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
function sseError(code: 'invalid_request' | 'rate_limited', status: number): Response {
  const body = `event: error\ndata: ${JSON.stringify({ code })}\n\nevent: done\ndata: {}\n\n`;
  return new Response(body, { status, headers: SSE_HEADERS });
}

function log(entry: Record<string, unknown>): void {
  // Never message content or personal data: only events, counts and codes.
  console.log(JSON.stringify({ app: 'hercules', ...entry }));
}

async function handleHercules(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP');

  const { success } = await env.CHAT_LIMITER.limit({ key: ip ?? 'unknown' });
  if (!success) return sseError('rate_limited', 429);

  let parsed;
  try {
    parsed = await parseHerculesRequest(request);
  } catch (err) {
    if (err instanceof GuardError) {
      log({ event: 'rejected', reason: err.message });
      return sseError(err.code, err.status);
    }
    throw err;
  }

  if (!(await verifyTurnstile(parsed.turnstileToken, env.TURNSTILE_SECRET, ip))) {
    log({ event: 'rejected', reason: 'turnstile' });
    return sseError('invalid_request', 403);
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
      from: { name: 'Hercules', email: env.LEAD_FROM },
      to: env.LEAD_TO,
      replyTo: email.replyTo,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  };

  ctx.waitUntil(
    runConversation(
      { model: env.HERCULES_MODEL, locale: parsed.locale, history: parsed.messages },
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
