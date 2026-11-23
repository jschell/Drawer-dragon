import type { Page } from '@playwright/test';
import { okCards, pickName } from './helpers';
import { expect, test } from './wording';

type Hud = {
  state: { day: number; part: string; evening: { over: boolean; awaiting: string | null; stones: { active: boolean } } };
  dispatch(a: object): unknown;
};

/** Runs game actions in the page, the same way the controls do. */
async function act(page: Page, fn: (go: (a: object) => unknown, hud: Hud) => void) {
  await page.evaluate(`(${fn.toString()})((a) => window.__dk.hud.dispatch(a), window.__dk.hud)`);
}

/** Fast-forwards through a whole evening, answering honestly with `choice`. */
const finishEvening = (choice: string) =>
  `(() => { const h = window.__dk.hud; for (let i = 0; i < 600 && !h.state.evening.over; i++) {
     if (h.state.evening.stones.active) h.dispatch({ type: 'stepOrder', order: ['blink', 'hungry', 'kit'], reason: 'quick' });
     if (h.state.evening.awaiting) h.dispatch({ type: 'visitorChoice', choiceId: '${choice}' });
     h.dispatch({ type: 'tick', dt: 1 }); } h.dispatch({ type: 'finishDay' }); })()`;

async function startGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  await act(page, (go) => {
    for (let i = 0; i < 3; i++) go({ type: 'tapEgg' });
  });
  await pickName(page, 'Pip');
  await okCards(page);
}

test('Day 2: shop at the corner store, compare prices and check the change', async ({ page }) => {
  test.setTimeout(120_000); // plays through several days, like the evening test
  await startGame(page);
  // Fast-forward Day 1 without telling anyone, then start Day 2 through the summary screen.
  await act(page, (go) => {
    go({ type: 'finishMorning' });
    go({ type: 'startAfternoon' });
    go({ type: 'startEvening' });
  });
  await page.evaluate(finishEvening('quiet'));
  await page.evaluate(() => document.querySelector<HTMLElement>('#overlay')!.hidden = true);
  await act(page, (go) => go({ type: 'nextDay' }));
  await act(page, (go) => go({ type: 'finishMorning' }));
  await act(page, (go) => go({ type: 'startAfternoon' }));

  await expect(page.locator('#store')).toBeVisible();
  await expect(page.locator('#store .pill')).toContainText('$6.00');

  // The "SUPER DEAL!" bag is worse value per serving.
  await page.locator('[data-unit="greens-bag"]').click();
  await page.locator('[data-unit="greens-bunch"]').click();
  await expect(page.locator('#store .unit').filter({ hasText: '$1.80' })).toContainText('60¢');
  await expect(page.locator('#store .unit').filter({ hasText: '50¢ ÷' })).toContainText('50¢');

  // Over budget can't be paid for.
  for (let i = 0; i < 2; i++) await page.locator('[data-add="beef-big"]').click();
  await expect(page.locator('.warn-text')).toBeVisible();
  await expect(page.locator('[data-x="pay"]')).toBeDisabled();
  await page.locator('[data-rm="beef-big"]').click();

  for (let i = 0; i < 3; i++) await page.locator('[data-add="greens-bunch"]').click();
  await expect(page.locator('#store .question')).toHaveClass(/done/);
  await expect(page.locator('.till')).toContainText('$5.40');

  await page.locator('[data-x="pay"]').click();
  for (let i = 0; i < 5; i++) await page.locator(`[data-coin="${i}"]`).click();
  await page.getByRole('button', { name: 'Hand it over' }).click();
  await expect(page.locator('.pay-box')).toContainText('Here\'s your change: 50¢');
  await page.getByRole('button', { name: '"No, that\'s not right."' }).click();
  await expect(page.locator('.pay-box .hint')).toContainText('should be 60¢');

  await page.locator('#store [data-x="home"]').click();
  await expect(page.locator('#store')).toBeHidden();
  const stickers = await page.evaluate(() => (window as unknown as { __dk: { hud: { state: { stickers: string[] } } } }).__dk.hud.state.stickers);
  expect(stickers).toEqual(expect.arrayContaining(['Smart Shopper', 'Change Checker']));
});

test('Day 3: Stepping Stones, Kit can be shown the dragon, and the chapter ends', async ({ page }) => {
  test.setTimeout(120_000); // plays through several days, like the evening test
  await startGame(page);
  for (let day = 1; day <= 2; day++) {
    await act(page, (go) => {
      go({ type: 'finishMorning' });
      go({ type: 'startAfternoon' });
      go({ type: 'startEvening' });
    });
    await page.evaluate(finishEvening('quiet'));
    await act(page, (go) => go({ type: 'nextDay' }));
  }
  await page.evaluate(() => document.querySelector<HTMLElement>('#overlay')!.hidden = true);
  await act(page, (go, hud) => {
    go({ type: 'scrub', amount: 100 });
    go({ type: 'ownUp', choice: 'sorry' });
    go({ type: 'finishMorning' });
    go({ type: 'startAfternoon' });
    go({ type: 'startEvening' });
    for (let i = 0; i < 60 && !hud.state.evening.stones.active; i++) go({ type: 'tick', dt: 1 });
  });

  // Three problems at once: put them in order, pick a reason.
  await expect(page.getByRole('heading', { name: 'Whoa, everything at once!' })).toBeVisible({ timeout: 5000 });
  await page.locator('[data-p="blink"]').click();
  await page.locator('[data-p="hungry"]').click();
  await page.locator('[data-p="kit"]').click();
  await page.getByRole('button', { name: "It's quick to do" }).click();
  await page.getByRole('button', { name: /One stone at a time/ }).click();
  // Read through any waiting message cards; the Stepping Stones feedback is among them.
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    const card = page.locator('#msgcard:not([hidden])');
    if (!(await card.isVisible())) break;
    seen.push((await card.textContent()) ?? '');
    await card.locator('[data-x="ok"]').click();
  }
  expect(seen.join(' ')).toContain('Closing the curtains first');

  // Kit spots the dragon. Showing Kit is always the first choice.
  await expect(page.locator('#panel')).toContainText('Is that... a DRAGON?', { timeout: 6000 });
  await expect(page.locator('#panel .choice').first()).toHaveText('Show Kit the dragon');
  await page.locator('#panel .choice').first().click();

  await page.evaluate(finishEvening('tell'));
  await page.evaluate(() => (window as unknown as { __dk: { hud: { showDaySummary(): Promise<void> } } }).__dk.hud.showDaySummary());
  await page.getByRole('button', { name: /What happens next/ }).click();
  await expect(page.getByRole('heading', { name: /Too big for the shoebox/ })).toBeVisible();
  await expect(page.locator('#panel')).toContainText('mom and dad already know');
  await page.getByRole('button', { name: /Chapter 1 complete/ }).click();
  await expect(page.getByRole('heading', { name: /Chapter 1: Hatchling, complete/ })).toBeVisible();
  await expect(page.locator('table.chapter tr')).toHaveCount(3);
  await expect(page.locator('#panel')).toContainText('Keeper Circle: Aunt June, Kit, Mom & Dad');
});
