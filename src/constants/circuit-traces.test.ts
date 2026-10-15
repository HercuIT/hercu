import { describe, expect, it } from 'vitest';
import {
  AURA_MS,
  MOTION_BUDGET_MS,
  PING_MS,
  SIGNAL_MS,
  pathPoints,
  totalMotionMs,
  traces,
  validateTraces,
  type Trace,
} from './circuit-traces';

const clone = (): Trace[] => structuredClone(traces);

/** Replace one trace's fields in a copy of the shipped list. */
function withTrace(index: number, patch: Partial<Trace>): Trace[] {
  const list = clone();
  list[index] = { ...list[index], ...patch };
  return list;
}

describe('shipped circuit', () => {
  it('passes validation', () => {
    expect(() => validateTraces(traces)).not.toThrow();
  });

  it('stops all automatic motion within the 5 s budget (WCAG 2.2.2)', () => {
    expect(totalMotionMs(traces)).toBeLessThanOrEqual(MOTION_BUDGET_MS);
  });

  it('has 8–10 traces with 4–5 shown on mobile', () => {
    expect(traces.length).toBeGreaterThanOrEqual(8);
    expect(traces.length).toBeLessThanOrEqual(10);
    const mobile = traces.filter((t) => t.mobile).length;
    expect(mobile).toBeGreaterThanOrEqual(4);
    expect(mobile).toBeLessThanOrEqual(5);
  });

  it('staggers the draw-in so traces do not all appear at once', () => {
    const delays = traces.map((t) => t.drawDelayMs);
    expect(new Set(delays).size).toBe(delays.length);
  });
});

describe('totalMotionMs', () => {
  it('is at least the aura duration even with signals that finish earlier', () => {
    const list = clone().map((t) => ({ ...t, drawDelayMs: 0, signalDelaysMs: [600, 610, 620] as [number, number, number] }));
    expect(totalMotionMs(list)).toBe(Math.max(AURA_MS, 620 + SIGNAL_MS + PING_MS));
  });

  it('includes the node ping after the last signal arrives', () => {
    const list = withTrace(0, { signalDelaysMs: [1300, 2000, 3000] });
    expect(totalMotionMs(list)).toBe(3000 + SIGNAL_MS + PING_MS);
  });
});

describe('pathPoints', () => {
  it('parses H, V and 45° L segments', () => {
    expect(pathPoints('M600 60 H470 L440 90 V120')).toEqual([
      [600, 60],
      [470, 60],
      [440, 90],
      [440, 120],
    ]);
  });

  it('accepts commas and extra whitespace between numbers', () => {
    expect(pathPoints('  M 10,10  H 20  ')).toEqual([
      [10, 10],
      [20, 10],
    ]);
  });

  it.each([
    ['comma without spaces', 'M600,60 H470'],
    ['comma with spaces around it', 'M600 , 60 H470'],
    ['decimals', 'M600.5 60.25 H470'],
  ])('accepts a valid SVG number list: %s', (_label, d) => {
    expect(() => pathPoints(d)).not.toThrow();
  });

  it.each([
    ['repeated commas', 'M600,,60 H470'],
    ['repeated commas with spaces', 'M600 , , 60 H470'],
    ['leading comma', 'M,600 60 H470'],
    ['trailing comma after a pair', 'M600 60, H470'],
    ['trailing comma after a single number', 'M600 60 H470,'],
    ['lone comma as the argument', 'M600 60 H,'],
  ])('rejects malformed comma separators: %s', (_label, d) => {
    expect(() => pathPoints(d)).toThrow(/malformed number list/);
  });

  it('does not support exponent notation (deliberate: the parser stays strict)', () => {
    expect(() => pathPoints('M6e2 60 H470')).toThrow(/only absolute M, H, V, L/);
  });
});

