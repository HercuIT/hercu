// Geometry and timing for the hero "Circuit Pulse" (specs/circuit-animation). Kept in TypeScript so
// the PCB style and the WCAG 2.2.2 motion budget (≤ 5 s of automatic motion) are unit-tested and
// enforced at build time by CircuitPulse.astro.

export const VIEWBOX = { width: 600, height: 400 } as const;

export const DRAW_MS = 1200; // trace draw-in
export const DRAW_STAGGER_MS = 80;
export const SIGNAL_MS = 1400; // one signal run, start → node
export const PING_MS = 600; // node ping when a signal arrives
export const AURA_MS = 2400; // aura fade/turn-in
export const MOTION_BUDGET_MS = 5000;

export type Trace = {
  id: string;
  /** SVG path using only absolute M, H, V and 45° L segments. */
  d: string;
  /** Node position: must equal the path's last point. */
  end: [number, number];
  drawDelayMs: number;
  signalDelaysMs: [number, number, number];
  /** Shown below the md breakpoint. */
  mobile: boolean;
};

type Geometry = Pick<Trace, 'id' | 'd' | 'end' | 'mobile'>;

// Traces enter from the right/top/bottom edges and fan toward the headline, like a chip's bus lines.
const geometry: Geometry[] = [
  { id: 'bus-1', d: 'M600 60 H470 L440 90 H330', end: [330, 90], mobile: true },
  { id: 'bus-2', d: 'M600 110 H520 L490 140 H400 L370 170 H300', end: [300, 170], mobile: false },
  { id: 'bus-3', d: 'M600 170 H540 L510 200 H420', end: [420, 200], mobile: true },
  { id: 'bus-4', d: 'M600 220 H480 L450 250 H360 L340 270 H250', end: [250, 270], mobile: false },
  { id: 'bus-5', d: 'M600 270 H560 L530 300 H450', end: [450, 300], mobile: true },
  { id: 'bus-6', d: 'M600 340 H510 L480 370 H380', end: [380, 370], mobile: true },
  { id: 'top-1', d: 'M520 0 V30 L500 50 H400', end: [400, 50], mobile: false },
  { id: 'bottom-1', d: 'M300 400 V350 L280 330 H200', end: [200, 330], mobile: true },
];

/** Timing derived from position so the whole intro stays inside the budget by construction. */
export const traces: Trace[] = geometry.map((g, i) => {
  const drawDelayMs = i * DRAW_STAGGER_MS;
  const first = 1300 + i * 110; // after the trace has (mostly) drawn
  return { ...g, drawDelayMs, signalDelaysMs: [first, first + 450, first + 900] };
});

/** Last moment any automatic animation is still running, in ms from page load. */
export function totalMotionMs(list: readonly Trace[]): number {
  let end = AURA_MS;
  for (const t of list) {
    end = Math.max(end, t.drawDelayMs + DRAW_MS, ...t.signalDelaysMs.map((s) => s + SIGNAL_MS + PING_MS));
  }
  return end;
}

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEGMENT = /([A-Za-z])([^A-Za-z]*)/g;

/** Parses a path into its points, enforcing PCB style. Throws on anything else. */
export function pathPoints(d: string, id = 'trace'): [number, number][] {
  const points: [number, number][] = [];
  let x = NaN;
  let y = NaN;
  const segments = [...d.trim().matchAll(SEGMENT)];
  if (segments.length === 0 || d.trim()[0] !== 'M') throw new Error(`Trace "${id}" must start with M`);
  const consumed = segments.map((s) => s[0]).join('');
  if (consumed.replace(/\s/g, '') !== d.replace(/\s/g, '')) throw new Error(`Trace "${id}" has unparsable path data`);

  segments.forEach(([, cmd, args], index) => {
    const nums = args.trim() === '' ? [] : args.trim().split(/[\s,]+/).map(Number);
    if (nums.some((n) => !Number.isFinite(n))) throw new Error(`Trace "${id}" has a non-numeric coordinate`);
    const want = cmd === 'M' || cmd === 'L' ? 2 : 1;
    if (!'MHVL'.includes(cmd)) {
      throw new Error(`Trace "${id}" uses "${cmd}"; only absolute M, H, V, L are allowed`);
    }
    if (nums.length !== want) throw new Error(`Trace "${id}" segment ${cmd} needs ${want} number(s)`);
    if (cmd === 'M' && index !== 0) throw new Error(`Trace "${id}" may only have one M`);

    let nx = x;
    let ny = y;
    if (cmd === 'M' || cmd === 'L') [nx, ny] = nums;
    if (cmd === 'H') nx = nums[0];
    if (cmd === 'V') ny = nums[0];

    if (cmd !== 'M') {
      const dx = Math.abs(nx - x);
      const dy = Math.abs(ny - y);
      if (dx === 0 && dy === 0) throw new Error(`Trace "${id}" has a zero-length segment`);
      if (cmd === 'L' && dx !== dy) throw new Error(`Trace "${id}" has a non-45° diagonal`);
    }
    x = nx;
    y = ny;
    points.push([x, y]);
  });
  return points;
}

/** Throws with a precise message on the first rule violation (see spec §4). */
export function validateTraces(list: readonly Trace[]): void {
  if (list.length < 8 || list.length > 10) throw new Error(`Expected 8–10 traces, got ${list.length}`);
  const mobile = list.filter((t) => t.mobile).length;
  if (mobile < 4 || mobile > 5) throw new Error(`Expected 4–5 mobile traces, got ${mobile}`);

  const seen = new Set<string>();
  for (const t of list) {
    if (!ID.test(t.id)) throw new Error(`Trace id "${t.id}" must be lowercase kebab-case`);
    if (seen.has(t.id)) throw new Error(`Duplicate trace id "${t.id}"`);
    seen.add(t.id);

    const points = pathPoints(t.d, t.id);
    for (const [px, py] of points) {
      if (px < 0 || py < 0 || px > VIEWBOX.width || py > VIEWBOX.height) {
        throw new Error(`Trace "${t.id}" leaves the viewBox at (${px}, ${py})`);
      }
    }
    const [lx, ly] = points[points.length - 1];
    if (lx !== t.end[0] || ly !== t.end[1]) throw new Error(`Trace "${t.id}" end must equal its last point`);

    if (t.drawDelayMs < 0) throw new Error(`Trace "${t.id}" has a negative draw delay`);
    const [a, b, c] = t.signalDelaysMs;
    if (a < t.drawDelayMs + DRAW_MS / 2) throw new Error(`Trace "${t.id}" signals start before it is drawn`);
    if (!(a < b && b < c)) throw new Error(`Trace "${t.id}" signal delays must increase`);
  }

  const total = totalMotionMs(list);
  if (total > MOTION_BUDGET_MS) {
    throw new Error(`Automatic motion lasts ${total} ms; the budget is ${MOTION_BUDGET_MS} ms (WCAG 2.2.2)`);
  }
}
