import { describe, expect, it } from 'vitest';
import { serviceGroups } from './contact-services';
import { strings } from './strings';

const locales = ['es', 'en'] as const;

/** Counts user-perceived characters, so "é" or "ñ" count as one whatever their encoding. */
const charLength = (text: string) => [...new Intl.Segmenter().segment(text)].length;

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('charLength helper', () => {
  it('counts precomposed and decomposed accents as one character each', () => {
    expect(charLength('é')).toBe(1);
    expect(charLength('é')).toBe(1); // "e" + combining acute accent
    expect(charLength('Señal')).toBe(5);
  });

  it('counts an emoji as one character', () => {
    expect(charLength('✨')).toBe(1);
  });

  it('returns 0 for an empty string', () => {
    expect(charLength('')).toBe(0);
  });
});

describe.each(locales)('site copy for "%s"', (locale) => {
  const t = strings[locale];

  it('keeps meta.title within 60 characters (search-result limit)', () => {
    expect(charLength(t.meta.title)).toBeLessThanOrEqual(60);
  });

  it('keeps meta.description within 160 characters (search-result limit)', () => {
    expect(charLength(t.meta.description)).toBeLessThanOrEqual(160);
  });

  it('mentions AI and QA in the search title', () => {
    expect(t.meta.title).toMatch(locale === 'es' ? /IA/ : /AI/);
    expect(t.meta.title).toContain('QA');
  });

  it('never mentions e-commerce anywhere (removed from the offer)', () => {
    for (const text of allStrings(t)) {
      expect(text).not.toMatch(/e-?commerce|comercio electr[oó]nico/i);
    }
  });

  it('has a non-blank description for every service area, and no unknown areas', () => {
    const areaIds = serviceGroups.map((g) => g.id).sort();
    expect(Object.keys(t.services.groupDescriptions).sort()).toEqual(areaIds);
    for (const id of areaIds) {
      expect(t.services.groupDescriptions[id].trim()).not.toBe('');
    }
  });
});

describe('Spanish copy fixes', () => {
  it('spells "Llámenos" correctly in the call prefix', () => {
    expect(strings.es.contact.callPrefix).toBe('Llámenos al');
  });
});

/**
 * Heuristic guard for the formal "usted" register. Flags unambiguous informal (tú) markers:
 * tú pronouns/possessives anywhere, -nos imperatives, and tú imperatives opening a string
 * (e.g. "Agenda la recolección…"). Not exhaustive: native review is still required.
 */
const TU_MARKERS = /(?<![\p{L}])(tú|tu|tus|te|ti|contigo|cuéntanos|escríbenos|llámanos|contáctanos|platícanos)(?![\p{L}])/iu;
const TU_IMPERATIVE_OPENING = /^(agenda|indica|reserva|visita|descubre|elige|solicita|escribe|cuenta|llama)\s/iu;
const usesTu = (text: string) => TU_MARKERS.test(text) || TU_IMPERATIVE_OPENING.test(text);

describe('usesTu heuristic', () => {
  it.each([
    'Agenda la recolección e indica cuántas bolsas',
    'Tu ropa limpia, doblada y de vuelta en casa.',
    'Cuéntanos qué necesitas',
    'Te respondemos pronto',
    'Indica cuántas bolsas',
  ])('flags informal copy: %j', (text) => {
    expect(usesTu(text)).toBe(true);
  });

  it.each([
    'Los clientes agendan la recolección e indican cuántas bolsas',
    'Cuéntenos qué necesita',
    'Llámenos al',
    'Reservas en línea sin crear cuenta', // plural noun, not an imperative
    'Agende la recolección', // usted imperative
    'Team building para equipos remotos', // "te" inside a word must not match
    'Capacitación práctica en IA y QA',
    '',
  ])('accepts formal or neutral copy: %j', (text) => {
    expect(usesTu(text)).toBe(false);
  });
});

describe('Spanish register', () => {
  it('uses formal "usted" or neutral phrasing everywhere (no informal tú markers)', () => {
    const offenders = allStrings(strings.es).filter(usesTu);
    expect(offenders).toEqual([]);
  });
});

describe('assistant name spelling', () => {
  const allSpanish = allStrings(strings.es).join('\n');

  it('is "Hércules" everywhere in the Spanish copy, never the unaccented form', () => {
    expect(allSpanish).toContain('Hércules');
    expect(allSpanish).not.toMatch(/\bHercules\b/);
  });

  it('stays "Hercules" in the English copy', () => {
    expect(strings.en.hercules.title).toBe('Hercules');
    expect(allStrings(strings.en).join('\n')).not.toContain('Hércules');
  });
});

describe('consent wording is identical in the checkbox and the short privacy notice', () => {
  it.each(['es', 'en'] as const)('"%s": the short notice quotes hercules.consentLabel word for word', (locale) => {
    const label = strings[locale].hercules.consentLabel;
    // Section 10 (simplified and short notices) lives in privacy.simplifiedNotice.
    const notice = strings[locale].privacy.simplifiedNotice.paragraphs.join('\n');
    expect(label.length).toBeGreaterThan(20);
    expect(notice).toContain(locale === 'es' ? `«${label}».` : `"${label}".`);
  });

  it.each(['es', 'en'] as const)('"%s": the label names the privacy notice and email reporting', (locale) => {
    const label = strings[locale].hercules.consentLabel;
    expect(label).toMatch(locale === 'es' ? /aviso de privacidad/ : /privacy notice/);
    expect(label).toMatch(locale === 'es' ? /correo electrónico/ : /email/);
  });
});
