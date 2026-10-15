import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTeaser,
  FULL,
  INTRO_KEY,
  introMode,
  markIntroSeen,
  maxPingsInAnySecond,
  motionEndsAt,
  pingStarts,
  SHORT,
  TEASER_RECHECK_MS,
  TEASER_VISIBLE_MS,
  teaserStartsAt,
  timelineFor,
  timelineVars,
  type Timeline,
  wireLauncherIntro,
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
    expect(maxPingsInAnySecond(t)).toBeLessThan(3);
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

describe('createTeaser (WCAG 2.4.3 focus order, 1.4.13 content on hover or focus)', () => {
  /** A teaser wired to fakes: records what it did, and lets each test set hover/focus. */
  function setup() {
    vi.useFakeTimers();
    const log: string[] = [];
    const state = { hovered: false, focusInside: false };
    const teaser = createTeaser({
      show: () => log.push('show'),
      hide: () => log.push('hide'),
      isEngaged: () => state.hovered || state.focusInside,
      hasFocus: () => state.focusInside,
      focusLauncher: () => log.push('focus-launcher'),
    });
    return { teaser, log, state };
  }
  afterEach(() => vi.useRealTimers());

  it('shows at the given time, then hides itself after TEASER_VISIBLE_MS', () => {
    const { teaser, log } = setup();
    teaser.start(3000);
    vi.advanceTimersByTime(2999);
    expect(log).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(log).toEqual(['show']);
    expect(teaser.visible()).toBe(true);
    vi.advanceTimersByTime(TEASER_VISIBLE_MS);
    expect(log).toEqual(['show', 'hide']);
    expect(teaser.visible()).toBe(false);
  });

  it('postpones the auto-hide while the pointer is over it, and hides once it leaves', () => {
    const { teaser, log, state } = setup();
    teaser.start(0);
    vi.advanceTimersByTime(0);
    state.hovered = true;
    vi.advanceTimersByTime(TEASER_VISIBLE_MS + 10 * TEASER_RECHECK_MS);
    expect(log).toEqual(['show']);
    state.hovered = false;
    vi.advanceTimersByTime(TEASER_RECHECK_MS);
    expect(log).toEqual(['show', 'hide']);
  });

  it('postpones the auto-hide while keyboard focus is inside (e.g. on "Dismiss"), so focus never drops to <body>', () => {
    const { teaser, log, state } = setup();
    teaser.start(0);
    vi.advanceTimersByTime(0);
    state.focusInside = true;
    vi.advanceTimersByTime(TEASER_VISIBLE_MS * 3);
    expect(log).toEqual(['show']);
    expect(teaser.visible()).toBe(true);
  });

  it('moves focus to the launcher BEFORE hiding when it is dismissed with focus inside', () => {
    const { teaser, log, state } = setup();
    teaser.start(0);
    vi.advanceTimersByTime(0);
    state.focusInside = true;
    teaser.dismiss();
    expect(log).toEqual(['show', 'focus-launcher', 'hide']);
  });

  it('does not move focus when dismissed without focus inside (e.g. by a mouse click elsewhere)', () => {
    const { teaser, log } = setup();
    teaser.start(0);
    vi.advanceTimersByTime(0);
    teaser.dismiss();
    expect(log).toEqual(['show', 'hide']);
  });

  it('dismissed before it shows (chat opened early): never shows, never hides', () => {
    const { teaser, log } = setup();
    teaser.start(3000);
    teaser.dismiss();
    vi.advanceTimersByTime(TEASER_VISIBLE_MS * 2);
    expect(log).toEqual([]);
    expect(teaser.visible()).toBe(false);
  });

  it('a second dismiss, or a dismiss after the auto-hide, does nothing', () => {
    const { teaser, log } = setup();
    teaser.start(0);
    vi.advanceTimersByTime(TEASER_VISIBLE_MS);
    teaser.dismiss();
    teaser.dismiss();
    expect(log).toEqual(['show', 'hide']);
  });

  it('rechecks often enough to feel immediate, but not in a busy loop', () => {
    expect(TEASER_RECHECK_MS).toBeGreaterThanOrEqual(250);
    expect(TEASER_RECHECK_MS).toBeLessThanOrEqual(2000);
  });
});

