import { expect, test } from '@playwright/test';
import { gotoReady } from './helpers';

// Weekend & holiday monitoring section and its entry points (specs/weekend-monitoring), in a real browser.
const locales = [
  { home: '/', id: 'monitoreo', nav: 'Monitoreo', param: 'servicio', contact: 'contacto', cta: 'Solicitar propuesta', cardLink: 'Conozca cómo funciona', footer: 'Monitoreo en fines de semana y días festivos' },
  { home: '/en/', id: 'monitoring', nav: 'Monitoring', param: 'service', contact: 'contact', cta: 'Request a proposal', cardLink: 'See how it works', footer: 'Weekend & holiday monitoring' },
] as const;

for (const l of locales) {
  test.describe(`monitoring (${l.home})`, () => {
    test('the footer link names weekends and holidays, and lands on the section', async ({ page }) => {
      await page.goto(l.home);
      const link = page.locator('footer').getByRole('link', { name: l.footer, exact: true });
      await expect(link).toBeVisible();
      await link.click();
      await expect(page.locator(`#${l.id}`)).toBeInViewport();
    });

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

    test('the FAQ shows only the custom "+", no native disclosure triangle (WebKit draws one by default)', async ({ page }) => {
      await gotoReady(page, l.home);
      // A native marker would sit before the question and push its text right; measure where the text starts.
      const gap = await page.locator(`#${l.id} summary`).first().evaluate((summary) => {
        const text = [...summary.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
        const range = document.createRange();
        range.selectNodeContents(text!);
        const style = getComputedStyle(summary);
        return range.getBoundingClientRect().left - (summary.getBoundingClientRect().left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth));
      });
      expect(gap).toBeLessThan(1);
    });

    test('the Services card link reaches the section', async ({ page }) => {
      await page.goto(l.home);
      const card = page.locator('article', { has: page.locator('#service-area-monitoring') });
      await card.getByRole('link', { name: l.cardLink }).click();
      await expect(page).toHaveURL(new RegExp(`#${l.id}$`));
      await expect(page.locator(`#${l.id}`)).toBeInViewport();
    });

    test('an unknown service in the address leaves the dropdown on its placeholder', async ({ page }) => {
      await page.goto(`${l.home}?${l.param}=nope#${l.contact}`);
      await expect(page.locator('#service')).toHaveValue('');
    });

    test("the other locale's parameter name does not preselect anything", async ({ page }) => {
      const other = l.param === 'servicio' ? 'service' : 'servicio';
      await page.goto(`${l.home}?${other}=weekend-holiday-monitoring#${l.contact}`);
      await expect(page.locator('#service')).toHaveValue('');
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

test('the page never scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/en/']) {
    await gotoReady(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
