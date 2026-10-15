// Source-level guards for CircuitPulse.astro: the CSS must render exactly the timing that
// validateTraces() budgets, and the hover replay must not restart the intro signals.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  AURA_MS,
  DRAW_MS,
  NODE_IN_MS,
  PING_MS,
  SIGNAL_MS,
  nodeDelayMs,
  totalMotionMs,
  traces,
} from '../constants/circuit-traces';

const source = readFileSync(fileURLToPath(new URL('./CircuitPulse.astro', import.meta.url)), 'utf8');
// The real <style> tag starts a line; the frontmatter mentions "<style>" in a comment, so indexOf would stop there.
const styleStart = source.search(/^<style[\s>]/m);
const markup = source.slice(0, styleStart);
const style = source.slice(styleStart);

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

  // Exact assignments in the markup, not just the names (the imports alone would contain those).
  it.each([
    ['--aura-ms', '${ms(AURA_MS)}'],
    ['--node-in-ms', '${ms(NODE_IN_MS)}'],
    ['--replay-stagger', '${ms(REPLAY_STAGGER_MS)}'],
    ['--draw-ms', '${ms(DRAW_MS)}'],
    ['--signal-ms', '${ms(SIGNAL_MS)}'],
    ['--ping-ms', '${ms(PING_MS)}'],
    ['--draw-delay', '${ms(trace.drawDelayMs)}'],
    ['--node-delay', '${ms(nodeDelayMs(trace))}'],
    ['--signal-delay', '${ms(delay)}'],
    ['--ping-delay', '${ms(delay + SIGNAL_MS)}'],
  ])('binds %s to %s in the markup', (variable, expression) => {
    expect(markup).toContain(`${variable}:${expression}`);
  });

  it('assigns in the markup every CSS variable the animations read', () => {
    const read = new Set([...animationValues.join(' ').matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
    const assigned = new Set([...markup.matchAll(/(--[\w-]+):\$\{/g)].map((m) => m[1]));
expect(assigned.has('--i')).toBe(true);
    expect([...read].filter((v) => !assigned.has(v))).toEqual([]);
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

  it('counts a node fade-in when it is the last thing moving', () => {
    // Early signals, late draw: the node fade-in (4000 + 960 + 300 = 5260) ends after the track
    // draw (4000 + 1200 = 5200), every signal + ping and the aura, so it alone sets the maximum.
    const late = traces.map((t, i) =>
      i === 0 ? { ...t, drawDelayMs: 4000, signalDelaysMs: [100, 110, 120] as [number, number, number] } : t,
    );
    const nodeEnd = nodeDelayMs({ drawDelayMs: 4000 }) + NODE_IN_MS;
    const everythingElse = Math.max(
      AURA_MS,
      ...late.map((t) => t.drawDelayMs + DRAW_MS),
      ...late.flatMap((t) => t.signalDelaysMs.map((d) => d + SIGNAL_MS + PING_MS)),
      ...late.slice(1).map((t) => nodeDelayMs(t) + NODE_IN_MS),
    );
    expect(nodeEnd).toBeGreaterThan(everythingElse); // precondition: the node really is last
    expect(totalMotionMs(late)).toBe(nodeEnd);
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
