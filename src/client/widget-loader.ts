// Load logic for the Hercules launcher (src/components/HerculesLauncher.astro), kept out of the
// inline script so it can be unit-tested without a DOM.

export type LoadResult = 'done' | 'ignored' | 'failed';

/**
 * Wraps a dynamic import so that:
 *  - the chunk is downloaded once and reused by every later click;
 *  - clicks that arrive while a download is in flight are ignored (a double click can't
 *    open and immediately close the panel);
 *  - a failed download is NOT cached, so the next click retries instead of failing forever.
 */
export function createWidgetLoader<M>(load: () => Promise<M>): (use: (mod: M) => void) => Promise<LoadResult> {
  let module: Promise<M> | null = null;
  let busy = false;
  return async (use) => {
    if (busy) return 'ignored';
    busy = true;
    try {
      const mod = await (module ??= load().catch((err: unknown) => {
        module = null;
        throw err;
      }));
      use(mod);
      return 'done';
    } catch {
      return 'failed';
    } finally {
      busy = false;
    }
  };
}
