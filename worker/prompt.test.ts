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
      expect(rule).toMatch(/marcar la casilla "Acepto el aviso de privacidad"/);
    } else {
      expect(rule).toMatch(/explicit confirmation/);
      expect(rule).toMatch(/tick the "I accept the privacy notice" checkbox/);
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
