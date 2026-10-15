import { describe, expect, it } from 'vitest';
import {
  FULL,
  INTRO_KEY,
  introMode,
  markIntroSeen,
  motionEndsAt,
  SHORT,
  TEASER_VISIBLE_MS,
  teaserStartsAt,
  timelineFor,
  timelineVars,
  type Timeline,
} from './launcher-intro';

/** In-memory sessionStorage stand-in. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const throwing = {
  getItem: () => {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem: () => {
    throw new DOMException('full', 'QuotaExceededError');
  },
};

describe('introMode / markIntroSeen', () => {
  it('plays the full intro on the first page of the session', () => {
    expect(introMode(memoryStorage())).toBe('full');
  });

  it.each(['played', 'dismissed', 'opened'] as const)('plays the short intro once the intro was %s', (reason) => {
    const storage = memoryStorage();
    markIntroSeen(storage, reason);
    expect(storage.data.get(INTRO_KEY)).toBe(reason);
    expect(introMode(storage)).toBe('short');
  });

  it.each(['garbage', '', '{', 'null'])('treats any stored value (%j) as seen', (value) => {
    expect(introMode(memoryStorage({ [INTRO_KEY]: value }))).toBe('short');
  });

  it('ignores other keys', () => {
    expect(introMode(memoryStorage({ 'hercules-chat': '[]' }))).toBe('full');
  });

  it.each([
    ['null storage', null],
    ['undefined storage', undefined],
  ])('plays the short intro with %s (no memory: never replay the full one every page)', (_label, storage) => {
    expect(introMode(storage)).toBe('short');
    expect(() => markIntroSeen(storage, 'played')).not.toThrow();
  });

  it('plays the short intro when reading storage throws (blocked), and marking does not throw', () => {
    expect(introMode(throwing)).toBe('short');
    expect(() => markIntroSeen(throwing, 'dismissed')).not.toThrow();
  });
});

describe('timelines (WCAG 2.2.2 and 2.3.1)', () => {
  it('ends all motion of the full intro within 5 s', () => {
    expect(motionEndsAt(FULL)).toBeLessThan(5000);
  });

  it('keeps the short intro under 2 s, with no traces and no teaser', () => {
    expect(motionEndsAt(SHORT)).toBeLessThan(2000);
    expect(SHORT.traces).toBe(0);
    expect(SHORT.teaserIn).toBe(0);
    expect(SHORT.pings).toBe(1);
  });

  it.each([
    ['full', FULL],
    ['short', SHORT],
  ] as const)('%s: pings stay under 3 per second and fit inside the ping phase', (_mode, t: Timeline) => {
    expect(t.pings / (t.ping / 1000)).toBeLessThan(3);
    expect((t.pings - 1) * t.pingGap + t.pingDuration).toBeLessThanOrEqual(t.ping);
  });

  it('waits before moving, so the hero paints first', () => {
    expect(FULL.wait).toBeGreaterThanOrEqual(800);
    expect(SHORT.wait).toBeGreaterThan(0);
  });

  it('starts the teaser after the pings end, and hides it within 10 s', () => {
    expect(teaserStartsAt(FULL)).toBe(FULL.wait + FULL.boot + FULL.traces + FULL.ping);
    expect(TEASER_VISIBLE_MS).toBeGreaterThan(0);
    expect(TEASER_VISIBLE_MS).toBeLessThan(10_000);
  });

  it('every duration is a non-negative whole number of ms', () => {
    for (const t of [FULL, SHORT]) {
      for (const value of Object.values(t)) {
        expect(Number.isInteger(value) && value >= 0).toBe(true);
      }
    }
  });

  it('picks the timeline for each mode', () => {
    expect(timelineFor('full')).toBe(FULL);
    expect(timelineFor('short')).toBe(SHORT);
  });
});

describe('timelineVars', () => {
  it('passes every timing the CSS uses as a ms custom property', () => {
    expect(timelineVars(FULL)).toEqual({
      '--hl-wait': '800ms',
      '--hl-boot': '600ms',
      '--hl-traces': '800ms',
      '--hl-ping': '500ms',
      '--hl-ping-gap': '300ms',
      '--hl-teaser-in': '400ms',
    });
  });

  it('gives the short intro zero-length traces and teaser', () => {
    const vars = timelineVars(SHORT);
    expect(vars['--hl-traces']).toBe('0ms');
    expect(vars['--hl-teaser-in']).toBe('0ms');
  });
});
