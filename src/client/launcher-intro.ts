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

/** While the pointer or keyboard focus is on the teaser, how often the auto-hide checks again. */
export const TEASER_RECHECK_MS = 1000;

export type TeaserDeps = {
  show: () => void;
  hide: () => void;
  /** Pointer over it or focus inside (`:hover, :focus-within`): the auto-hide waits. */
  isEngaged: () => boolean;
  /** Keyboard focus is inside the teaser (e.g. on its close button). */
  hasFocus: () => boolean;
  focusLauncher: () => void;
};

/**
 * Shows and hides the teaser bubble, keeping it accessible:
 *  - WCAG 1.4.13: the auto-hide never removes it from under the pointer or from keyboard focus; it
 *    checks again every TEASER_RECHECK_MS until the visitor moves on.
 *  - WCAG 2.4.3: when it is hidden with focus inside (close button, Escape), focus moves to the
 *    launcher first, instead of falling back to <body>.
 * Timers and DOM checks are injected, so this is unit-tested with fake timers.
 */
export function createTeaser(deps: TeaserDeps): { start: (delayMs: number) => void; dismiss: () => void; visible: () => boolean } {
  let state: 'idle' | 'scheduled' | 'visible' | 'done' = 'idle';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const later = (fn: () => void, ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
  const dismiss = () => {
    clearTimeout(timer);
    if (state === 'visible') {
      if (deps.hasFocus()) deps.focusLauncher();
      deps.hide();
    }
    state = 'done';
  };
  const autoHide = () => (deps.isEngaged() ? later(autoHide, TEASER_RECHECK_MS) : dismiss());
  return {
    start(delayMs) {
      if (state !== 'idle') return;
      state = 'scheduled';
      later(() => {
        state = 'visible';
        deps.show();
        later(autoHide, TEASER_VISIBLE_MS);
      }, delayMs);
    },
    dismiss,
    visible: () => state === 'visible',
  };
}

export const timelineFor = (mode: IntroMode): Timeline => (mode === 'full' ? FULL : SHORT);

/** Start time of each ping, relative to the ping phase. */
export const pingStarts = (t: Timeline): number[] => Array.from({ length: t.pings }, (_, i) => i * t.pingGap);

/** Most pings starting within any 1-second window (WCAG 2.3.1 allows at most 3 flashes per second). */
export function maxPingsInAnySecond(t: Timeline): number {
  const starts = pingStarts(t);
  return Math.max(0, ...starts.map((s) => starts.filter((other) => other >= s && other < s + 1000).length));
}

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

export type LauncherIntroDeps = {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  /** Sets data-intro and the timing custom properties on the launcher wrapper. */
  applyIntro: (mode: IntroMode, vars: Record<string, string>) => void;
  /** The teaser bubble's DOM operations, or null when the page has no teaser. */
  teaser: TeaserDeps | null;
  /** Opens the chat the same way the launcher does (launcher.click()). */
  clickLauncher: () => void;
};

/**
 * Everything HerculesLauncher.astro's script does, minus the DOM: picks and applies the intro,
 * starts the teaser on the first page, and returns one handler per event. The script only attaches
 * them (launcher and [data-hercules-open] clicks → chatOpened, teaser text → teaserTextClicked,
 * close button → teaserClosed, document keydown → keydown), so this is unit-tested with fakes.
 */
export function wireLauncherIntro(deps: LauncherIntroDeps) {
  const mode = introMode(deps.storage);
  const timeline = timelineFor(mode);
  deps.applyIntro(mode, timelineVars(timeline));

  const noTeaser: TeaserDeps = { show() {}, hide() {}, isEngaged: () => false, hasFocus: () => false, focusLauncher() {} };
  const bubble = createTeaser(deps.teaser ?? noTeaser);
  if (mode === 'full') {
    // Seen as soon as it starts, so navigating away mid-sequence doesn't replay it in full.
    markIntroSeen(deps.storage, 'played');
    if (deps.teaser) bubble.start(teaserStartsAt(timeline));
  }

  const teaserClosed = () => {
    markIntroSeen(deps.storage, 'dismissed');
    bubble.dismiss();
  };
  return {
    mode,
    chatOpened: () => {
      markIntroSeen(deps.storage, 'opened');
      bubble.dismiss();
    },
    teaserTextClicked: () => deps.clickLauncher(),
    teaserClosed,
    /** WCAG 1.4.13: Escape dismisses the teaser, but only while it is visible. */
    keydown: (key: string) => {
      if (key === 'Escape' && bubble.visible()) teaserClosed();
    },
  };
}
