import { describe, expect, it } from 'vitest';
import { serviceGroups, serviceIds } from '../src/constants/contact-services';
import { projects } from '../src/constants/projects';
import { shared, strings } from '../src/constants/strings';
import { buildSystemPrompt } from './prompt';

const locales = ['es', 'en'] as const;

describe.each(locales)('buildSystemPrompt("%s")', (locale) => {
  const prompt = buildSystemPrompt(locale);

  it('is byte-identical on every build (prompt caching depends on it)', () => {
    expect(buildSystemPrompt(locale)).toBe(prompt);
  });

  it('contains no dates or timestamps that would break the cache', () => {
    expect(prompt).not.toMatch(/\b20\d\d-\d\d-\d\d\b|\d{1,2}:\d\d:\d\d/);
  });

  it('lists every service slug with its label, and every area description', () => {
    for (const id of serviceIds) expect(prompt).toContain(`[${id}] ${strings[locale].contact.service.options[id]}`);
    for (const g of serviceGroups) expect(prompt).toContain(strings[locale].services.groupDescriptions[g.id]);
  });

  it('includes both projects with their URLs, the phone and the location', () => {
    for (const p of projects) expect(prompt).toContain(`${p.name} (${p.url})`);
    expect(prompt).toContain(shared.phone.display);
    expect(prompt).toContain(shared.location);
  });

  it('includes the quality mandate points', () => {
    for (const p of strings[locale].qualityMandate.points) expect(prompt).toContain(p.title);
  });

  it('forbids invented prices', () => {
    expect(prompt).toMatch(locale === 'es' ? /Nunca inventes precios/ : /Never invent prices/);
  });

  it('requires explicit confirmation AND the privacy checkbox before submit_lead', () => {
    const rule = prompt.split('\n').find((line) => line.includes('submit_lead SOLO') || line.includes('submit_lead ONLY'));
    expect(rule).toBeDefined();
    if (locale === 'es') {
      expect(rule).toMatch(/confirmación explícita/);
      expect(rule).toMatch(/marcar la casilla de consentimiento/);
      expect(rule).toContain(strings.es.hercules.consentLabel);
    } else {
      expect(rule).toMatch(/explicit confirmation/);
      expect(rule).toMatch(/tick the consent checkbox/);
      expect(rule).toContain(strings.en.hercules.consentLabel);
    }
  });

  it('asks for a contact channel and allows "any" when there is no preference (submit_lead requires it)', () => {
    expect(prompt).toMatch(locale === 'es' ? /medio de contacto preferido/ : /preferred contact channel/);
    expect(prompt).toContain('"any"');
  });
});

describe('Spanish prompt register', () => {
  it('asks for formal "usted" and does not address the visitor with tú pronouns', () => {
    const es = buildSystemPrompt('es');
    expect(es).toContain('"usted"');
    expect(es).not.toMatch(/(?<!\p{L})(tú|tu|tus|contigo)(?!\p{L})/iu);
  });
});

describe('locales differ', () => {
  it('builds a different prompt per locale', () => {
    expect(buildSystemPrompt('es')).not.toBe(buildSystemPrompt('en'));
  });
});

describe('assistant name in the prompts', () => {
  it('introduces itself as "Hércules" in Spanish and "Hercules" in English', () => {
    expect(buildSystemPrompt('es')).toMatch(/^Eres Hércules,/);
    expect(buildSystemPrompt('es')).not.toMatch(/\bHercules\b/);
    expect(buildSystemPrompt('en')).toMatch(/^You are Hercules,/);
  });
});

describe('formatting rule (specs/hercules-chat-formatting)', () => {
  it.each(locales)('"%s": allows only bold and "- " lists, and rules out headings, tables, links, code and italics', (locale) => {
    const rule = buildSystemPrompt(locale)
      .split('\n')
      .find((line) => line.startsWith(locale === 'es' ? '- Formato:' : '- Formatting:'));
    expect(rule).toBeDefined();
    expect(rule).toContain('**');
    expect(rule).toContain('"- "');
    for (const banned of locale === 'es' ? ['encabezados', 'tablas', 'enlaces', 'código', 'cursivas'] : ['headings', 'tables', 'links', 'code', 'italics']) {
      expect(rule).toContain(banned);
    }
  });

  it.each(locales)('"%s": the rule appears exactly once', (locale) => {
    const prompt = buildSystemPrompt(locale);
    expect(prompt.split(locale === 'es' ? '- Formato:' : '- Formatting:')).toHaveLength(2);
  });
});

