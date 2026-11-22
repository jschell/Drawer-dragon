import { expect, test } from './wording';

type Hud = { state: { evening: { over: boolean; awaiting: string | null } }; dispatch(a: object): unknown };

test('Find out more: the books and a library finder, behind a grown-up check', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = ((url: string) => {
      (window as unknown as { __opened: string[] }).__opened.push(url);
      return null;
    }) as typeof window.open;
  });

  // Fast-forward through the day with the game's own actions, so this test
  // doesn't need to play every step (the other browser tests do that).
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  await page.evaluate(() => {
    const hud = (window as unknown as { __dk: { hud: Hud } }).__dk.hud;
    const go = (a: object) => hud.dispatch(a);
    for (let i = 0; i < 3; i++) go({ type: 'tapEgg' });
    go({ type: 'name', name: 'Pip' });
    go({ type: 'finishMorning' });
    go({ type: 'startAfternoon' });
    go({ type: 'startEvening' });
    for (let i = 0; i < 400 && !hud.state.evening.over; i++) {
      if (hud.state.evening.awaiting) go({ type: 'visitorChoice', choiceId: 'quiet' });
      go({ type: 'tick', dt: 1 });
    }
  });
  await page.getByRole('button', { name: /^Goodnight, / }).click();
  await expect(page.getByRole('heading', { name: /Day 1 complete/ })).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: '📖 Find out more' }).click();
  await expect(page.locator('#panel')).toContainText('Dragon Keepers by Kate Klimo');
  await page.getByRole('button', { name: /For grown-ups/ }).click();

  // A wrong answer keeps the links hidden.
  await page.getByLabel('Answer').fill('1');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('.gate-msg')).toContainText('ask a grown-up');
  await expect(page.getByRole('button', { name: /Goodreads/ })).toHaveCount(0);

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
