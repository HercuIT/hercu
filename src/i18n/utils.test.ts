import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { strings } from '../constants/strings';
import { defaultLocale, getLocale, locales, localeMeta, privacyPaths, useStrings } from './utils';

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

describe('privacyPaths', () => {
  it('maps Spanish to the root route and English under /en/', () => {
    expect(privacyPaths.es).toBe('/aviso-de-privacidad');
    expect(privacyPaths.en).toBe('/en/privacy-notice');
  });

  it('has exactly one absolute path per supported locale, all distinct', () => {
    expect(Object.keys(privacyPaths).sort()).toEqual([...locales].sort());
    const paths = Object.values(privacyPaths);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path).toMatch(/^\/[a-z0-9/-]+$/);
  });
});

describe('privacy routes exist as real pages', () => {
  // Astro file routing: "/x" -> src/pages/x.astro (or x/index.astro); "/en/x" -> src/pages/en/x.astro.
  const pageFor = (path: string) => {
    const base = fileURLToPath(new URL(`../pages${path}`, import.meta.url));
    return [`${base}.astro`, `${base}/index.astro`].find((file) => existsSync(file));
  };

  it.each(locales)('the "%s" privacy route has a page file', (locale) => {
    expect(pageFor(privacyPaths[locale]), privacyPaths[locale]).toBeDefined();
  });

  it('would catch a route with no page (negative control)', () => {
    expect(pageFor('/no-such-page')).toBeUndefined();
  });
});
