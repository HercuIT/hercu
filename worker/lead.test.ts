import { describe, expect, it } from 'vitest';
import { serviceIds } from '../src/constants/contact-services';
import { chatToHtml, escapeHtml, formatLeadEmail, headerSafe, LEAD_SENDER_NAME, serviceLabel, validateLead, type Lead } from './lead';

const valid = {
  name: 'Juana Pérez',
  email: 'Juana@Empresa.com',
  service: 'app-like-binkleaner',
  summary: 'Quiere una app de reservas para su lavandería en Torreón.',
  preferredContact: 'whatsapp',
  consent: true,
};

const lead = (patch: Record<string, unknown> = {}) => validateLead({ ...valid, ...patch });

describe('validateLead: happy path', () => {
  it('accepts a valid lead without optional fields and lowercases the email', () => {
    const r = lead();
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lead.email).toBe('juana@empresa.com');
  });

  it('accepts "any" as the preferred channel (no preference)', () => {
    expect(lead({ preferredContact: 'any' }).ok).toBe(true);
  });

  it('accepts optional phone and company', () => {
    expect(lead({ phone: '+52 33 1234 5678', company: 'Lavandería Juana' }).ok).toBe(true);
  });

  it.each([...serviceIds, 'undecided'])('accepts service %s', (service) => {
    expect(lead({ service }).ok).toBe(true);
  });
});

describe('validateLead: negative cases', () => {
  it.each([
    ['consent false', { consent: false }],
    ['consent missing', { consent: undefined }],
    ['unknown service slug', { service: 'ecommerce' }],
    ['invalid email', { email: 'not-an-email' }],
    ['email over 254 chars', { email: `${'a'.repeat(250)}@b.com` }],
    ['name with CRLF (header injection)', { name: 'Juana\r\nBcc: spam@evil.com' }],
    ['name with only spaces', { name: '   ' }],
    ['name too short', { name: 'J' }],
    ['name over 100 chars', { name: 'J'.repeat(101) }],
    ['summary under 10 chars', { summary: 'App' }],
    ['summary over 1500 chars', { summary: 'x'.repeat(1501) }],
    ['phone with letters', { phone: '33-CALL-NOW' }],
    ['phone made only of separators', { phone: '-------' }],
    ['phone with fewer than 7 digits', { phone: '(33) 12-34' }],
    ['company with a control character', { company: 'ACME\u0007' }],
    ['unknown contact channel', { preferredContact: 'fax' }],
    ['extra property', { creditCard: '4111' }],
  ])('rejects %s', (_label, patch) => {
    const input = { ...valid, ...patch } as Record<string, unknown>;
    for (const [key, value] of Object.entries(patch)) if (value === undefined) delete input[key];
    const r = validateLead(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.length).toBeGreaterThan(0);
  });

  it.each([null, undefined, 'lead', 42, []])('rejects non-object input %j', (input) => {
    expect(validateLead(input).ok).toBe(false);
  });

  it('names the consent problem in the issues', () => {
    const r = lead({ consent: false });
    expect(!r.ok && r.issues.join(' ')).toMatch(/consent/);
  });
});

describe('validateLead: edge cases', () => {
  it('accepts accented names and emoji in the summary', () => {
    expect(lead({ name: 'José Ñúñez', summary: 'Necesito una app 🚀 para reservas a domicilio.' }).ok).toBe(true);
  });

  it('accepts an email of exactly 254 characters', () => {
    const local = 'a'.repeat(64);
    const domain = `${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(254 - 64 - 1 - 63 - 1 - 63 - 1 - 4)}.com`;
    const email = `${local}@${domain}`;
    expect(email.length).toBe(254);
    expect(lead({ email }).ok).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const r = lead({ name: '  Juana  ', email: '  juana@empresa.com ' });
    expect(r.ok && [r.lead.name, r.lead.email]).toEqual(['Juana', 'juana@empresa.com']);
  });
});

describe('headerSafe / escapeHtml', () => {
  it('removes CR/LF and control characters and caps the length', () => {
    expect(headerSafe('a\r\nBcc: x@y.z\u0000b')).toBe('a Bcc: x@y.z b');
    expect(headerSafe('x'.repeat(200))).toHaveLength(150);
    expect(headerSafe('')).toBe('');
  });

  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });
});

