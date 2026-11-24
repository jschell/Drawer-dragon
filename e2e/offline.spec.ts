import { okCards, pickName } from './helpers';
import { expect, test } from './wording';

/**
 * Offline play: after one visit, the game opens and plays with no connection.
 * Playwright's offline mode with service workers is reliable in Chromium; WebKit
 * (Safari) gets the same service worker, checked by hand on an iPad.
 */
test('after one visit, the game opens and plays with no connection', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline emulation with service workers is checked in Chromium');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Tap to wake the egg' })).toBeVisible();
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#panel h1')).toHaveText('Dragon Keeper');
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  for (let i = 0; i < 3; i++) await page.evaluate(() => (window as unknown as { __dk: { hud: { dispatch(a: object): void } } }).__dk.hud.dispatch({ type: 'tapEgg' }));
  await pickName(page, 'Pip');
  await okCards(page);
  await expect(page.locator('#actions')).toBeVisible();

  // Options in the address still work offline, and the save is still there.
  await page.goto('/?speed=4');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  await context.setOffline(false);
});

test('the game never asks for anything from outside its own site', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Checked once');
  const outside: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) outside.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  await page.waitForTimeout(1500);
  expect(outside).toEqual([]);
});


test('shows saving until the service worker has finished installing', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service worker lifecycle checked in Chromium');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.context().route('**/sw.js', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Tap to wake the egg' })).toBeVisible();
    await expect(page.locator('.offline-status [role="status"]')).toHaveText('Saving for offline play…');
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeHidden();
  } finally {
    release();
  }
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
});

test('a registration failure offers a working retry', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service worker lifecycle checked in Chromium');
  await page.addInitScript(() => {
    const register = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    let fail = true;
    navigator.serviceWorker.register = (...args) => {
      if (fail) {
        fail = false;
        return Promise.reject(new Error('Simulated registration failure'));
      }
      return register(...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('.offline-status [role="status"]')).toContainText('Offline setup incomplete');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
});

test('does not claim readiness for a missing file and retry repairs it', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service worker lifecycle checked in Chromium');
  await page.goto('/');
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
  await page.evaluate(async () => {
    const key = (await caches.keys()).find((k) => k.startsWith('dragon-keeper-'))!;
    await (await caches.open(key)).delete('./manifest.webmanifest');
  });
  await page.reload();
  await expect(page.locator('.offline-status [role="status"]')).toContainText('Offline setup incomplete');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.offline-status [role="status"]')).toHaveText('Ready to play offline ✓');
  await context.setOffline(false);
});
