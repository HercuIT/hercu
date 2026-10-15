import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Source checks for HerculesLauncher.astro (specs/hercules-launcher-intro): markup and CSS-cascade
// properties a unit test can't reach through the Astro runtime.
const source = readFileSync(fileURLToPath(new URL('../src/components/HerculesLauncher.astro', import.meta.url)), 'utf8');
const style = source.slice(source.indexOf('<style>'), source.indexOf('</style>'));

describe('launcher teaser markup (keyboard and screen-reader access)', () => {
  it('renders the teaser text as a real button, not a click-only span', () => {
    expect(source).toMatch(/<button type="button" class="hl-teaser-text">\{t\.hercules\.teaser\}<\/button>/);
    expect(source).not.toMatch(/<span[^>]*hl-teaser-text/);
  });

  it('does not hide the teaser text from screen readers (it gives "Dismiss" its context)', () => {
    expect(source).not.toMatch(/class="hl-teaser-text"[^>]*aria-hidden/);
  });

  it('gives the close button its locale label', () => {
    expect(source).toMatch(/class="hl-teaser-close" aria-label=\{t\.hercules\.teaserDismiss\}/);
  });
});

describe('launcher teaser CSS cascade', () => {
  const at = (needle: string) => {
    const index = style.indexOf(needle);
    expect(index, `missing in <style>: ${needle}`).toBeGreaterThan(-1);
    return index;
  };

  it('puts the phone override after the base animation shorthand (same specificity: later wins)', () => {
    expect(at('animation-name: hl-teaser-up')).toBeGreaterThan(at('animation: hl-teaser-in'));
  });

  it('keeps the reduced-motion block last, so it still wins on phones', () => {
    expect(at('@media (prefers-reduced-motion: reduce)')).toBeGreaterThan(at('animation-name: hl-teaser-up'));
  });

  it('style extraction found the component styles (guards the checks above)', () => {
    expect(style.length).toBeGreaterThan(1000);
  });
});
