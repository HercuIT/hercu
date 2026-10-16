import { expect, test } from '@playwright/test';

// Weekend monitoring section and its entry points (specs/weekend-monitoring), in a real browser.
const locales = [
  { home: '/', id: 'monitoreo', nav: 'Monitoreo', param: 'servicio', contact: 'contacto', cta: 'Solicitar propuesta' },
  { home: '/en/', id: 'monitoring', nav: 'Monitoring', param: 'service', contact: 'contact', cta: 'Request a proposal' },
] as const;

for (const l of locales) {
  test.describe(`monitoring (${l.home})`, () => {
    test('the desktop header link jumps to the section', async ({ page, viewport }) => {
      test.skip((viewport?.width ?? 0) < 768, 'the header nav is desktop only');
      await page.goto(l.home);
      await page.getByRole('navigation').getByRole('link', { name: l.nav, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${l.id}$`));
      await expect(page.locator(`#${l.id}`)).toBeInViewport();
    });

    test('the hero link reaches the section (how phones get there)', async ({ page }) => {
      await page.goto(l.home);
      const link = page.locator(`section.hero a[href="#${l.id}"]`);
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.locator(`#${l.id}`)).toBeInViewport();
    });

    test('"Request a proposal" opens the contact form with the service preselected', async ({ page }) => {
      await page.goto(l.home);
      await page.locator(`#${l.id}`).getByRole('link', { name: l.cta }).click();
      await expect(page).toHaveURL(new RegExp(`\\?${l.param}=weekend-holiday-monitoring#${l.contact}$`));
      await expect(page.locator('#service')).toHaveValue('weekend-holiday-monitoring');
    });

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false });

      test('the FAQ opens without any script', async ({ page }) => {
        await page.goto(l.home);
        const first = page.locator(`#${l.id} details`).first();
        await expect(first).not.toHaveAttribute('open', '');
        await first.locator('summary').click();
        await expect(first).toHaveAttribute('open', '');
        await expect(first.locator('p')).toBeVisible();
      });

      test('"Request a proposal" still lands on the contact form', async ({ page }) => {
        await page.goto(l.home);
        await page.locator(`#${l.id}`).getByRole('link', { name: l.cta }).click();
        await expect(page).toHaveURL(new RegExp(`#${l.contact}$`));
        await expect(page.locator(`#${l.contact}`)).toBeInViewport();
      });
    });

    test('shows no prices or response-time numbers', async ({ page }) => {
      await page.goto(l.home);
      const text = await page.locator(`#${l.id}`).innerText();
      expect(text).not.toMatch(/\$|MXN|USD|\d+\s?(minutos?|minutes?)\b/i);
    });
  });
}

test('an unknown service in the address leaves the dropdown on its placeholder', async ({ page }) => {
  await page.goto('/?servicio=nope#contacto');
  await expect(page.locator('#service')).toHaveValue('');
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/en/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
