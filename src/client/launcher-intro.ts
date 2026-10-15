// Intro animation for the Hércules launcher (specs/hercules-launcher-intro). Timings live here, not in
// the CSS, so the WCAG limits (motion ends within 5 s, fewer than 3 pings per second) are tested.
// HerculesLauncher.astro passes them to its CSS as custom properties.

/** sessionStorage key. Holds why the intro counts as seen; never any personal data. */
export const INTRO_KEY = 'hercules-intro-seen';

export type IntroMode = 'full' | 'short';
export type SeenReason = 'played' | 'dismissed' | 'opened';

export type Timeline = {
  /** Before anything moves, so the hero paints first. */
  wait: number;
  boot: number;
  traces: number;
  /** Phase in which the pings play. */
  ping: number;
  pings: number;
  /** Time each ping takes to expand and fade. */
  pingDuration: number;
  /** Gap between the start of one ping and the next. */
  pingGap: number;
  /** Teaser slide-in, after the ping phase. 0 = no teaser. */
  teaserIn: number;
};

/** First page of the session: boot, traces + signal, two pings, then the teaser. */
export const FULL: Timeline = { wait: 800, boot: 600, traces: 800, ping: 800, pings: 2, pingDuration: 500, pingGap: 300, teaserIn: 400 };

/** Later pages: a quick boot and one ping, no traces, no teaser. */
export const SHORT: Timeline = { wait: 300, boot: 600, traces: 0, ping: 800, pings: 1, pingDuration: 500, pingGap: 0, teaserIn: 0 };

/** How long the teaser stays (static) before hiding itself. */
export const TEASER_VISIBLE_MS = 8000;

export const timelineFor = (mode: IntroMode): Timeline => (mode === 'full' ? FULL : SHORT);

/** When the teaser starts to slide in: after the last ping phase. */
export const teaserStartsAt = (t: Timeline): number => t.wait + t.boot + t.traces + t.ping;

/** When the last moving part stops (the teaser stays put after that until it hides). */
export const motionEndsAt = (t: Timeline): number => teaserStartsAt(t) + t.teaserIn;

/**
 * 'full' only when this tab hasn't seen the intro yet. Blocked or missing storage plays 'short':
 * without memory, replaying the full sequence (and teaser) on every page would be the worse failure.
 */
export function introMode(storage: Pick<Storage, 'getItem'> | null | undefined): IntroMode {
  try {
    return storage && storage.getItem(INTRO_KEY) === null ? 'full' : 'short';
  } catch {
    return 'short';
  }
}

/** Remembers, for this tab, that the intro played or the visitor dismissed it or opened the chat. */
export function markIntroSeen(storage: Pick<Storage, 'setItem'> | null | undefined, reason: SeenReason): void {
  try {
    storage?.setItem(INTRO_KEY, reason);
  } catch {
    // Quota exceeded or storage blocked: the next page plays 'short' anyway (see introMode).
  }
}

/** CSS custom properties that drive the launcher's keyframes. */
export function timelineVars(t: Timeline): Record<string, string> {
  return {
    '--hl-wait': `${t.wait}ms`,
    '--hl-boot': `${t.boot}ms`,
    '--hl-traces': `${t.traces}ms`,
    '--hl-ping': `${t.pingDuration}ms`,
    '--hl-ping-gap': `${t.pingGap}ms`,
    '--hl-teaser-in': `${t.teaserIn}ms`,
  };
}