describe('maxPingsInAnySecond (WCAG 2.3.1: fewer than 3 flashes in any 1 s window)', () => {
  const timeline = (pings: number, pingGap: number, ping = 5000): Timeline => ({ ...FULL, pings, pingGap, ping });

  it("catches the reviewer's case: 3 pings 400 ms apart start within one second, whatever the phase length", () => {
    expect(maxPingsInAnySecond(timeline(3, 400, 1100))).toBe(3);
  });

  it.each([
    [0, 300, 0],
    [1, 0, 1],
    [2, 300, 2],
    [3, 500, 2],
    [3, 999, 2],
    [3, 1000, 1],
    [4, 333, 4], // 0, 333, 666 and 999 ms all fall in the first second
  ])('%i pings %i ms apart → at most %i in any second', (pings, gap, expected) => {
    expect(maxPingsInAnySecond(timeline(pings, gap))).toBe(expected);
  });

  it('lists each ping start, from the start of the ping phase', () => {
    expect(pingStarts(FULL)).toEqual([0, 300]);
    expect(pingStarts(SHORT)).toEqual([0]);
  });
});

describe('wireLauncherIntro (the launcher script, with fakes)', () => {
  function setup(stored: Record<string, string> = {}) {
    vi.useFakeTimers();
    const storage = memoryStorage(stored);
    const log: string[] = [];
    const applied: { mode?: string; vars?: Record<string, string> } = {};
    const state = { hovered: false, focusInside: false };
    const wiring = wireLauncherIntro({
      storage,
      applyIntro: (mode, vars) => Object.assign(applied, { mode, vars }),
      teaser: {
        show: () => log.push('show'),
        hide: () => log.push('hide'),
        isEngaged: () => state.hovered || state.focusInside,
        hasFocus: () => state.focusInside,
        focusLauncher: () => log.push('focus-launcher'),
      },
      clickLauncher: () => log.push('click-launcher'),
    });
    const showTeaser = () => vi.advanceTimersByTime(teaserStartsAt(FULL));
    return { wiring, storage, log, applied, state, showTeaser };
  }
  afterEach(() => vi.useRealTimers());

  it('first page: applies the full intro, marks it played, and shows the teaser on time', () => {
    const { wiring, storage, log, applied, showTeaser } = setup();
    expect(wiring.mode).toBe('full');
    expect(applied).toEqual({ mode: 'full', vars: timelineVars(FULL) });
    expect(storage.data.get(INTRO_KEY)).toBe('played');
    showTeaser();
    expect(log).toEqual(['show']);
  });

  it('later pages: applies the short intro and never shows the teaser', () => {
    const { wiring, log, applied } = setup({ [INTRO_KEY]: 'played' });
    expect(wiring.mode).toBe('short');
    expect(applied.vars).toEqual(timelineVars(SHORT));
    vi.advanceTimersByTime(60_000);
    expect(log).toEqual([]);
  });

  it('opening the chat (launcher or [data-hercules-open] link) marks the intro opened and dismisses the teaser', () => {
    const { wiring, storage, log, showTeaser } = setup();
    showTeaser();
    wiring.chatOpened();
    expect(storage.data.get(INTRO_KEY)).toBe('opened');
    expect(log).toEqual(['show', 'hide']);
  });

  it('opening the chat before the teaser shows cancels it', () => {
    const { wiring, log } = setup();
    wiring.chatOpened();
    vi.advanceTimersByTime(60_000);
    expect(log).toEqual([]);
  });

  it('clicking the teaser text opens the chat through the launcher', () => {
    const { wiring, log, showTeaser } = setup();
    showTeaser();
    wiring.teaserTextClicked();
    expect(log).toEqual(['show', 'click-launcher']);
  });

  it('the close button marks the intro dismissed, moves focus out first, and hides the teaser', () => {
    const { wiring, storage, log, state, showTeaser } = setup();
    showTeaser();
    state.focusInside = true;
    wiring.teaserClosed();
    expect(storage.data.get(INTRO_KEY)).toBe('dismissed');
    expect(log).toEqual(['show', 'focus-launcher', 'hide']);
  });

  it('Escape dismisses only while the teaser is visible', () => {
    const { wiring, storage, log, showTeaser } = setup();
    wiring.keydown('Escape'); // not shown yet
    expect(storage.data.get(INTRO_KEY)).toBe('played');
    showTeaser();
    wiring.keydown('Enter');
    expect(log).toEqual(['show']);
    wiring.keydown('Escape');
    expect(log).toEqual(['show', 'hide']);
    expect(storage.data.get(INTRO_KEY)).toBe('dismissed');
    wiring.keydown('Escape'); // already hidden: nothing more
    expect(log).toEqual(['show', 'hide']);
  });

  it('works without a teaser element, and with blocked storage', () => {
    vi.useFakeTimers();
    const wiring = wireLauncherIntro({ storage: null, applyIntro: () => {}, teaser: null, clickLauncher: () => {} });
    expect(wiring.mode).toBe('short');
    expect(() => {
      wiring.chatOpened();
      wiring.teaserClosed();
      wiring.keydown('Escape');
      vi.advanceTimersByTime(60_000);
    }).not.toThrow();
  });
});
