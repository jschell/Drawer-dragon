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
  // Wait until the service worker has stored the game and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#panel h1')).toHaveText('Dragon Keeper');
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
