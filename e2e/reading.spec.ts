import type { Page } from '@playwright/test';
import { okCards } from './helpers';
import { expect, test } from './wording';

type Hud = { state: { dragon: { calm: number }; reading: { stars: number; readTo: string[] }; stickers: string[] } };
const hud = (page: Page) => page.evaluate(() => (window as unknown as { __dk: { hud: Hud } }).__dk.hud.state);

async function hatch(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  await page.evaluate(() => {
    const h = (window as unknown as { __dk: { hud: { dispatch(a: object): unknown } } }).__dk.hud;
    for (let i = 0; i < 3; i++) h.dispatch({ type: 'tapEgg' });
  });
  await page.getByRole('button', { name: 'Pip' }).click();
  await page.getByRole('button', { name: "That's the name!" }).click();
}

test('important messages wait for OK, and the 📜 log keeps them', async ({ page }) => {
  await hatch(page);
  // The morning introduction is a card: it stays until the player taps OK.
  const card = page.locator('#msgcard');
  await expect(card).toBeVisible();
  await expect(card).toContainText("It's hungry, chilly and a bit scared");
  await page.waitForTimeout(5000);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'OK' }).click();
  await expect(card).toBeHidden();

  await page.locator('#btn-log').click();
  await expect(page.locator('.msglog')).toContainText("It's hungry, chilly and a bit scared");
  await page.getByRole('button', { name: 'Back to the game' }).click();
});

test('the spice tin keeps a wrong mix, explains why, offers hints, and only feeds the right mix', async ({ page }) => {
  await hatch(page);
  await okCards(page);
  await page.locator('.act[data-act="spice"]').click();

  // Chili isn't in the recipe: nothing is fed, and the tin stays open.
  await page.locator('[data-sp="chili"]').click();
  await page.getByRole('button', { name: 'Feed the mix' }).click();
  await expect(page.locator('.spice-feedback')).toContainText("aren't in the recipe");
  await expect(page.locator('.tin-count')).toHaveText('1 scoop');

  // A wrong ratio: still open, still in the tin, with Aunt June's hints on offer.
  await page.getByRole('button', { name: 'Empty tin' }).click();
  await page.locator('[data-sp="cinnamon"]').click();
  await page.locator('[data-sp="ginger"]').click();
  await page.locator('[data-sp="ginger"]').click();
  await page.getByRole('button', { name: 'Feed the mix' }).click();
  await expect(page.locator('.spice-feedback')).toContainText('lumpy');
  await page.getByRole('button', { name: /Ask Aunt June/ }).click();
  await expect(page.locator('#panel .hint').filter({ hasText: 'for every 2 scoops' })).toBeVisible();

  // The right mix is fed and the tin closes.
  await page.getByRole('button', { name: 'Empty tin' }).click();
  for (const s of ['cinnamon', 'cinnamon', 'ginger']) await page.locator(`[data-sp="${s}"]`).click();
  await page.getByRole('button', { name: 'Feed the mix' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('.meter[data-k="spark"]')).toHaveClass(/ok/);
});

test("Sharp Reader: a wrong answer shows where to look, a right first answer earns a star; reading to Pip counts once", async ({ page }) => {
  await hatch(page);
  await okCards(page);
  await page.locator('.act.go').click({ force: true });
  await page.getByRole('button', { name: 'Go anyway' }).click();
  await page.getByRole('button', { name: /the afternoon/ }).click();

  // Read Aunt June's story to Pip: it counts once.
  const readPip = page.getByRole('button', { name: /I read it to Pip/ });
  await readPip.click();
  await expect(page.getByRole('button', { name: /Pip loved listening/ })).toBeDisabled();
  expect((await hud(page)).reading.readTo).toEqual(['1:june']);

  await page.getByRole('button', { name: 'Thanks, Aunt June!' }).click();
  await expect(page.getByText('Sharp Reader')).toBeVisible();
  await page.getByRole('button', { name: 'Cardboard boxes' }).click();
  await expect(page.locator('.look-again mark')).toHaveText('keeps them in glass cases');
  await page.getByRole('button', { name: 'Glass cases' }).click();
  expect((await hud(page)).reading.stars).toBe(0); // not on the first try, so no star

  // The library question, answered right first time, earns a star.
  await page.getByRole('button', { name: 'Start searching' }).click();
  await page.getByRole('button', { name: 'Knocks on the door' }).click();
  expect((await hud(page)).reading.stars).toBe(1);
  await expect(page.locator('#research')).toBeVisible();
});
