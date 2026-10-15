import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { buildParams, EMAIL_ERROR_MAX, emailFailureLog, formatSse, MAX_ITERATIONS, REDACTED, runConversation, type Deps, type SseEvent, type StreamParams } from './hercules';
import type { ChatMessage } from './guards';
import type { Lead, LeadEmail } from './lead';

type Block = Record<string, unknown>;
type Turn = { text?: string; content?: Block[]; stop_reason: string } | { text: string; throws: Error } | Error;

const validLead = {
  name: 'Juana Pérez',
  email: 'juana@empresa.com',
  service: 'qa-web-app',
  summary: 'Necesita pruebas automatizadas para su tienda web antes del lanzamiento.',
  preferredContact: 'email',
  consent: true,
};
const toolUse = (input: unknown, name = 'submit_lead', id = 'tu_1'): Block => ({ type: 'tool_use', id, name, input });

/** Content blocks of the last message sent on a given model call. */
const lastBlocks = (params: StreamParams): Block[] => params.messages.at(-1)!.content as unknown as Block[];

/** A fake model: each call to stream() plays the next scripted turn. */
function harness(turns: Turn[], opts: { emailFails?: boolean; privacyAccepted?: boolean; locale?: 'es' | 'en' } = {}) {
  const calls: StreamParams[] = [];
  const emails: LeadEmail[] = [];
  const events: SseEvent[] = [];
  const logs: Record<string, unknown>[] = [];
  let i = 0;
  const deps: Deps = {
    stream(params) {
      calls.push(structuredClone(params));
      const turn = turns[i++];
      return {
        onText(listener) {
          if (!(turn instanceof Error) && turn.text) for (const piece of turn.text.split(' ')) listener(`${piece} `);
        },
        async finalMessage() {
          if (turn instanceof Error) throw turn;
          if ('throws' in turn) throw turn.throws; // text was already streamed
          const content = turn.content ?? (turn.text ? [{ type: 'text', text: turn.text }] : []);
          return {
            id: `msg_${i}`,
            type: 'message',
            role: 'assistant',
            model: 'claude-opus-5-5',
            content,
            stop_reason: turn.stop_reason,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3 },
          } as unknown as Anthropic.Beta.Messages.BetaMessage;
        },
      };
    },
    sendEmail: vi.fn(async (email: LeadEmail) => {
      if (opts.emailFails) throw new Error('send failed');
      emails.push(email);
    }),
    now: () => new Date('2026-10-14T21:00:00Z'),
    log: (entry) => logs.push(entry),
  };
  const run = (history: ChatMessage[] = [{ role: 'user', content: 'Sí, confirmo y acepto el aviso.' }]) =>
    runConversation(
      { model: 'claude-opus-5-5', locale: opts.locale ?? 'es', history, privacyAccepted: opts.privacyAccepted ?? true },
      deps,
      (e) => events.push(e),
    );
  const kinds = () => events.map((e) => e.event);
  const text = () => events.flatMap((e) => (e.event === 'text' ? [e.data.delta] : [])).join('').trim();
  return { run, calls, emails, events, logs, kinds, text, deps };
}

describe('buildParams', () => {
  const params = buildParams('claude-opus-5-5', 'es', [{ role: 'user', content: 'hola' }]) as unknown as Record<string, any>;

  it('uses the configured model, low effort, fallbacks and auto tool choice', () => {
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.output_config).toEqual({ effort: 'low' });
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params.fallbacks).toBe('default');
    expect(params.tool_choice).toEqual({ type: 'auto' });
  });

  it('never disables thinking (Claude Opus 5.5 rejects that)', () => {
    expect(params.thinking).toBeUndefined();
  });

  it('caches the system prompt and exposes only submit_lead (strict, eager streaming)', () => {
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(params.tools.map((t: { name: string }) => t.name)).toEqual(['submit_lead']);
    expect(params.tools[0].strict).toBe(true);
    expect(params.tools[0].eager_input_streaming).toBe(true);
  });

  it('returns the identical system prompt object text for the same locale (cache stability)', () => {
    const again = buildParams('claude-opus-5-5', 'es', []) as unknown as Record<string, any>;
    expect(again.system[0].text).toBe(params.system[0].text);
  });
});

