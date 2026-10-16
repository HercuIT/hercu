import { expect, type Page } from '@playwright/test';

/**
 * Navigates and waits until the page's web fonts (Sora, JetBrains Mono) have loaded. Use it before
 * measuring layout: `goto` only waits for the load event, and text measured in a fallback font has
 * different widths, which would make width and wrapping checks flaky.
 */
export async function gotoReady(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
}
