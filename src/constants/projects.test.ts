import { describe, expect, it } from 'vitest';
import {
  buildProjectCards,
  isSafeHttpsUrl,
  projects,
  type ProjectConfig,
  type ProjectCopy,
  type ProjectId,
} from './projects';
import { strings } from './strings';

const locales = ['es', 'en'] as const;
const validCopy = (): Record<ProjectId, ProjectCopy> => structuredClone(strings.en.projects.items);

describe('isSafeHttpsUrl', () => {
  it.each([
    'https://www.binkleaner.mx/',
    'https://bruno-gray-pi.vercel.app/',
    'https://example.com',
    'https://example.com/path?q=1#frag',
    'https://bücher.de/', // internationalized domain
  ])('accepts %s', (url) => {
    expect(isSafeHttpsUrl(url)).toBe(true);
  });

  it.each([
    ['plain http', 'http://www.binkleaner.mx/'],
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/html,<script>alert(1)</script>'],
    ['ftp scheme', 'ftp://example.com/file'],
    ['empty string', ''],
    ['relative path', '/proyectos'],
    ['protocol-relative', '//example.com'],
    ['scheme only', 'https://'],
    ['host without a dot', 'https://localhost/'],
    ['embedded credentials', 'https://user:pass@example.com/'],
    ['leading whitespace', ' https://example.com'],
    ['trailing whitespace', 'https://example.com '],
    ['not a URL', 'binkleaner'],
  ])('rejects %s', (_label, url) => {
    expect(isSafeHttpsUrl(url)).toBe(false);
  });

  it.each([undefined, null, 42, {}, ['https://example.com']])('rejects non-string %j', (value) => {
    expect(isSafeHttpsUrl(value)).toBe(false);
  });
});

describe('projects config', () => {
  it('lists BinKleaner then Nopalito Limpio', () => {
    expect(projects.map((p) => p.name)).toEqual(['BinKleaner', 'Nopalito Limpio']);
  });

  it('has unique, URL-safe ids', () => {
    const ids = projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('only links to safe https URLs', () => {
    for (const project of projects) expect(isSafeHttpsUrl(project.url)).toBe(true);
  });
});

describe.each(locales)('buildProjectCards with the "%s" dictionary', (locale) => {
  const cards = buildProjectCards(strings[locale].projects.items);

  it('returns one card per project, in config order', () => {
    expect(cards.map((c) => c.id)).toEqual(projects.map((p) => p.id));
  });

  it('fills every text field and exactly 3 highlights', () => {
    for (const card of cards) {
      expect(card.description.trim()).not.toBe('');
      expect(card.imageAlt.trim()).not.toBe('');
      expect(card.highlights).toHaveLength(3);
      for (const h of card.highlights) expect(h.trim()).not.toBe('');
    }
  });

  it('mentions the product name in the image alt text', () => {
    for (const card of cards) expect(card.imageAlt).toContain(card.name);
  });

  it('keeps product names untranslated', () => {
    expect(cards.map((c) => c.name)).toEqual(['BinKleaner', 'Nopalito Limpio']);
  });
});

describe('buildProjectCards with broken input (negative cases)', () => {
  it('throws when a project has no copy', () => {
    const copy = validCopy();
    delete (copy as Partial<typeof copy>)['nopalito-limpio'];
    expect(() => buildProjectCards(copy)).toThrow('Missing copy for project "nopalito-limpio"');
  });

  it('throws on a blank description', () => {
    const copy = validCopy();
    copy.binkleaner.description = '  ';
    expect(() => buildProjectCards(copy)).toThrow('Missing description for project "binkleaner"');
  });

  it('throws on a blank highlight', () => {
    const copy = validCopy();
    copy.binkleaner.highlights[1] = '';
    expect(() => buildProjectCards(copy)).toThrow('Missing highlight 2 for project "binkleaner"');
  });

  it('throws on a sparse highlights array with a hole (length 3, slot missing)', () => {
    const copy = validCopy();
    // eslint-disable-next-line no-sparse-arrays
    (copy.binkleaner as { highlights: string[] }).highlights = ['one', , 'three'] as string[];
    expect(copy.binkleaner.highlights).toHaveLength(3);
    expect(1 in copy.binkleaner.highlights).toBe(false);
    expect(() => buildProjectCards(copy)).toThrow('Missing highlight 2 for project "binkleaner"');
  });

  it('throws on an all-holes highlights array (new Array(3))', () => {
    const copy = validCopy();
    (copy.binkleaner as { highlights: string[] }).highlights = new Array(3);
    expect(() => buildProjectCards(copy)).toThrow('Missing highlight 1 for project "binkleaner"');
  });

  it('throws when there are fewer than 3 highlights', () => {
    const copy = validCopy();
    (copy.binkleaner as { highlights: string[] }).highlights = ['one', 'two'];
    expect(() => buildProjectCards(copy)).toThrow('needs exactly 3 highlights');
  });

  it('throws when there are more than 3 highlights', () => {
    const copy = validCopy();
    (copy.binkleaner as { highlights: string[] }).highlights = ['a', 'b', 'c', 'd'];
    expect(() => buildProjectCards(copy)).toThrow('needs exactly 3 highlights');
  });

  it('throws on missing alt text', () => {
    const copy = validCopy();
    copy['nopalito-limpio'].imageAlt = '';
    expect(() => buildProjectCards(copy)).toThrow('Missing imageAlt for project "nopalito-limpio"');
  });

  it.each([
    'http://www.binkleaner.mx/',
    'javascript:alert(1)',
    '',
    '/relative',
  ])('refuses to render a card with unsafe URL %j', (url) => {
    const list: ProjectConfig[] = [{ id: 'binkleaner', name: 'BinKleaner', url }];
    expect(() => buildProjectCards(validCopy(), list)).toThrow('Unsafe URL for project "binkleaner"');
  });

  it('throws on a blank project name', () => {
    const list: ProjectConfig[] = [{ id: 'binkleaner', name: ' ', url: 'https://www.binkleaner.mx/' }];
    expect(() => buildProjectCards(validCopy(), list)).toThrow('Missing name for project "binkleaner"');
  });

  it('returns no cards for an empty project list (edge)', () => {
    expect(buildProjectCards(validCopy(), [])).toEqual([]);
  });
});