describe('runConversation: happy paths', () => {
  it('streams a text-only reply, then done', async () => {
    const h = harness([{ text: 'Con gusto le ayudo.', stop_reason: 'end_turn' }]);
    await h.run();
    expect(h.kinds()).toEqual(['text', 'text', 'text', 'text', 'done']);
    expect(h.text()).toBe('Con gusto le ayudo.');
    expect(h.calls).toHaveLength(1);
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
  });

  it('sends exactly one email for a valid lead, returns "sent" and streams the confirmation', async () => {
    const h = harness([
      { content: [{ type: 'thinking', thinking: '', signature: 'sig' }, toolUse(validLead)], stop_reason: 'tool_use' },
      { text: '¡Listo! El equipo le contactará pronto.', stop_reason: 'end_turn' },
    ]);
    await h.run();
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0].replyTo).toBe('juana@empresa.com');
    expect(h.kinds()).toContain('lead_sent');
    expect(h.kinds().at(-1)).toBe('done');
    const second = h.calls[1].messages;
    // The assistant turn is replayed unchanged (thinking block included), then the tool result.
    expect(second.at(-2)).toEqual({ role: 'assistant', content: [{ type: 'thinking', thinking: '', signature: 'sig' }, toolUse(validLead)] });
    expect(second.at(-1)).toEqual({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'sent' }] });
  });

  it('puts the conversation history into the email transcript', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Listo.', stop_reason: 'end_turn' }]);
    await h.run([
      { role: 'user', content: 'Necesito QA para mi tienda' },
      { role: 'assistant', content: '¿Me comparte su nombre y correo?' },
      { role: 'user', content: 'Juana, juana@empresa.com. Sí, acepto.' },
    ]);
    expect(h.emails[0].text).toContain('Necesito QA para mi tienda');
    expect(h.emails[0].text).toContain('Juana, juana@empresa.com. Sí, acepto.');
  });
});

describe('runConversation: negative cases (no email is sent)', () => {
  it.each([
    ['consent false', { ...validLead, consent: false }],
    ['an invalid email', { ...validLead, email: 'nope' }],
    ['an unknown service', { ...validLead, service: 'ecommerce' }],
    ['a header-injection name', { ...validLead, name: 'Juana\r\nBcc: x@y.z' }],
    ['a non-object input', 'submit everything'],
  ])('returns an is_error tool_result for %s', async (_label, input) => {
    const h = harness([{ content: [toolUse(input)], stop_reason: 'tool_use' }, { text: '¿Me confirma su correo?', stop_reason: 'end_turn' }]);
    await h.run();
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
    expect(h.kinds()).not.toContain('lead_sent');
    const result = lastBlocks(h.calls[1])[0];
    expect(result).toMatchObject({ type: 'tool_result', is_error: true });
  });

  it('rejects an unknown tool name', async () => {
    const h = harness([{ content: [toolUse(validLead, 'send_email_to_anyone')], stop_reason: 'tool_use' }, { text: 'ok', stop_reason: 'end_turn' }]);
    await h.run();
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
    expect(lastBlocks(h.calls[1])[0]).toMatchObject({ is_error: true, content: expect.stringMatching(/Unknown tool/) });
  });

  it('reports an email failure to the model instead of throwing, and emits no lead_sent', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Lo siento, llámenos.', stop_reason: 'end_turn' }], { emailFails: true });
    await h.run();
    expect(h.kinds()).not.toContain('lead_sent');
    expect(lastBlocks(h.calls[1])[0]).toMatchObject({ is_error: true, content: expect.stringMatching(/Could not send/) });
    expect(h.logs).toContainEqual({ event: 'email_failed', kind: 'Error', message: 'send failed' });
    // The reason is logged, the visitor's data is not.
    const logged = JSON.stringify(h.logs);
    expect(logged).not.toContain(validLead.name);
    expect(logged).not.toContain(validLead.email);
  });

  it('emits "refused" on a refusal and stops', async () => {
    const h = harness([{ stop_reason: 'refusal' }]);
    await h.run();
    expect(h.events).toContainEqual({ event: 'error', data: { code: 'refused' } });
    expect(h.calls).toHaveLength(1);
    expect(h.kinds().at(-1)).toBe('done');
  });

  it.each([
    ['a rate limit', new Anthropic.RateLimitError(429, undefined, 'slow down', new Headers())],
    ['a connection failure', new Anthropic.APIConnectionError({ message: 'offline' })],
    ['an unexpected error', new Error('boom')],
  ])('maps %s to "unavailable" without leaking details', async (_label, err) => {
    const h = harness([err as Error]);
    await h.run();
    expect(h.events).toEqual([{ event: 'error', data: { code: 'unavailable' } }, { event: 'done', data: {} }]);
    expect(JSON.stringify(h.events)).not.toMatch(/slow down|offline|boom/);
  });
});

