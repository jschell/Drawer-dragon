import { test } from './wording';

/**
 * Tests for the wording guard itself. `test.fail()` means "this test is expected
 * to fail": these pass only if the guard really does catch the word.
 */

async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForSelector('#panel .btn');
}

test('passes when nothing banned appears', async ({ page }) => {
  await ready(page);
});

test('fails when a game message says "secret", even one that disappears', async ({ page }) => {
  test.fail();
  await ready(page);
  await page.evaluate(() => (window as unknown as { __dk: { hud: { toast(s: string): void } } }).__dk.hud.toast('Keep it a secret!'));
});

test('fails when a button label says "secret", even if it is removed straight away', async ({ page }) => {
  test.fail();
  await ready(page);
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Secret door');
    document.body.appendChild(b);
    b.remove();
  });
});

test('fails when existing text is changed to "secrets"', async ({ page }) => {
  test.fail();
  await ready(page);
  await page.evaluate(() => {
    const h = document.querySelector('#panel h1')!;
    h.firstChild!.textContent = 'Dragon Secrets';
  });
});
