// HTTP-level tests for the Worker entry (worker/index.ts) with every binding and outbound call stubbed.
import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import worker, { handleHercules, type Env, type HandlerDeps } from './index';
import { TURNSTILE_ACTION } from './guards';
import type { ModelStream, StreamParams } from './hercules';

const ORIGIN = 'https://hercuit.com';

type Turn = { text?: string; stop_reason: string; content?: unknown[] };

function setup(opts: {
  rateLimited?: boolean;
  secretFails?: boolean;
  apiKeyFails?: boolean;
  turnstile?: Record<string, unknown> | 'network-error';
  turns?: Turn[];
} = {}) {
  const pending: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void pending.push(p), passThroughOnException() {} } as unknown as ExecutionContext;
  const limiter = vi.fn(async () => ({ success: !opts.rateLimited }));
  const assets = vi.fn(async () => new Response('static page'));
  const secret = (value: string, fails = false) => ({ get: vi.fn(async () => (fails ? Promise.reject(new Error('missing')) : value)) });
  const apiKeySecret = secret('sk-test', opts.apiKeyFails);
  const turnstileSecret = secret('ts-secret', opts.secretFails);
  const send = vi.fn(async (_msg?: unknown) => ({}));
  const env = {
    ASSETS: { fetch: assets },
    ANTHROPIC_API_KEY: apiKeySecret,
    TURNSTILE_SECRET: turnstileSecret,
    TURNSTILE_HOSTNAMES: 'hercuit.com',
    HERCULES_MODEL: 'claude-opus-5-5',
    LEAD_FROM: 'hercules@hercuit.com',
    LEAD_TO: 'info@hercuit.com',
    LEADS_EMAIL: { send },
    CHAT_LIMITER: { limit: limiter },
  } as unknown as Env;

  const turnstileFetch = vi.fn(async () => {
    if (opts.turnstile === 'network-error') throw new Error('offline');
    return new Response(JSON.stringify(opts.turnstile ?? { success: true, action: TURNSTILE_ACTION, hostname: 'hercuit.com' }));
  });
  const turns = [...(opts.turns ?? [{ text: 'Con gusto.', stop_reason: 'end_turn' }])];
  const streamCalls: StreamParams[] = [];
  const apiKeys: string[] = [];
  const deps: HandlerDeps = {
    fetch: turnstileFetch as unknown as typeof fetch,
    makeStream(apiKey) {
      apiKeys.push(apiKey);
      return (params): ModelStream => {
        streamCalls.push(params);
        const turn = turns.shift()!;
        return {
          onText: (listener) => turn.text && listener(turn.text),
          finalMessage: async () =>
            ({
              content: turn.content ?? [{ type: 'text', text: turn.text ?? '' }],
              stop_reason: turn.stop_reason,
              usage: { input_tokens: 1, output_tokens: 1 },
            }) as unknown as Anthropic.Beta.Messages.BetaMessage,
        };
      };
    },
  };

  const post = (body: unknown = { locale: 'es', turnstileToken: 'tok', privacyAccepted: false, messages: [{ role: 'user', content: 'Hola' }] }, headers: Record<string, string> = {}) =>
    new Request(`${ORIGIN}/api/hercules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'CF-Connecting-IP': '1.2.3.4', ...headers },
      body: JSON.stringify(body),
    });

  /** Runs the handler and returns status + full SSE body (after the background work finishes). */
  const call = async (request = post()) => {
    const res = await handleHercules(request, env, ctx, deps);
    const [body] = await Promise.all([res.text(), ...pending]);
    return { status: res.status, type: res.headers.get('Content-Type'), body };
  };
  return { env, ctx, deps, call, post, limiter, assets, send, turnstileFetch, streamCalls, apiKeys, apiKeySecret };
}

describe('default export routing', () => {
  it('serves every non-API path from ASSETS without touching the assistant', async () => {
    const s = setup();
    const res = await worker.fetch(new Request(`${ORIGIN}/en/`), s.env, s.ctx);
    expect(await res.text()).toBe('static page');
    expect(s.assets).toHaveBeenCalledOnce();
    expect(s.limiter).not.toHaveBeenCalled();
  });

  it('does not serve /api/hercules from ASSETS', async () => {
    const s = setup();
    const res = await worker.fetch(new Request(`${ORIGIN}/api/hercules`), s.env, s.ctx); // GET, no Origin
    expect(res.status).toBe(405);
    expect(s.assets).not.toHaveBeenCalled();
  });
});

describe('handleHercules', () => {
  it('streams the reply as SSE and ends with done (happy path)', async () => {
    const s = setup();
    const r = await s.call();
    expect(r.status).toBe(200);
    expect(r.type).toMatch(/text\/event-stream/);
    expect(r.body).toContain('event: text\ndata: {"delta":"Con gusto."}');
    expect(r.body.trimEnd().endsWith('event: done\ndata: {}')).toBe(true);
    expect(s.apiKeys).toEqual(['sk-test']); // the key came from the Secrets Store binding
  });

  it('returns 429 rate_limited when the limiter denies, without calling Turnstile or the model', async () => {
    const s = setup({ rateLimited: true });
    const r = await s.call();
    expect(r.status).toBe(429);
    expect(r.body).toContain('"code":"rate_limited"');
    expect(s.turnstileFetch).not.toHaveBeenCalled();
    expect(s.streamCalls).toHaveLength(0);
  });

  it('rejects a cross-origin request before it can consume the rate limit', async () => {
    const s = setup();
    const r = await s.call(s.post(undefined, { Origin: 'https://evil.example' }));
    expect(r.status).toBe(403);
    expect(s.limiter).not.toHaveBeenCalled();
  });

  it('returns 503 unavailable when the Turnstile secret cannot be read, before calling siteverify', async () => {
    const s = setup({ secretFails: true });
    const r = await s.call();
    expect(r.status).toBe(503);
    expect(r.body).toContain('"code":"unavailable"');
    expect(s.turnstileFetch).not.toHaveBeenCalled();
    expect(s.streamCalls).toHaveLength(0);
  });

  it('returns 503 unavailable when the Anthropic key cannot be read after Turnstile passes', async () => {
    const s = setup({ apiKeyFails: true });
    const r = await s.call();
    expect(r.status).toBe(503);
    expect(r.body).toContain('"code":"unavailable"');
    expect(s.turnstileFetch).toHaveBeenCalledOnce();
    expect(s.streamCalls).toHaveLength(0);
  });

  it('never reads the Anthropic key for a request that fails Turnstile', async () => {
    const s = setup({ turnstile: { success: false, action: TURNSTILE_ACTION, hostname: 'hercuit.com' } });
    const r = await s.call();
    expect(r.status).toBe(403);
    expect(s.apiKeySecret.get).not.toHaveBeenCalled();
  });

  it.each([
    ['a failed challenge', { success: false, action: TURNSTILE_ACTION, hostname: 'hercuit.com' }],
    ['the wrong action', { success: true, action: 'other', hostname: 'hercuit.com' }],
    ['a foreign hostname', { success: true, action: TURNSTILE_ACTION, hostname: 'evil.example' }],
    ['a siteverify network error', 'network-error' as const],
  ])('returns 403 when Turnstile verification fails: %s', async (_label, turnstile) => {
    const s = setup({ turnstile });
    const r = await s.call();
    expect(r.status).toBe(403);
    expect(r.body).toContain('"code":"invalid_request"');
    expect(s.streamCalls).toHaveLength(0);
  });

  it('returns 400 for an invalid body after passing the shape and rate checks', async () => {
    const s = setup();
    const r = await s.call(s.post({ locale: 'fr', turnstileToken: 'tok', privacyAccepted: false, messages: [] }));
    expect(r.status).toBe(400);
    expect(s.limiter).toHaveBeenCalledOnce();
  });

  it('sends the lead email through the pinned binding with Reply-To set to the visitor', async () => {
    const lead = {
      name: 'Juana Pérez',
      email: 'juana@empresa.com',
      service: 'qa-web-app',
      summary: 'Pruebas automatizadas para su tienda en línea.',
      preferredContact: 'any',
      consent: true,
    };
    const s = setup({
      turns: [
        { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'submit_lead', input: lead }] },
        { text: 'Listo.', stop_reason: 'end_turn' },
      ],
    });
    const r = await s.call(s.post({ locale: 'es', turnstileToken: 'tok', privacyAccepted: true, messages: [{ role: 'user', content: 'Sí, confirmo.' }] }));
    expect(r.body).toContain('event: lead_sent');
    expect(s.send).toHaveBeenCalledOnce();
    expect(s.send.mock.calls[0][0]).toMatchObject({
      to: 'info@hercuit.com',
      replyTo: 'juana@empresa.com',
      from: { name: 'Hercules', email: 'hercules@hercuit.com' },
    });
  });
});