describe('runConversation: edge cases', () => {
  it('ends gracefully on max_tokens', async () => {
    const h = harness([{ text: 'Respuesta cortada', stop_reason: 'max_tokens' }]);
    await h.run();
    expect(h.kinds().at(-1)).toBe('done');
    expect(h.calls).toHaveLength(1);
  });

  it(`stops after ${MAX_ITERATIONS} model calls even if the model keeps calling tools`, async () => {
    const turns: Turn[] = Array.from({ length: 5 }, () => ({ content: [toolUse({ consent: false })], stop_reason: 'tool_use' }));
    const h = harness(turns);
    await h.run();
    expect(h.calls).toHaveLength(MAX_ITERATIONS);
    expect(h.kinds().at(-1)).toBe('done');
  });

  it('never sends twice when the model repeats submit_lead in one turn', async () => {
    const h = harness([
      { content: [toolUse(validLead, 'submit_lead', 'a'), toolUse(validLead, 'submit_lead', 'b')], stop_reason: 'tool_use' },
      { text: 'Listo.', stop_reason: 'end_turn' },
    ]);
    await h.run();
    expect(h.emails).toHaveLength(1);
    const results = lastBlocks(h.calls[1]);
    expect(results).toHaveLength(2); // every tool_use gets a result, in one user message
    expect(results[1]).toMatchObject({ tool_use_id: 'b', is_error: true });
  });

  it('logs usage without any message content or personal data', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Listo.', stop_reason: 'end_turn' }]);
    await h.run();
    const logged = JSON.stringify(h.logs);
    expect(logged).toContain('cache_read_input_tokens');
    expect(logged).not.toMatch(/Juana|juana@empresa\.com|Sí, confirmo/);
  });
});

describe('formatSse', () => {
  it('writes one event per message with single-line JSON data', () => {
    expect(formatSse({ event: 'text', data: { delta: 'hola\nmundo' } })).toBe('event: text\ndata: {"delta":"hola\\nmundo"}\n\n');
  });
});

describe('runConversation: consent is the visitor\'s checkbox, not the model\'s claim', () => {
  it('refuses to send when the checkbox is not ticked, even if the model says consent: true', async () => {
    const h = harness(
      [{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Por favor marque la casilla.', stop_reason: 'end_turn' }],
      { privacyAccepted: false },
    );
    await h.run();
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
    expect(h.kinds()).not.toContain('lead_sent');
    expect(lastBlocks(h.calls[1])[0]).toMatchObject({ is_error: true, content: expect.stringMatching(/not ticked/) });
    expect(h.text()).toBe('Por favor marque la casilla.');
  });
});

describe('runConversation: reserved final turn', () => {
  const choice = (p: StreamParams) => (p as unknown as { tool_choice: { type: string } }).tool_choice.type;

  it('allows tools on early turns and forbids them on the last one', async () => {
    const turns: Turn[] = Array.from({ length: 5 }, () => ({ content: [toolUse({ consent: false })], stop_reason: 'tool_use' }));
    const h = harness(turns);
    await h.run();
    expect(h.calls.map(choice)).toEqual([...Array(MAX_ITERATIONS - 1).fill('auto'), 'none']);
  });

  it('explains a rejected submission that happens on the second tool round', async () => {
    const h = harness([
      { content: [toolUse({ ...validLead, email: 'bad' }, 'submit_lead', 'a')], stop_reason: 'tool_use' },
      { content: [toolUse({ ...validLead, email: 'still-bad' }, 'submit_lead', 'b')], stop_reason: 'tool_use' },
      { text: '¿Me confirma un correo válido?', stop_reason: 'end_turn' },
    ]);
    await h.run();
    expect(h.calls).toHaveLength(3);
    expect(h.text()).toBe('¿Me confirma un correo válido?');
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
  });

  it('never executes a tool call that arrives on the final turn', async () => {
    const h = harness([
      { content: [toolUse({ consent: false }, 'submit_lead', 'a')], stop_reason: 'tool_use' },
      { content: [toolUse({ consent: false }, 'submit_lead', 'b')], stop_reason: 'tool_use' },
      { content: [toolUse(validLead, 'submit_lead', 'c')], stop_reason: 'tool_use' },
    ]);
    await h.run();
    expect(h.deps.sendEmail).not.toHaveBeenCalled();
    expect(h.calls).toHaveLength(MAX_ITERATIONS);
  });
});

describe('runConversation: retry then success, and text across turns', () => {
  it('sends the email when a retry on the second round is valid, then confirms on the reserved turn', async () => {
    const h = harness([
      { content: [toolUse({ ...validLead, email: 'bad' }, 'submit_lead', 'a')], stop_reason: 'tool_use' },
      { content: [toolUse(validLead, 'submit_lead', 'b')], stop_reason: 'tool_use' },
      { text: '¡Listo! Le contactaremos pronto.', stop_reason: 'end_turn' },
    ]);
    await h.run();
    expect(h.emails).toHaveLength(1);
    expect(h.kinds()).toContain('lead_sent');
    expect(h.calls).toHaveLength(3);
    expect(h.text()).toBe('¡Listo! Le contactaremos pronto.');
    expect(h.kinds().at(-1)).toBe('done');
  });

  it('separates text from two different turns with a blank line', async () => {
    const h = harness([
      { content: [{ type: 'text', text: 'Un momento.' }, toolUse(validLead)], text: 'Un momento.', stop_reason: 'tool_use' },
      { text: 'Listo.', stop_reason: 'end_turn' },
    ]);
    await h.run();
    const deltas = h.events.flatMap((e) => (e.event === 'text' ? [e.data.delta] : []));
    expect(deltas.join('')).toBe('Un momento. \n\nListo. ');
  });

  it('adds no separator before the first text of the response', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Listo.', stop_reason: 'end_turn' }]);
    await h.run();
    const first = h.events.find((e) => e.event === 'text');
    expect(first && first.event === 'text' && first.data.delta.startsWith('\n')).toBe(false);
  });
});

describe('runConversation: model failure mid-stream', () => {
  it('emits text, then error: unavailable, then done when finalMessage() rejects after streaming', async () => {
    const h = harness([{ text: 'Con gusto, su presupuesto', throws: new Error('stream reset') }]);
    await h.run();
    expect(h.kinds()).toEqual(['text', 'text', 'text', 'text', 'error', 'done']);
    expect(h.events).toContainEqual({ event: 'error', data: { code: 'unavailable' } });
    expect(h.logs.some((l) => l.event === 'model_error')).toBe(true);
  });

  it('emits only error: unavailable and done when it rejects before any text', async () => {
    const h = harness([new Error('connection refused')]);
    await h.run();
    expect(h.kinds()).toEqual(['error', 'done']);
  });

  it('keeps lead_sent when the confirmation turn fails after the email went out', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, new Error('overloaded')]);
    await h.run();
    expect(h.emails).toHaveLength(1);
    expect(h.kinds()).toEqual(['lead_sent', 'error', 'done']);
  });
});

