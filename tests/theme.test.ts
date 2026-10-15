import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../src/styles/global.css', import.meta.url)), 'utf8');

/** Every `--name: #rrggbb;` declared in global.css. */
function tokens(source: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const [, name, value] of source.matchAll(/(--color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    found.set(name, [...(found.get(name) ?? []), value]);
  }
  return found;
}

/** WCAG 2.x contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrast helper', () => {
  it('matches known WCAG values', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });

  it('is symmetric and case-insensitive', () => {
    expect(contrast('#14233a', '#22d3ee')).toBeCloseTo(contrast('#22D3EE', '#14233A'), 10);
  });
});

describe('tokens helper', () => {
  it('reads colour tokens and counts repeated declarations', () => {
    expect(tokens('--color-a: #000000; --color-a: #FFFFFF;\n --color-b:#123456;')).toEqual(
      new Map([
        ['--color-a', ['#000000', '#FFFFFF']],
        ['--color-b', ['#123456']],
      ]),
    );
  });

  it('ignores non-hex values and other properties', () => {
    expect(tokens('--color-a: red; --font-x: #000000; --color-b: #12345;')).toEqual(new Map());
  });
});

describe('cyan "signal" token (specs/hercules-launcher-intro)', () => {
  const all = tokens(css);

  it('is declared exactly once, as #22D3EE', () => {
    expect(all.get('--color-signal')).toEqual(['#22D3EE']);
  });

  it('is readable on ink (≥ 4.5:1), computed from the two tokens', () => {
    const [signal] = all.get('--color-signal')!;
    const [ink] = all.get('--color-ink')!;
    expect(contrast(signal, ink)).toBeGreaterThanOrEqual(4.5);
  });

  it('is NOT readable on mist (why the spec forbids cyan text or cyan alone on light sections)', () => {
    const [signal] = all.get('--color-signal')!;
    const [mist] = all.get('--color-mist')!;
    expect(contrast(signal, mist)).toBeLessThan(3);
  });

  it('teaser text (mist on ink) is readable (≥ 4.5:1)', () => {
    expect(contrast(all.get('--color-mist')![0], all.get('--color-ink')![0])).toBeGreaterThanOrEqual(4.5);
  });

  it('registers the launcher sweep angle so the conic ring can animate', () => {
    expect(css).toMatch(/@property --hl-sweep\s*\{[^}]*syntax:\s*'<angle>'/);
  });
});