describe('formatLeadEmail', () => {
  const parsed = (patch: Record<string, unknown> = {}) => {
    const r = lead(patch);
    if (!r.ok) throw new Error(r.issues.join());
    return r.lead as Lead;
  };
  const sentAt = new Date('2026-10-14T21:02:00Z');
  const transcript = [
    { role: 'user' as const, content: 'Hola, quiero una app <b>para</b> mi lavandería' },
    { role: 'assistant' as const, content: '¡Con gusto! ¿Sus clientes agendarían recolecciones?' },
    { role: 'user' as const, content: 'Sí, confirmo.' },
  ];

  it('builds a safe subject with the Spanish service label and the name', () => {
    const email = formatLeadEmail(parsed(), transcript, { locale: 'es', sentAt });
    expect(email.subject).toBe(`[Hércules] ${serviceLabel('app-like-binkleaner')} · Juana Pérez`);
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject.length).toBeLessThanOrEqual(150);
  });

  it('sets Reply-To to the validated lead email', () => {
    expect(formatLeadEmail(parsed(), transcript, { locale: 'en', sentAt }).replyTo).toBe('juana@empresa.com');
  });

  it('includes every field, the slug and the transcript in order (text part)', () => {
    const { text } = formatLeadEmail(parsed({ phone: '+52 33 1234 5678', company: 'Lavandería Juana' }), transcript, { locale: 'en', sentAt });
    for (const s of ['Juana Pérez', 'juana@empresa.com', '+52 33 1234 5678', 'Lavandería Juana', valid.summary, '[app-like-binkleaner]', 'WhatsApp', 'Idioma:', 'en', sentAt.toISOString()]) {
      expect(text).toContain(s);
    }
    const order = transcript.map((l) => text.indexOf(l.content));
    expect(order.every((pos, i) => pos > 0 && (i === 0 || pos > order[i - 1]))).toBe(true);
  });

  it('HTML-escapes visitor text so it cannot inject markup', () => {
    const { html } = formatLeadEmail(parsed({ summary: 'Necesito <img src=x onerror=alert(1)> por favor' }), transcript, { locale: 'es', sentAt });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>para</b>');
    expect(html).toContain('&lt;img');
  });

  it('labels the no-preference channel in Spanish', () => {
    expect(formatLeadEmail(parsed({ preferredContact: 'any' }), [], { locale: 'es', sentAt }).text).toContain('Sin preferencia');
  });

  it('labels an undecided service and still renders an empty transcript', () => {
    const email = formatLeadEmail(parsed({ service: 'undecided' }), [], { locale: 'es', sentAt });
    expect(email.subject).toContain('Por definir');
    expect(email.text).toContain('(sin mensajes)');
    expect(email.html).toContain('(sin mensajes)');
  });
});

