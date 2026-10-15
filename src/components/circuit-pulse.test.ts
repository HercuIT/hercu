// Source-level guards for CircuitPulse.astro: the CSS must render exactly the timing that
// validateTraces() budgets, and the hover replay must not restart the intro signals.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AURA_MS, DRAW_MS, NODE_IN_MS, PING_MS, SIGNAL_MS, nodeDelayMs, totalMotionMs, traces } from '../constants/circuit-traces';

const source = readFileSync(fileURLToPath(new URL('./CircuitPulse.astro', import.meta.url)), 'utf8');
const style = source.slice(source.indexOf('<style'));

/** Every `animation:` value in the component's CSS (multi-line values joined). */
const animationValues = [...style.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1].replace(/\s+/g, ' ').trim());

/** Duration-like tokens that are not inside var(...): e.g. "2400ms", "1.2s". */
const literalDurations = (value: string) => value.replace(/var\([^)]*\)/g, '').match(/\b\d+(\.\d+)?m?s\b/g) ?? [];

describe('CircuitPulse CSS timing is bound to circuit-traces.ts', () => {
  it('finds the animation declarations it is guarding', () => {
    expect(animationValues.length).toBeGreaterThanOrEqual(6);
  });

  it('hard-codes no duration or delay in any animation (they must come from CSS variables)', () => {
    const offenders = animationValues.filter((v) => v !== 'none !important' && literalDurations(v).length > 0);
    expect(offenders).toEqual([]);
  });

  it.each([
    ['aura', 'aura-in var(--aura-ms)'],
    ['node fade-in', 'node-in var(--node-in-ms)'],
    ['track draw', 'trace-draw var(--draw-ms)'],
    ['signal', 'signal-run var(--signal-ms)'],
    ['ping', 'node-ping var(--ping-ms)'],
  ])('%s animation uses its variable', (_label, expected) => {
    expect(animationValues.some((v) => v.startsWith(expected))).toBe(true);
  });

  it('passes every budgeted constant into the markup as a CSS variable', () => {
    for (const name of ['AURA_MS', 'NODE_IN_MS', 'DRAW_MS', 'SIGNAL_MS', 'PING_MS', 'nodeDelayMs(trace)']) {
      expect(source).toContain(name);
    }
  });
});

describe('totalMotionMs covers every automatic animation', () => {
  it('includes the aura, track draw, node fade-in and last signal + ping', () => {
    const expected = Math.max(
      AURA_MS,
      ...traces.map((t) => t.drawDelayMs + DRAW_MS),
      ...traces.map((t) => nodeDelayMs(t) + NODE_IN_MS),
      ...traces.flatMap((t) => t.signalDelaysMs.map((s) => s + SIGNAL_MS + PING_MS)),
    );
    expect(totalMotionMs(traces)).toBe(expected);
  });

  it('counts a node fade-in that would outlast every signal', () => {
    const late = traces.map((t, i) => (i === 0 ? { ...t, drawDelayMs: 4000, signalDelaysMs: [4700, 4710, 4720] as [number, number, number] } : t));
    expect(totalMotionMs(late)).toBeGreaterThanOrEqual(nodeDelayMs({ drawDelayMs: 4000 }) + NODE_IN_MS);
  });
});

describe('hover replay does not restart the intro signals on hover-out', () => {
  const base = animationValues.find((v) => v.startsWith('signal-run '));
  const hover = (() => {
    const m = style.match(/\.hero:hover \.circuit-pulse \.signal-1\s*\{\s*animation:\s*([^;]+);/);
    return m ? m[1].replace(/\s+/g, ' ').trim() : undefined;
  })();

  it('defines both the base signal and the hover rule', () => {
    expect(base).toBeDefined();
    expect(hover).toBeDefined();
  });

  it('keeps the base signal-run FIRST and byte-identical in the hover list', () => {
    const [first, second] = hover!.split(/,\s*(?=signal-)/);
    expect(first).toBe(base);
    expect(second).toMatch(/^signal-replay /);
  });
});
