import { expect, test, type Page } from '@playwright/test';

async function tapWorld(page: Page, x: number, y: number) {
  const box = (await page.locator('#game canvas').boundingBox())!;
  const px = box.x + (box.width * x) / 1334;
  const py = box.y + (box.height * y) / 750;
  if (test.info().project.use.hasTouch) await page.touchscreen.tap(px, py);
  else await page.mouse.click(px, py);
}

/** Hatch, skip the morning ("Go anyway"), and arrive at the library computer. */
async function toAfternoon(page: Page, speed = 1) {
  await page.goto(`/?speed=${speed}`);
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  for (let i = 0; i < 3; i++) {
    await tapWorld(page, 720, 446);
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: 'Pip' }).click();
  await page.getByRole('button', { name: "That's the name!" }).click();
  await page.locator('.act.go').click({ force: true });
  await page.getByRole('button', { name: 'Go anyway' }).click();
  await page.getByRole('button', { name: /the afternoon/ }).click();
  await page.getByRole('button', { name: 'Start searching' }).click();
  await expect(page.locator('#research')).toBeVisible();
}

test('afternoon: search, spot the copycat site, trust the real one, save the tip', async ({ page }) => {
  await toAfternoon(page);

  await page.locator('[data-chip="dragon"]').click();
  await page.getByRole('button', { name: '🔎 Search' }).click();
  await expect(page.locator('.search-msg')).toContainText('Lots of results');

  await page.locator('[data-chip="dragon"]').click(); // remove it
  await page.locator('[data-chip="hatchling"]').click();
  await page.locator('[data-chip="calm"]').click();
  await page.getByRole('button', { name: '🔎 Search' }).click();
  await expect(page.locator('.result')).toHaveCount(2);

  await page.locator('[data-open="trap-lookalike"]').click();
  await expect(page.locator('.url')).toHaveText('keeperscomons.keep');
  await page.getByRole('button', { name: 'Close the page' }).click();
  await page.locator('[data-check="who"]').click();
  await expect(page.locator('.check.open')).toContainText('only one m');
  await page.locator('[data-rate="distrust"]').click();
  await expect(page.locator('.hint')).toContainText('spotted a trap');

  await page.getByRole('button', { name: 'Back' }).click();
  await page.locator('[data-open="commons-calm"]').click();
  await expect(page.locator('[data-x="save"]')).toHaveCount(0); // must judge it first
  await page.locator('[data-rate="trust"]').click();
  await page.locator('[data-x="save"]').click();
  await expect(page.locator('.question')).toHaveClass(/done/);

  await page.getByRole('button', { name: 'Head home ➜' }).click();
  await expect(page.locator('#research')).toBeHidden();
  await expect(page.locator('#actions-evening')).toBeVisible();
  await expect(page.locator('[data-eve="blanket"]')).not.toHaveClass(/locked/);
  await expect(page.locator('.meter[data-k="attention"]')).toContainText('Unnoticed');
});

test('evening: an unprepared night still ends well, with honest choices only', async ({ page }) => {
  await toAfternoon(page, 20);
  await page.getByRole('button', { name: 'Head home ➜' }).click();
  await page.getByRole('button', { name: 'Head home ➜' }).click(); // second tap: go without the tip
  await expect(page.locator('[data-eve="blanket"]')).toHaveClass(/locked/);

  // With no preparation, the dragon squeaks when Kit knocks.
  await expect(page.getByText('What do you say?')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Tell Kit the secret' }).click();

  // Later visitors may also hear it; answer any of them honestly until bedtime.
  const goodnight = page.getByRole('button', { name: /^Goodnight, / });
  for (let i = 0; i < 60 && !(await goodnight.isVisible()); i++) {
    const reply = page.locator('#panel .choice').first();
    if (await reply.isVisible()) await reply.click();
    await page.waitForTimeout(250);
  }
  await goodnight.click();
  await expect(page.getByRole('heading', { name: /Day 1 complete/ })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#panel')).toContainText('Keeper Circle: Aunt June, Kit');
  await expect(page.locator('.sticker')).toContainText(['I Trusted My Family']);

  // Find out more: books and a library finder, behind a grown-up check.
  await page.evaluate(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(url);
      return null;
    }) as typeof window.open;
  });
  await page.getByRole('button', { name: '📖 Find out more' }).click();
  await expect(page.locator('#panel')).toContainText('Dragon Keepers by Kate Klimo');
  await page.getByRole('button', { name: /For grown-ups/ }).click();
  await page.getByLabel('Answer').fill('1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.gate-msg')).toContainText('ask a grown-up');
  const q = (await page.locator('#panel p', { hasText: 'what is' }).textContent())!;
  const [, a, b] = q.match(/(\d+) × (\d+)/)!;
  await page.getByLabel('Answer').fill(String(Number(a) * Number(b)));
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: /Dragon Keepers series on Goodreads/ }).click();
  await page.getByLabel('ZIP code').fill('981');
  await page.getByRole('button', { name: /Find libraries/ }).click();
  await expect(page.locator('.zip-msg')).toContainText('5-digit');
  await page.getByLabel('ZIP code').fill('98101');
  await page.getByRole('button', { name: /Find libraries/ }).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toEqual([
    'https://www.goodreads.com/series/45674-dragon-keepers',
    'https://www.google.com/maps/search/?api=1&query=public+library+near+98101',
  ]);
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  expect(stored, 'the ZIP code must not be saved').not.toContain('98101');

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: /Day 1 complete/ })).toBeVisible();
});