describe('runConversation: English locale', () => {
  it('runs the same lead flow for an English conversation, recording the locale in the email', async () => {
    const h = harness(
      [{ content: [toolUse({ ...validLead, name: 'José Ñúñez 🚀' })], stop_reason: 'tool_use' }, { text: 'Done! We will contact you soon.', stop_reason: 'end_turn' }],
      { locale: 'en' },
    );
    await h.run([{ role: 'user', content: 'Yes, I confirm and accept the notice.' }]);
    expect(h.emails).toHaveLength(1);
    expect(h.emails[0].text).toMatch(/Idioma:\s+en/);
    expect(h.emails[0].subject).toContain('José Ñúñez 🚀');
    expect(h.text()).toBe('Done! We will contact you soon.');
    expect((h.calls[0] as unknown as { system: { text: string }[] }).system[0].text).toMatch(/Never invent prices/);
  });
});

describe('emailFailureLog', () => {
  it("keeps Cloudflare's reason and the error type", () => {
    expect(emailFailureLog(new Error('destination address not verified'))).toEqual({
      event: 'email_failed',
      kind: 'Error',
      message: 'destination address not verified',
    });
  });

  it('keeps the name of an Error subclass', () => {
    expect(emailFailureLog(new TypeError('bad sender')).kind).toBe('TypeError');
  });

  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
    ['a plain object', { message: 'not an Error' }],
  ])('logs "unknown" with no message for a thrown non-Error (%s)', (_label, thrown) => {
    expect(emailFailureLog(thrown)).toEqual({ event: 'email_failed', kind: 'unknown', message: '' });
  });

  it('logs an empty message as empty', () => {
    expect(emailFailureLog(new Error('')).message).toBe('');
  });

  it(`caps the message at ${EMAIL_ERROR_MAX} characters`, () => {
    expect(emailFailureLog(new Error('x'.repeat(5000))).message).toHaveLength(EMAIL_ERROR_MAX);
    expect(emailFailureLog(new Error('x'.repeat(EMAIL_ERROR_MAX))).message).toHaveLength(EMAIL_ERROR_MAX);
  });

  it('flattens newlines and strips control characters so one failure is one log line', () => {
    expect(emailFailureLog(new Error('line one\r\nline two\u0000\u001b[31m')).message).toBe('line one line two [31m');
  });

  it('keeps accents and emoji', () => {
    expect(emailFailureLog(new Error('Dirección no verificada: info@hercuit.com 🚫')).message).toBe(
      'Dirección no verificada: info@hercuit.com 🚫',
    );
  });
});

