import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { buildParams, formatSse, MAX_ITERATIONS, runConversation, type Deps, type SseEvent, type StreamParams } from './hercules';
import type { ChatMessage } from './guards';
import type { LeadEmail } from './lead';

type Block = Record<string, unknown>;
type Turn = { text?: string; content?: Block[]; stop_reason: string } | Error;

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
function harness(turns: Turn[], opts: { emailFails?: boolean; privacyAccepted?: boolean } = {}) {
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
      { model: 'claude-opus-5-5', locale: 'es', history, privacyAccepted: opts.privacyAccepted ?? true },
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
    expect(h.logs.some((l) => l.event === 'email_failed')).toBe(true);
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
