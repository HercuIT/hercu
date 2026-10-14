import { describe, expect, it } from 'vitest';
import { strings } from './strings';

/** Lists every leaf path (`a.b.0.c`) in a dictionary. */
function leafPaths(value: unknown, prefix = ''): string[] {
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function leafValues(value: unknown): unknown[] {
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(leafValues);
  }
  return [value];
}

describe('locale dictionaries', () => {
  it('have exactly the same keys in Spanish and English (incl. array lengths)', () => {
    expect(leafPaths(strings.en).sort()).toEqual(leafPaths(strings.es).sort());
  });

  it.each(['es', 'en'] as const)('"%s" has no empty or blank strings', (locale) => {
    for (const value of leafValues(strings[locale])) {
      expect(typeof value).toBe('string');
      expect((value as string).trim()).not.toBe('');
    }
  });

  it.each(['es', 'en'] as const)('"%s" section anchor ids are unique and URL-safe', (locale) => {
    const ids = Object.values(strings[locale].nav).map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z]+$/);
    }
  });
});
