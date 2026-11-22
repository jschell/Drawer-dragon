import type { Page } from '@playwright/test';
import { expect, test } from './wording';

async function tapWorld(page: Page, x: number, y: number) {
  const box = (await page.locator('#game canvas').boundingBox())!;
  const px = box.x + (box.width * x) / 1334;
  const py = box.y + (box.height * y) / 750;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}

async function hatch(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  for (let i = 0; i < 3; i++) {
    await tapWorld(page, 720, 446);
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Pip' }).click();
  await page.getByRole('button', { name: "That's the name!" }).click();
}

type Rect = { left: number; top: number; right: number; bottom: number };
const overlaps = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test('the food tray never covers the dragon', async ({ page }) => {
  await hatch(page);
  await page.locator('.act[data-act="food"]').click();
  await expect(page.locator('#tray')).toBeVisible();
  const dragon: Rect = await page.evaluate(() =>
    (window as unknown as { __dk: { hud: { scene: { dragonClientRect(): Rect } } } }).__dk.hud.scene.dragonClientRect(),
  );
  const tray = (await page.locator('#tray').boundingBox())!;
  const trayRect = { left: tray.x, top: tray.y, right: tray.x + tray.width, bottom: tray.y + tray.height };
  expect(overlaps(trayRect, dragon), `tray ${JSON.stringify(trayRect)} overlaps dragon ${JSON.stringify(dragon)}`).toBe(false);

  // The tray stays fully on screen.
  const vp = page.viewportSize()!;
  expect(trayRect.right).toBeLessThanOrEqual(vp.width);
  expect(trayRect.top).toBeGreaterThanOrEqual(0);

  // Feeding still works by tapping a food, then the dragon.
  await page.locator('.food[data-food="beef"]').click();
  await tapWorld(page, 720, 446);
  await expect(page.locator('#toast')).toContainText('gobbles up the beef');
});

test('checking a website keeps your place on the page', async ({ page }) => {
  await hatch(page);
  await page.locator('.act.go').click({ force: true });
  await page.getByRole('button', { name: 'Go anyway' }).click();
  await page.getByRole('button', { name: /the afternoon/ }).click();
  await page.getByRole('button', { name: 'Thanks, Aunt June!' }).click();
  await page.getByRole('button', { name: 'Start searching' }).click();
  await page.locator('[data-chip="hatchling"]').click();
  await page.locator('[data-chip="calm"]').click();
  await page.getByRole('button', { name: '🔎 Search' }).click();
  await page.locator('[data-open="commons-calm"]').click();

  const viewport = page.locator('.viewport');
  const scrollable = await viewport.evaluate((el) => el.scrollHeight > el.clientHeight + 40);
  test.skip(!scrollable, 'the whole page fits on this screen, so there is nothing to scroll');

  // Scroll down to the checks, then tap each one: the page must not jump back to the top.
  await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight));
  const before = await viewport.evaluate((el) => el.scrollTop);
  expect(before).toBeGreaterThan(0);
  for (const k of ['who', 'when', 'why', 'proof']) {
    await page.locator(`[data-check="${k}"]`).click();
    await expect(page.locator(`[data-check="${k}"]`)).toHaveClass(/open/);
    const top = await viewport.evaluate((el) => el.scrollTop);
    expect(top, `after checking "${k}"`).toBeGreaterThanOrEqual(before - 5);
  }

  // Rating it shows the feedback and tip without scrolling away.
  await page.locator('[data-rate="trust"]').click();
  await expect(page.locator('.tip-box')).toBeInViewport({ timeout: 3000 });
});
