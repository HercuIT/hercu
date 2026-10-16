import { expect, test, type Page } from '@playwright/test';
import { gotoReady } from './helpers';

// Layout at the narrowest desktop width: the header nav appears at Tailwind's md breakpoint (768 px),
// with 5 links, the language switcher and the contact button. Spanish labels are the longest.
const MD = { width: 768, height: 1024 };

async function headerLayout(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector('header nav') as HTMLElement;
    const items = [...nav.children].map((el) => el.getBoundingClientRect());
    const header = document.querySelector('header > div > div') as HTMLElement;
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tops: items.map((r) => Math.round(r.top + r.height / 2)),
      rightmost: Math.max(...items.map((r) => r.right)),
      leftmost: Math.min(...items.map((r) => r.left)),
      viewport: document.documentElement.clientWidth,
      headerHeight: header.getBoundingClientRect().height,
      labelsWrapped: [...nav.querySelectorAll('a')].filter((a) => a.getClientRects().length > 1).map((a) => a.textContent?.trim()),
      logoRight: (document.querySelector('header a') as HTMLElement).getBoundingClientRect().right,
    };
  });
}

for (const path of ['/', '/en/']) {
  test(`header fits on one row at ${MD.width} px (${path})`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'one viewport is enough; the size is set here');
    await page.setViewportSize(MD);
    await gotoReady(page, path); // measure with the real fonts, not fallback metrics
    const layout = await headerLayout(page);

    expect(layout.overflow, 'page scrolls sideways').toBeLessThanOrEqual(0);
    expect(layout.rightmost, 'nav runs past the right edge').toBeLessThanOrEqual(layout.viewport);
    expect(layout.leftmost, 'nav overlaps the logo').toBeGreaterThanOrEqual(layout.logoRight);
    expect(new Set(layout.tops).size, 'nav items are not on one row').toBe(1);
    expect(layout.labelsWrapped, 'a nav label wraps onto two lines').toEqual([]);
    expect(layout.headerHeight).toBe(80);
  });
}
