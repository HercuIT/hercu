import { describe, expect, it } from 'vitest';
import { strings } from '../constants/strings';
import { defaultLocale, getLocale, locales, localeMeta, useStrings } from './utils';

describe('getLocale', () => {
  it.each(locales)('returns supported locale "%s" unchanged', (locale) => {
    expect(getLocale(locale)).toBe(locale);
  });

  it('defaults to Spanish', () => {
    expect(defaultLocale).toBe('es');
  });

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['an unsupported locale', 'fr'],
    ['a region-qualified tag', 'es-MX'],
    ['different casing', 'EN'],
    ['surrounding whitespace', ' en '],
  ])('falls back to the default for %s', (_label, input) => {
    expect(getLocale(input)).toBe(defaultLocale);
  });
});

describe('useStrings', () => {
  it.each(locales)('returns the "%s" dictionary', (locale) => {
    expect(useStrings(locale)).toBe(strings[locale]);
  });

  it('returns the Spanish dictionary for an unknown locale', () => {
    expect(useStrings('de')).toBe(strings.es);
  });
});

describe('localeMeta', () => {
  it('has an entry for every supported locale and nothing else', () => {
    expect(Object.keys(localeMeta).sort()).toEqual([...locales].sort());
  });

  it.each(locales)('"%s" has well-formed html/og codes and a short label', (locale) => {
    const meta = localeMeta[locale];
    expect(meta.htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    expect(meta.ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    expect(meta.short).toBe(locale.toUpperCase());
    expect(meta.name.trim()).not.toBe('');
  });
});
