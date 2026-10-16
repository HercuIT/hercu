import { expect, test } from '@playwright/test';
import { FULL, teaserStartsAt, TEASER_VISIBLE_MS } from '../src/client/launcher-intro';

// Hércules launcher intro and teaser (specs/hercules-launcher-intro), in a real browser. Timers run on
// Playwright's clock, so the 3 s / 8 s waits are instant and deterministic.
const TEASER_IN = teaserStartsAt(FULL) + FULL.teaserIn + 100;

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const launcher = (page: import('@playwright/test').Page) => page.locator('#hercules-launcher');
const teaser = (page: import('@playwright/test').Page) => page.locator('.hl-teaser');

test.describe('first page of the session', () => {
  for (const [path, text] of [
    ['/', '¿Tiene un proyecto en mente? Pregúntele a Hércules'],
    ['/en/', 'Got a project in mind? Ask Hercules'],
  ] as const) {
    test(`shows the full intro and the teaser on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('#hercules-launcher-wrap')).toHaveAttribute('data-intro', 'full');
      await expect(teaser(page)).toBeHidden();
      await page.clock.runFor(TEASER_IN);
      await expect(teaser(page)).toBeVisible();
      await expect(teaser(page)).toContainText(text);
    });
  }

  test('hides the teaser by itself after it has been shown', async ({ page }) => {
    await page.goto('/');
    await page.clock.runFor(TEASER_IN);
    await expect(teaser(page)).toBeVisible();
    await page.mouse.move(0, 0); // the pointer must not rest on the teaser
    await page.clock.runFor(TEASER_VISIBLE_MS + 1500);
    await expect(teaser(page)).toBeHidden();
  });

  test('keeps the teaser while keyboard focus is inside it (WCAG 1.4.13), and never drops focus', async ({ page }) => {
    await page.goto('/');
    await page.clock.runFor(TEASER_IN);
    await page.locator('.hl-teaser-close').focus();
    await page.clock.runFor(TEASER_VISIBLE_MS * 2);
    await expect(teaser(page)).toBeVisible();
    await expect(page.locator('.hl-teaser-close')).toBeFocused();
  });

  test('the close button moves focus to the launcher before hiding (WCAG 2.4.3)', async ({ page }) => {
    await page.goto('/');
    await page.clock.runFor(TEASER_IN);
    await page.locator('.hl-teaser-close').focus();
    await page.keyboard.press('Enter');
    await expect(launcher(page)).toBeFocused();
    await page.clock.runFor(500);
    await expect(teaser(page)).toBeHidden();
  });

  test('Escape closes the teaser', async ({ page }) => {
    await page.goto('/');
    await page.clock.runFor(TEASER_IN);
    await expect(teaser(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await page.clock.runFor(500);
    await expect(teaser(page)).toBeHidden();
  });

  test('opening the chat before the teaser appears cancels it', async ({ page }) => {
    await page.goto('/');
    await launcher(page).click();
    await page.clock.runFor(TEASER_IN);
    await expect(teaser(page)).toBeHidden();
  });
});

test('later pages in the same tab play the short intro, with no teaser', async ({ page }) => {
  await page.goto('/');
  await page.clock.runFor(1000);
  await page.reload();
  await expect(page.locator('#hercules-launcher-wrap')).toHaveAttribute('data-intro', 'short');
  await page.clock.runFor(TEASER_IN + TEASER_VISIBLE_MS);
  await expect(teaser(page)).toBeHidden();
});

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'light', reducedMotion: 'reduce' });

  test('turns off the ring, traces and pings, but still shows the launcher and teaser', async ({ page }) => {
    await page.goto('/');
    for (const selector of ['.hl-ring', '.hl-traces', '.hl-ping']) {
      await expect(page.locator(selector).first()).toHaveCSS('display', 'none');
    }
    await page.clock.runFor(TEASER_IN);
    await expect(launcher(page)).toBeVisible();
    await expect(teaser(page)).toBeVisible();
  });
});

test.describe('phone layout', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 640, 'phone only');

  test('the teaser sits above the launcher and does not cover the hero call to action', async ({ page }) => {
    await page.goto('/');
    await page.clock.runFor(TEASER_IN + 500);
    const bubble = await teaser(page).boundingBox();
    const button = await launcher(page).boundingBox();
    const cta = await page.locator('section.hero a').first().boundingBox();
    expect(bubble && button && cta).toBeTruthy();
    expect(bubble!.y + bubble!.height).toBeLessThanOrEqual(button!.y);
    const overlaps =
      bubble!.x < cta!.x + cta!.width && cta!.x < bubble!.x + bubble!.width && bubble!.y < cta!.y + cta!.height && cta!.y < bubble!.y + bubble!.height;
    expect(overlaps).toBe(false);
  });
});