describe('emailFailureLog redacts visitor data from the error message', () => {
  const lead = {
    name: 'Juana Pérez',
    email: 'juana@empresa.com',
    phone: '+52 871 123 4567',
    company: 'Ñandú & Cía 🚀',
    service: 'ai-bot',
    summary: 'Necesitamos un bot para atender pedidos por WhatsApp.',
    preferredContact: 'email',
    consent: true,
  } as unknown as Lead;
  const log = (message: string, withLead: Lead | undefined = lead) => emailFailureLog(new Error(message), withLead).message;

  it("redacts the visitor's Reply-To address (the reported case)", () => {
    expect(log('invalid Reply-To: juana@empresa.com')).toBe(`invalid Reply-To: ${REDACTED}`);
  });

  it('redacts the address even without the lead, and in angle brackets or with a display name', () => {
    expect(log('invalid Reply-To: juana@empresa.com', undefined)).toBe(`invalid Reply-To: ${REDACTED}`);
    expect(log('bad header: "Ana" <ana.lopez+web@sub.example.mx>', undefined)).toBe(`bad header: "Ana" <${REDACTED}>`);
  });

  it.each([
    ['name', 'Juana Pérez'],
    ['name in another case', 'JUANA PÉREZ'],
    ['phone', '+52 871 123 4567'],
    ['company with ñ, & and emoji', 'Ñandú & Cía 🚀'],
    ['summary', 'Necesitamos un bot para atender pedidos por WhatsApp.'],
  ])("redacts the visitor's %s", (_label, value) => {
    const message = log(`rejected value: ${value}; retry later`);
    expect(message).toBe(`rejected value: ${REDACTED}; retry later`);
  });

  it('redacts a value that the error split across lines', () => {
    expect(log('subject rejected: [Hércules] Bot · Juana\r\nPérez')).toBe(`subject rejected: [Hércules] Bot · ${REDACTED}`);
  });

  it('redacts before capping, so a value near the cap cannot leak in part', () => {
    const message = log(`${'x'.repeat(EMAIL_ERROR_MAX - 5)} juana@empresa.com`);
    expect(message).toHaveLength(EMAIL_ERROR_MAX);
    expect(message).not.toContain('juana');
  });

  it("keeps hercuit.com addresses and Cloudflare's own wording", () => {
    expect(log('sender info@hercuit.com is not allowed')).toBe('sender info@hercuit.com is not allowed');
    expect(log('destination address not verified')).toBe('destination address not verified');
  });

  it('redacts every other address, including the Gmail destination', () => {
    expect(log('destination hercuitmx@gmail.com not verified')).toBe(`destination ${REDACTED} not verified`);
  });

  it('does not let a look-alike domain through', () => {
    expect(log('from info@hercuit.com.evil.io')).toBe(`from ${REDACTED}`);
  });

  it('ignores blank and one-character optional fields instead of redacting every letter', () => {
    const sparse = { ...lead, company: ' ', phone: undefined, name: 'Jo' } as unknown as Lead;
    expect(log('a b c Jo', sparse)).toBe(`a b c ${REDACTED}`);
  });

  it('treats regex characters in visitor values literally', () => {
    const tricky = { ...lead, company: 'A.B (C) [x]*' } as unknown as Lead;
    expect(log('bad company A.B (C) [x]* and AxB C x', tricky)).toBe(`bad company ${REDACTED} and AxB C x`);
  });

  it('returns an empty message unchanged', () => {
    expect(log('')).toBe('');
  });
});

describe('runConversation logs no visitor data when the email binding echoes it', () => {
  it('redacts the Reply-To and name from email_failed', async () => {
    const h = harness([{ content: [toolUse(validLead)], stop_reason: 'tool_use' }, { text: 'Lo siento.', stop_reason: 'end_turn' }]);
    h.deps.sendEmail = vi.fn(async () => {
      throw new Error(`invalid Reply-To: ${validLead.email} (${validLead.name})`);
    });
    await h.run();
    const logged = JSON.stringify(h.logs);
    expect(logged).toContain('email_failed');
    expect(logged).toContain('invalid Reply-To');
    expect(logged).not.toContain(validLead.email);
    expect(logged).not.toContain(validLead.name);
  });
});