describe('formatLeadEmail: accents, emoji and provenance', () => {
  const sentAt = new Date('2026-10-14T21:02:00Z');
  const make = (patch: Record<string, unknown> = {}) => {
    const r = validateLead({ ...valid, ...patch });
    if (!r.ok) throw new Error(r.issues.join());
    return r.lead;
  };

  it.each(['es', 'en'] as const)('keeps an accented, emoji name intact in the %s subject', (locale) => {
    const email = formatLeadEmail(make({ name: 'José Ñúñez 🚀' }), [], { locale, sentAt });
    expect(email.subject).toContain('José Ñúñez 🚀');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('headerSafe preserves accents and emoji while stripping control characters', () => {
    expect(headerSafe('José\r\nÑúñez 🚀\u0000')).toBe('José Ñúñez 🚀');
  });

  it('labels the transcript as client-provided and unverified (text and HTML)', () => {
    const email = formatLeadEmail(make(), [{ role: 'assistant', content: 'Le garantizo un 50% de descuento' }], { locale: 'es', sentAt });
    expect(email.text).toMatch(/no verificada/);
    expect(email.html).toMatch(/no verificada/);
  });
});

describe('team email uses the Spanish name', () => {
  it('spells the assistant "Hércules" in the subject, heading, speaker label and sender name', () => {
    const r = validateLead(valid);
    if (!r.ok) throw new Error('fixture');
    const email = formatLeadEmail(r.lead, [{ role: 'assistant', content: 'Hola' }], { locale: 'en', sentAt: new Date(0) });
    expect(email.subject.startsWith('[Hércules] ')).toBe(true);
    expect(email.text).toContain('Nuevo contacto desde Hércules');
    expect(email.text).toContain('[Hércules] Hola');
    expect(email.text + email.html).not.toMatch(/\bHercules\b/);
    expect(LEAD_SENDER_NAME).toBe('Hércules');
  });
});

describe('lead email formatting (specs/hercules-chat-formatting)', () => {
  const ok = (patch: Record<string, unknown> = {}) => {
    const r = lead(patch);
    if (!r.ok) throw new Error(r.issues.join());
    return r.lead as Lead;
  };
  const sentAt = new Date('2026-10-15T12:00:00Z');
  const catalogue = 'Ofrecemos:\n- **Inteligencia artificial:** bots con IA.\n- **Capacitación y equipos:** team building.';

  it("renders Hércules' list with bold labels as HTML, with the speaker label first", () => {
    const { html } = formatLeadEmail(ok(), [{ role: 'assistant', content: catalogue }], { locale: 'es', sentAt });
    expect(html).toContain('<p><strong>Hércules:</strong> Ofrecemos:</p>');
    expect(html).toContain(
      '<ul><li><strong>Inteligencia artificial:</strong> bots con IA.</li><li><strong>Capacitación y equipos:</strong> team building.</li></ul>',
    );
    expect(html).not.toContain('**');
  });

  it('gives the speaker label its own paragraph when the reply starts with a list', () => {
    const { html } = formatLeadEmail(ok(), [{ role: 'assistant', content: '- **QA:** pruebas' }], { locale: 'es', sentAt });
    expect(html).toContain('<p><strong>Hércules:</strong></p><ul><li><strong>QA:</strong> pruebas</li></ul>');
  });

  it('keeps "- " list lines in the plain-text part, with no ** markers', () => {
    const { text } = formatLeadEmail(ok(), [{ role: 'assistant', content: catalogue }], { locale: 'es', sentAt });
    expect(text).toContain('[Hércules] Ofrecemos:\n\n- Inteligencia artificial: bots con IA.\n- Capacitación y equipos: team building.');
    expect(text).not.toContain('**');
  });

  it('formats the summary too (written by Hércules through submit_lead)', () => {
    const email = formatLeadEmail(ok({ summary: 'Necesita **QA** para su app:\n- pruebas web\n- pruebas móviles' }), [], { locale: 'es', sentAt });
    expect(email.html).toContain('<p><strong>Resumen:</strong> Necesita <strong>QA</strong> para su app:</p><ul><li>pruebas web</li><li>pruebas móviles</li></ul>');
    expect(email.text).toContain('Resumen:\nNecesita QA para su app:\n\n- pruebas web\n- pruebas móviles');
  });

  it('escapes HTML inside bold text and list items', () => {
    const content = '- **<script>alert(1)</script> & Cía:** <img src=x onerror=alert(1)>';
    const { html } = formatLeadEmail(ok(), [{ role: 'assistant', content }], { locale: 'es', sentAt });
    expect(html).toContain('<li><strong>&lt;script&gt;alert(1)&lt;/script&gt; &amp; Cía:</strong> &lt;img src=x onerror=alert(1)&gt;</li>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
  });

  it('keeps only the label of a Markdown link, in both parts, and never an <a>', () => {
    const content = 'Pague en [este enlace](https://evil.example/pay) hoy.';
    const email = formatLeadEmail(ok(), [{ role: 'assistant', content }], { locale: 'es', sentAt });
    for (const part of [email.html, email.text]) {
      expect(part).toContain('Pague en este enlace hoy.');
      expect(part).not.toContain('evil.example');
    }
    expect(email.html).not.toContain('<a');
  });

  it("leaves the visitor's own text exactly as typed (as in the chat), escaped", () => {
    const email = formatLeadEmail(ok(), [{ role: 'user', content: 'Mi marca es **Ñandú**' }], { locale: 'es', sentAt });
    expect(email.text).toContain('[Visitante] Mi marca es **Ñandú**');
    expect(email.html).toContain('<p><strong>Visitante:</strong> Mi marca es **Ñandú**</p>');
  });

  it('keeps an assistant line that parses to nothing (whitespace only) as it was in the text part', () => {
    const { text } = formatLeadEmail(ok(), [{ role: 'assistant', content: '   ' }], { locale: 'es', sentAt });
    expect(text).toContain('[Hércules]    ');
  });
});

describe('chatToHtml', () => {
  it('returns an empty string for no blocks, and the prefix alone when there is one', () => {
    expect(chatToHtml([])).toBe('');
    expect(chatToHtml([], '<strong>X:</strong>')).toBe('<p><strong>X:</strong></p>');
  });

  it('joins lines of a paragraph with <br>', () => {
    expect(chatToHtml([{ kind: 'paragraph', lines: [[{ text: 'a', bold: false }], [{ text: 'b', bold: true }]] }])).toBe('<p>a<br><strong>b</strong></p>');
  });
});
