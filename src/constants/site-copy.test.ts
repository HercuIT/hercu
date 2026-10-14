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