describe('weekend monitoring brief (specs/weekend-monitoring)', () => {
  /** The prompt's monitoring section: from its heading to the next "## " heading. */
  const brief = (locale: 'es' | 'en') => {
    const prompt = buildSystemPrompt(locale);
    const start = prompt.indexOf('[weekend-holiday-monitoring]:');
    expect(start).toBeGreaterThan(-1);
    const end = prompt.indexOf('\n## ', start);
    expect(end, 'the monitoring brief must be followed by another section').toBeGreaterThan(start);
    return prompt.slice(start, end);
  };

  it.each(locales)('"%s": describes what is included, the coverage and the tailored proposal, from the site copy', (locale) => {
    const m = strings[locale].monitoring;
    const text = brief(locale);
    for (const part of [m.intro, ...m.benefits.map((b) => b.description), ...m.steps, m.coverage, m.pricing]) {
      expect(text).toContain(part);
    }
    expect(text).toMatch(locale === 'es' ? /México y Estados Unidos/ : /Mexico and the United States/);
  });

  it.each(locales)('"%s": includes every FAQ question with its answer, as on the site', (locale) => {
    const m = strings[locale].monitoring;
    const lines = brief(locale).split('\n');
    expect(m.faq.length).toBeGreaterThan(0);
    for (const item of m.faq) {
      expect(lines).toContain(`- ${m.faqTitle}: ${item.question} ${item.answer}`);
    }
  });

  it.each(locales)('"%s": keeps the no-numbers rule as the last line of the brief, after the FAQ', (locale) => {
    const lines = brief(locale).trimEnd().split('\n');
    expect(lines.at(-1)).toMatch(locale === 'es' ? /^- No des montos/ : /^- Do not give amounts/);
  });

  it.each(locales)('"%s": tells Hércules not to give amounts, rates, included hours or response times', (locale) => {
    expect(brief(locale)).toMatch(
      locale === 'es' ? /No des montos, tarifas, horas incluidas ni tiempos de respuesta/ : /Do not give amounts, rates, included hours or response times/,
    );
  });

  it.each(locales)('"%s": contains no internal tools, portfolio terms or amounts', (locale) => {
    expect(brief(locale)).not.toMatch(/PagerDuty|UptimeRobot|Supabase|butterfl|true friend|retainer|\$|MXN|USD|\d+\s?(minutos?|minutes?)/i);
  });

  it.each(locales)('"%s": lists the service slug in the catalogue for submit_lead (not just in the brief heading)', (locale) => {
    const prompt = buildSystemPrompt(locale);
    // The catalogue section only: from its heading to the next "## " heading.
    const start = prompt.indexOf(locale === 'es' ? '## Catálogo de servicios' : '## Service catalogue');
    expect(start).toBeGreaterThan(-1);
    // The catalogue must be followed by another section; otherwise the slice would run to the end of
    // the prompt and the check below could pass on a line from a later section.
    const end = prompt.indexOf('\n## ', start + 1);
    expect(end).toBeGreaterThan(start);
    const catalogue = prompt.slice(start, end);
    const label = strings[locale].contact.service.options['weekend-holiday-monitoring'];
    expect(catalogue.split('\n')).toContain(`  - [weekend-holiday-monitoring] ${label}`);
  });

  it('the catalogue check fails when the slug is missing from the catalogue (guards the test above)', () => {
    const withoutCatalogueLine = buildSystemPrompt('es')
      .split('\n')
      .filter((line) => !line.startsWith('  - [weekend-holiday-monitoring]'))
      .join('\n');
    expect(withoutCatalogueLine).toContain('[weekend-holiday-monitoring]: detalle'); // still in the brief heading
    expect(withoutCatalogueLine.split('\n')).not.toContain(
      `  - [weekend-holiday-monitoring] ${strings.es.contact.service.options['weekend-holiday-monitoring']}`,
    );
  });
});
