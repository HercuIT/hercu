import { describe, expect, it, vi } from 'vitest';
import { createWidgetLoader } from './widget-loader';

/** A load() whose promise the test settles by hand. */
function deferredLoad<M>() {
  const settle: { resolve?: (m: M) => void; reject?: (e: Error) => void } = {};
  const load = vi.fn(
    () =>
      new Promise<M>((resolve, reject) => {
        settle.resolve = resolve;
        settle.reject = reject;
      }),
  );
  return { load, settle };
}

describe('createWidgetLoader', () => {
  it('downloads once and reuses the module for every later click', async () => {
    const mod = { open: vi.fn() };
    const load = vi.fn(async () => mod);
    const run = createWidgetLoader(load);
    expect(await run((m) => m.open())).toBe('done');
    expect(await run((m) => m.open())).toBe('done');
    expect(load).toHaveBeenCalledOnce();
    expect(mod.open).toHaveBeenCalledTimes(2);
  });

  it('ignores clicks that arrive while the download is in flight (no open-then-close)', async () => {
    const { load, settle } = deferredLoad<{ toggle: () => void }>();
    const toggle = vi.fn();
    const run = createWidgetLoader(load);
    const first = run((m) => m.toggle());
    expect(await run((m) => m.toggle())).toBe('ignored');
    settle.resolve!({ toggle });
    expect(await first).toBe('done');
    expect(toggle).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
  });

  it('does not cache a failed download: the next click retries and succeeds', async () => {
    const mod = { open: vi.fn() };
    const load = vi
      .fn<() => Promise<typeof mod>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(mod);
    const run = createWidgetLoader(load);
    expect(await run((m) => m.open())).toBe('failed');
    expect(await run((m) => m.open())).toBe('done');
    expect(load).toHaveBeenCalledTimes(2);
    expect(mod.open).toHaveBeenCalledOnce();
  });

  it('accepts clicks again after a failure (busy flag is released)', async () => {
    const load = vi.fn().mockRejectedValue(new Error('offline'));
    const run = createWidgetLoader(load);
    expect(await run(() => {})).toBe('failed');
    expect(await run(() => {})).toBe('failed');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('reports "failed" when using the module throws, and stays usable', async () => {
    const run = createWidgetLoader(async () => ({}));
    expect(await run(() => { throw new Error('render bug'); })).toBe('failed');
    expect(await run(() => {})).toBe('done');
  });
});
