import type { Page } from '@playwright/test';
import { expect, test } from './wording';

/** Clicks a point in the 1334×750 game world, whatever the screen size. */
async function tapWorld(page: Page, x: number, y: number) {
  const box = (await page.locator('#game canvas').boundingBox())!;
  const px = box.x + (box.width * x) / 1334;
  const py = box.y + (box.height * y) / 750;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}

const EGG = { x: 720, y: 446 };

async function hatchAndName(page: Page, name = 'Pip') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  for (let i = 0; i < 3; i++) {
    await tapWorld(page, EGG.x, EGG.y);
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: "That's the name!" }).click();
}

test('a full morning: hatch, name, feed, mix spice, calm, finish', async ({ page }) => {
  const external: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (!/^(http:\/\/localhost|data:|blob:)/.test(u)) external.push(u);
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await hatchAndName(page);
  await expect(page.locator('#meters .meter')).toHaveCount(3);

  // Feed a balanced breakfast by tap-to-select, tap-the-dragon.
  await page.locator('.act[data-act="food"]').click();
  for (const food of ['beef', 'beef', 'greens', 'eggshell']) {
    await page.locator(`.food[data-food="${food}"]`).click();
    await tapWorld(page, EGG.x, EGG.y);
    await page.waitForTimeout(300);
  }
  await expect(page.locator('.meter[data-k="tummy"]')).toHaveClass(/ok/);

  // The recipe: 2 parts cinnamon to 1 part ginger.
  await page.locator('.act[data-act="spice"]').click();
  for (const s of ['cinnamon', 'cinnamon', 'ginger']) await page.locator(`[data-sp="${s}"]`).click();
  await expect(page.locator('.tin-count')).toHaveText('3 scoops');
  await page.getByRole('button', { name: 'Feed the mix' }).click();
  await expect(page.locator('.meter[data-k="spark"]')).toHaveClass(/ok/);

  await page.locator('.act[data-act="sock"]').click();
  await page.locator('.act[data-act="hum"]').click();
  await expect(page.locator('.meter[data-k="calm"]')).toHaveClass(/ok/);
  await expect(page.locator('.act.go')).toHaveClass(/ready/);

  await page.locator('.act.go').click({ force: true }); // it pulses when ready
  await expect(page.getByRole('heading', { name: /Morning done/ })).toBeVisible();
  await expect(page.locator('.sticker')).toContainText(['Balanced Plate', 'Master Mixer', 'Cozy Keeper']);

  expect(external, 'the game must make no outside network requests').toEqual([]);
  expect(errors).toEqual([]);
});

test('progress is saved and can be continued after a reload', async ({ page }) => {
  await hatchAndName(page, 'Ember');
  await page.locator('.act[data-act="hum"]').click();
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#meters .meter')).toHaveCount(3);
  expect(await page.evaluate(() => (window as unknown as { __dk: { hud: { state: { dragon: { name: string } } } } }).__dk.hud.state.dragon.name)).toBe('Ember');
});

test('wrong thought answers give hints, not penalties', async ({ page }) => {
  await hatchAndName(page);
  const bubble = page.locator('#bubble');
  await expect(bubble).toBeVisible({ timeout: 10_000 });
  await bubble.click({ force: true }); // it bobs gently
  await page.getByRole('button', { name: 'Give it water' }).click();
  await expect(page.locator('.hint')).toHaveCount(1);
  await page.getByRole('button', { name: 'Make a spice mix' }).click();
  await expect(page.locator('#overlay')).toBeHidden();
});

test('touch devices in portrait are asked to turn sideways', async ({ browser }, info) => {
  test.skip(!info.project.use.hasTouch, 'touch devices only');
  const { width, height } = info.project.use.viewport!;
  const ctx = await browser.newContext({ ...info.project.use, viewport: { width: Math.min(width, height), height: Math.max(width, height) } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByText('Turn your device sideways to play!')).toBeVisible();
  await ctx.close();
});
