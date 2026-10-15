import { describe, expect, it } from 'vitest';
import { serviceIds } from '../src/constants/contact-services';
import { escapeHtml, formatLeadEmail, headerSafe, serviceLabel, validateLead, type Lead } from './lead';

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
    expect(email.subject).toBe(`[Hercules] ${serviceLabel('app-like-binkleaner')} · Juana Pérez`);
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject.length).toBeLessThanOrEqual(150);
  });

  it('sets Reply-To to the validated lead email', () => {
    expect(formatLeadEmail(parsed(), transcript, { locale: 'en', sentAt }).replyTo).toBe('juana@empresa.com');
  });

  it('includes every field, the slug and the transcript in order (text part)', () => {
    const { text } = formatLeadEmail(parsed({ phone: '+52 33 1234 5678' }), transcript, { locale: 'en', sentAt });
    for (const s of ['Juana Pérez', 'juana@empresa.com', '+52 33 1234 5678', '[app-like-binkleaner]', 'WhatsApp', 'Idioma:', 'en', sentAt.toISOString()]) {
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

  it('labels an undecided service and still renders an empty transcript', () => {
    const email = formatLeadEmail(parsed({ service: 'undecided' }), [], { locale: 'es', sentAt });
    expect(email.subject).toContain('Por definir');
    expect(email.text).toContain('(sin mensajes)');
    expect(email.html).toContain('(sin mensajes)');
  });
});
