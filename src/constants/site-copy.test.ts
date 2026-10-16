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

describe('launcher teaser copy (specs/hercules-launcher-intro)', () => {
  it.each(['es', 'en'] as const)('"%s": teaser and dismiss label are non-blank, and the teaser is at most 60 characters', (locale) => {
    // A length bound only: whether it fits two lines at 360 px depends on the font and the bubble's
    // width, so that is checked visually (quality-test-plan.md §6), not here.
    const h = strings[locale].hercules;
    expect(h.teaser.trim()).not.toBe('');
    expect(h.teaserDismiss.trim()).not.toBe('');
    expect(charLength(h.teaser)).toBeLessThanOrEqual(60);
  });

  it('names the assistant with the right spelling in each language', () => {
    expect(strings.es.hercules.teaser).toContain('Hércules');
    expect(strings.en.hercules.teaser).toContain('Hercules');
    expect(strings.en.hercules.teaser).not.toContain('Hércules');
  });

  it('uses the formal "usted" register in Spanish', () => {
    expect(strings.es.hercules.teaser).toMatch(/Pregúntele/);
    expect(usesTu(strings.es.hercules.teaser)).toBe(false);
    expect(usesTu(strings.es.hercules.teaserDismiss)).toBe(false);
  });
});

describe('weekend monitoring copy (specs/weekend-monitoring)', () => {
  const monitoringStrings = (locale: 'es' | 'en') => {
    const t = strings[locale];
    return [
      t.nav.monitoring.label,
      t.hero.monitoringLink,
      t.services.monitoringCta,
      t.services.groupDescriptions.monitoring,
      t.footer.monitoring,
      t.contact.service.groups.monitoring,
      t.contact.service.options['weekend-holiday-monitoring'],
      ...allStrings(t.monitoring),
    ];
  };

  it.each(['es', 'en'] as const)('"%s": every monitoring string is non-blank', (locale) => {
    for (const text of monitoringStrings(locale)) expect(text.trim()).not.toBe('');
  });

  it('has the same number of benefits, steps and FAQ items in both locales', () => {
    for (const key of ['benefits', 'steps', 'faq'] as const) {
      expect(strings.en.monitoring[key].length).toBe(strings.es.monitoring[key].length);
    }
    expect(strings.es.monitoring.benefits).toHaveLength(3);
    expect(strings.es.monitoring.steps).toHaveLength(4);
    expect(strings.es.monitoring.faq).toHaveLength(3);
  });

  it.each([
    ['es', /viernes 6:00 p\. m\./, /lunes 8:00 a\. m\./, /Ciudad de México/, /México y Estados Unidos/],
    ['en', /Friday 6:00 p\.m\./, /Monday 8:00 a\.m\./, /Mexico City/, /Mexico and the United States/],
  ] as const)('"%s": coverage names the window, the time zone and both countries\' holidays', (locale, ...patterns) => {
    for (const pattern of patterns) expect(strings[locale].monitoring.coverage).toMatch(pattern);
  });

  it.each([
    ['es', /^Propuesta a la medida/],
    ['en', /^Tailored proposal/],
  ] as const)('"%s": the only pricing text is the tailored-proposal line', (locale, pattern) => {
    expect(strings[locale].monitoring.pricing).toMatch(pattern);
  });

  it.each([
    ['es', /tiempo de respuesta acordado en su contrato \(SLA\)/],
    ['en', /response time agreed in your contract \(SLA\)/],
  ] as const)('"%s": response is "the agreed SLA", with no number', (locale, pattern) => {
    expect(allStrings(strings[locale].monitoring).join(' ')).toMatch(pattern);
  });

  // Decisions 3, 4 and 5, and the "only client-facing content" rule.
  const forbidden: [string, RegExp][] = [
    ['internal tools', /PagerDuty|UptimeRobot|Supabase|Cloudflare/i],
    ['internal portfolio terms', /butterfl|true friend|mariposa/i],
    ['internal pay or rotation', /retainer|rotaci[oó]n|rotation|compensa/i],
    ['citation markers', /\[\d+(,\s*\d+)*\]/],
    ['amounts or currency', /[$€£¥]|\b(MXN|USD|EUR|GBP|CAD)\b|\d+\s?(pesos|d[oó]lares|dollars|euros?)\b/i],
    ['a pricing model', /cuota|tarifa|por hora|horas incluidas|\bfee\b|\brates?\b|per hour|hours included/i],
    ['a response-time number', /\d+\s?(minutos?|minutes?|mins?|horas?|hours?|hrs?|h)\b/i],
    ['a guarantee', /garantiza|garantía|guarantee/i],
  ];
  it.each(['es', 'en'] as const)('"%s": publishes nothing internal, no pricing and no response-time number', (locale) => {
    const text = monitoringStrings(locale).join('\n');
    for (const [label, pattern] of forbidden) expect(text, label).not.toMatch(pattern);
  });

  it('the forbidden-content checks really catch what they guard against', () => {
    const samples: Record<string, string[]> = {
      'internal tools': ['Usamos PagerDuty', 'vía Supabase'],
      'internal portfolio terms': ['True Friends', 'Butterflies'],
      'internal pay or rotation': ['retainer pool', 'rotación de guardias'],
      'citation markers': ['[1, 2]', '[10]'],
      'amounts or currency': ['$500', '500 MXN', 'USD 99', '€500', 'EUR 500', '£500', '¥1000', '300 pesos', '20 euros'],
      'a pricing model': ['tarifa por hora', 'base fee', 'weekend rate'],
      'a response-time number': ['en 15 minutos', 'within 15 minutes', '15 min', '15 mins', '1 hr', '2 hrs', '24h', '2 horas', '1 hour'],
      'a guarantee': ['garantizamos', 'guaranteed uptime'],
    };
    for (const [label, pattern] of forbidden) {
      expect(samples[label], `samples for ${label}`).toBeDefined();
      for (const sample of samples[label]) expect(sample, label).toMatch(pattern);
    }
  });

  it('the forbidden-content checks leave the real coverage and SLA wording alone', () => {
    const allowed = [
      strings.es.monitoring.coverage, // "viernes 6:00 p. m. a lunes 8:00 a. m."
      strings.en.monitoring.coverage, // "Friday 6:00 p.m. to Monday 8:00 a.m."
      'tiempo de respuesta acordado en su contrato (SLA)',
      'Monitoring and support',
    ];
    for (const text of allowed) {
      for (const [label, pattern] of forbidden) expect(text, label).not.toMatch(pattern);
    }
  });

  it('uses unique section ids that do not clash with the other nav anchors', () => {
    for (const locale of ['es', 'en'] as const) {
      const ids = Object.values(strings[locale].nav).map((link) => link.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(strings[locale].nav.monitoring.id).toBe(locale === 'es' ? 'monitoreo' : 'monitoring');
    }
  });

  it('uses the formal "usted" register in every Spanish monitoring string', () => {
    const offenders = monitoringStrings('es').filter(usesTu);
    expect(offenders).toEqual([]);
  });

  it('the usted check catches informal monitoring copy (guards the test above)', () => {
    expect(usesTu('Tu equipo descansa')).toBe(true);
    expect(usesTu('Vigilamos tu plataforma')).toBe(true);
    expect(usesTu('Su equipo descansa')).toBe(false);
  });

  it.each([
    ['es', /fin(es)? de semana/i, /d[ií]as festivos/i],
    ['en', /weekend/i, /holiday/i],
  ] as const)('"%s": the footer link names both weekends and holidays, like the section', (locale, weekend, holiday) => {
    const label = strings[locale].footer.monitoring;
    expect(label).toMatch(weekend);
    expect(label).toMatch(holiday);
  });

  it.each(['es', 'en'] as const)('"%s": the footer link label stays short enough for the footer row (≤ 45 characters)', (locale) => {
    expect(charLength(strings[locale].footer.monitoring)).toBeLessThanOrEqual(45);
  });

  it('spells the assistant correctly in each locale', () => {
    expect(strings.es.monitoring.askHercules).toContain('Hércules');
    expect(strings.en.monitoring.askHercules).toContain('Hercules');
  });
});