describe('validateTraces: negative cases', () => {
  it.each([
    ['a cubic curve', 'M600 60 C500 60 500 90 400 90', /only absolute M, H, V, L/],
    ['a quadratic curve', 'M600 60 Q500 60 400 90', /only absolute M, H, V, L/],
    ['an arc', 'M600 60 A10 10 0 0 1 580 70', /only absolute M, H, V, L/],
    ['a relative move', 'm600 60 H470', /must start with M/],
    ['a relative line', 'M600 60 l-30 30', /only absolute M, H, V, L/],
    ['a non-45° diagonal', 'M600 60 L560 90', /non-45° diagonal/],
    ['a zero-length segment', 'M600 60 H600', /zero-length/],
    ['a second M', 'M600 60 H500 M400 60 H300', /only have one M/],
    ['a missing coordinate', 'M600 H500', /needs 2 number/],
    ['garbage text', 'M600 60 H470 hello', /only absolute/],
  ])('rejects %s', (_label, d, message) => {
    const end = ((): [number, number] => {
      try {
        const points = pathPoints(d);
        return points[points.length - 1];
      } catch {
        return [0, 0];
      }
    })();
    expect(() => validateTraces(withTrace(0, { d, end }))).toThrow(message);
  });

  it('rejects a point outside the viewBox', () => {
    expect(() => validateTraces(withTrace(0, { d: 'M600 60 H-10', end: [-10, 60] }))).toThrow(/leaves the viewBox/);
    expect(() => validateTraces(withTrace(0, { d: 'M600 60 V401', end: [600, 401] }))).toThrow(/leaves the viewBox/);
  });

  it('rejects a move-only path that draws nothing', () => {
    expect(() => validateTraces(withTrace(0, { d: 'M600 60', end: [600, 60] }))).toThrow(/at least one drawing segment/);
  });

  it('rejects a move-only path padded with whitespace', () => {
    expect(() => validateTraces(withTrace(0, { d: '  M600 60  ', end: [600, 60] }))).toThrow(/at least one drawing segment/);
  });

  it('rejects an end node that does not match the last point', () => {
    expect(() => validateTraces(withTrace(0, { end: [331, 90] }))).toThrow(/end must equal its last point/);
  });

  it('rejects duplicate ids', () => {
    expect(() => validateTraces(withTrace(1, { id: traces[0].id }))).toThrow(/Duplicate trace id/);
  });

  it('rejects ids that are not kebab-case', () => {
    expect(() => validateTraces(withTrace(0, { id: 'Bus_1' }))).toThrow(/kebab-case/);
  });

  it('rejects 7 or 11 traces', () => {
    expect(() => validateTraces(clone().slice(0, 7))).toThrow(/8–10 traces, got 7/);
    const eleven = [...clone(), ...clone().slice(0, 3).map((t, i) => ({ ...t, id: `extra-${i}`, mobile: false }))];
    expect(() => validateTraces(eleven)).toThrow(/8–10 traces, got 11/);
  });

  it('rejects 3 or 6 mobile traces', () => {
    const three = clone().map((t, i) => ({ ...t, mobile: i < 3 }));
    expect(() => validateTraces(three)).toThrow(/4–5 mobile traces, got 3/);
    const six = clone().map((t, i) => ({ ...t, mobile: i < 6 }));
    expect(() => validateTraces(six)).toThrow(/4–5 mobile traces, got 6/);
  });

  it('rejects signals that push motion over 5000 ms', () => {
    expect(() => validateTraces(withTrace(0, { signalDelaysMs: [1300, 2000, 3001] }))).toThrow(/budget is 5000 ms/);
  });

  it('rejects signals that start before the trace is drawn', () => {
    expect(() => validateTraces(withTrace(3, { signalDelaysMs: [100, 2000, 2500] }))).toThrow(/before it is drawn/);
  });

  it('rejects signal delays that do not increase', () => {
    expect(() => validateTraces(withTrace(0, { signalDelaysMs: [1500, 1500, 2000] }))).toThrow(/must increase/);
  });

  it('rejects a negative draw delay', () => {
    expect(() => validateTraces(withTrace(0, { drawDelayMs: -1 }))).toThrow(/negative draw delay/);
  });

  it.each([NaN, Infinity, -Infinity])('rejects a non-finite draw delay (%s)', (value) => {
    expect(() => validateTraces(withTrace(0, { drawDelayMs: value }))).toThrow(/finite/);
  });

  it.each([
    ['NaN first', [NaN, 2000, 2500]],
    ['NaN last', [1300, 2000, NaN]],
    ['Infinity last', [1300, 2000, Infinity]],
  ])('rejects non-finite signal delays (%s)', (_label, delays) => {
    expect(() => validateTraces(withTrace(0, { signalDelaysMs: delays as [number, number, number] }))).toThrow(/finite/);
  });

  it('never lets totalMotionMs fail open: a NaN anywhere makes it NaN, which validation rejects', () => {
    const list = withTrace(0, { drawDelayMs: NaN });
    expect(Number.isNaN(totalMotionMs(list))).toBe(true);
    expect(() => validateTraces(list)).toThrow();
  });
});

describe('validateTraces: edge cases', () => {
  it('accepts a trace that is a single straight H run', () => {
    expect(() => validateTraces(withTrace(0, { d: 'M600 60 H330', end: [330, 60] }))).not.toThrow();
  });

  it('accepts points exactly on the viewBox border', () => {
    expect(() => validateTraces(withTrace(0, { d: 'M600 0 H0 V400', end: [0, 400] }))).not.toThrow();
  });

  it('accepts motion ending exactly at the 5000 ms budget', () => {
    const list = withTrace(0, { signalDelaysMs: [1300, 2000, MOTION_BUDGET_MS - SIGNAL_MS - PING_MS] });
    expect(totalMotionMs(list)).toBe(MOTION_BUDGET_MS);
    expect(() => validateTraces(list)).not.toThrow();
  });
});
