import { describe, expect, it } from 'vitest';
import { shared, strings } from './strings';
import { whatsappAriaLabel, whatsappHref } from './whatsapp';

const NUMBER = '+523317133469';
const textParam = (href: string) => new URL(href).searchParams.get('text');
const digitsOf = (value: string) => value.replace(/\D/g, '');

describe('whatsappHref', () => {
  it('builds a wa.me link from the digits, without the "+"', () => {
    expect(whatsappHref(NUMBER)).toBe('https://wa.me/523317133469');
  });

  it.each(['es', 'en'] as const)('adds the "%s" pre-filled message, encoded, and it decodes back exactly', (locale) => {
    const message = strings[locale].contact.whatsappMessage;
    const href = whatsappHref(NUMBER, message);
    expect(href).toBe(`https://wa.me/523317133469?text=${encodeURIComponent(message)}`);
    expect(textParam(href)).toBe(message);
  });

  it.each([
    ['empty', ''],
    ['without the "+"', '523317133469'],
    ['with spaces', '+52 33 1713 3469'],
    ['with dashes', '+52-33-1713-3469'],
    ['with letters', '+52abc'],
    ['only "+"', '+'],
    ['7 digits', '+1234567'],
    ['16 digits', '+1234567890123456'],
    ['a tel: link', 'tel:+523317133469'],
  ])('throws for a number %s', (_label, value) => {
    expect(() => whatsappHref(value)).toThrow(/E\.164/);
  });

  it.each([8, 15])('accepts exactly %i digits (E.164 bounds)', (n) => {
    expect(whatsappHref(`+${'1'.repeat(n)}`)).toBe(`https://wa.me/${'1'.repeat(n)}`);
  });

  it.each([
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace only', '  \n '],
  ])('adds no ?text= for a %s message', (_label, message) => {
    expect(whatsappHref(NUMBER, message)).toBe('https://wa.me/523317133469');
  });

  it('round-trips accents, ñ and emoji unchanged', () => {
    const message = '¿Qué tal? Señal 🚀 Hércules';
    expect(textParam(whatsappHref(NUMBER, message))).toBe(message);
  });

  it('encodes &, ?, #, +, % and newlines so they cannot break the URL', () => {
    const message = 'a&b?c#d+e%f\ng';
    const href = whatsappHref(NUMBER, message);
    expect(href.split('?')).toHaveLength(2);
    expect(href).not.toContain('#');
    expect(href).not.toContain('\n');
    expect(textParam(href)).toBe(message);
  });

  it('encodes a very long message without truncating it', () => {
    const message = 'ñ'.repeat(2000);
    expect(textParam(whatsappHref(NUMBER, message))).toBe(message);
  });
});

describe('phone data consistency', () => {
  it('uses the same digits for the displayed number, the tel: link and the E.164 number', () => {
    expect(digitsOf(shared.phone.display)).toBe(digitsOf(shared.phone.e164));
    expect(shared.phone.href).toBe(`tel:${shared.phone.e164}`);
  });

  it('builds a valid WhatsApp link from the shared number', () => {
    expect(whatsappHref(shared.phone.e164)).toBe('https://wa.me/523317133469');
  });
});

describe.each(['es', 'en'] as const)('WhatsApp copy for "%s"', (locale) => {
  const c = strings[locale].contact;

  it('has non-blank label, call to action, aria text and message', () => {
    for (const text of [c.whatsappLabel, c.whatsappCta, c.whatsappAria.prefix, c.whatsappAria.suffix, c.whatsappMessage]) {
      expect(text.trim()).not.toBe('');
    }
  });

  it('keeps the "WhatsApp" brand name untranslated', () => {
    expect(c.whatsappLabel).toBe('WhatsApp');
    expect(c.whatsappCta).toContain('WhatsApp');
    expect(c.whatsappAria.prefix).toContain('WhatsApp');
  });

  it('says in the aria text that the link opens a new tab', () => {
    expect(c.whatsappAria.suffix).toMatch(locale === 'es' ? /pestaña nueva/ : /new tab/);
  });

  it('names HércuIT, with its accent, in the pre-filled message', () => {
    expect(c.whatsappMessage).toContain('HércuIT');
  });
});

describe('Spanish WhatsApp copy', () => {
  it('uses the formal "usted" imperative', () => {
    expect(strings.es.contact.whatsappCta).toBe('Escríbanos por WhatsApp');
    expect(strings.es.contact.whatsappAria.prefix).toMatch(/^Escríbanos /);
  });
});

describe('whatsappAriaLabel', () => {
  it.each([
    ['es', 'Escríbanos por WhatsApp al +52 33 1713 3469 (se abre en una pestaña nueva)'],
    ['en', 'Message us on WhatsApp at +52 33 1713 3469 (opens in a new tab)'],
  ] as const)('builds the full "%s" label from the dictionary and the shared number', (locale, expected) => {
    expect(whatsappAriaLabel(strings[locale].contact.whatsappAria, shared.phone.display)).toBe(expected);
  });

  it('puts exactly one space between parts and none at the ends', () => {
    expect(whatsappAriaLabel({ prefix: '  Chat at ', suffix: ' (new tab)  ' }, ' +1 555 0100 ')).toBe('Chat at +1 555 0100 (new tab)');
  });

  it.each([
    ['a blank suffix', { prefix: 'Chat at', suffix: '  ' }, '+1 555 0100', 'Chat at +1 555 0100'],
    ['an empty prefix', { prefix: '', suffix: '(new tab)' }, '+1 555 0100', '+1 555 0100 (new tab)'],
    ['an empty number', { prefix: 'Chat', suffix: '(new tab)' }, '', 'Chat (new tab)'],
    ['everything empty', { prefix: '', suffix: '' }, '', ''],
  ])('leaves out %s without stray spaces', (_label, aria, phone, expected) => {
    expect(whatsappAriaLabel(aria, phone)).toBe(expected);
  });

  it('keeps accents, ñ and emoji', () => {
    expect(whatsappAriaLabel({ prefix: 'Escríbanos 💬', suffix: '(pestaña nueva)' }, '+52 33 1713 3469')).toBe(
      'Escríbanos 💬 +52 33 1713 3469 (pestaña nueva)',
    );
  });
});
