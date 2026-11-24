import type { Page } from '@playwright/test';
import { okCards, pickName } from './helpers';
import { expect, test } from './wording';

type Dk = { __dk: { hud: { state: any; dispatch(a: object): unknown } & Record<string, any> } };
const state = (page: Page) => page.evaluate(() => (window as unknown as Dk).__dk.hud.state);

async function start(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) (window as unknown as Dk).__dk.hud.dispatch({ type: 'tapEgg' });
  });
  await pickName(page, 'Pip');
  await okCards(page);
}

test('toys in the morning, and a photo in the scrapbook at the end of the day', async ({ page }) => {
  await start(page);
  await page.locator('.act[data-act="play"]').click();
  await expect(page.locator('#panel h2')).toContainText('Play with Pip');
  await expect(page.locator('#panel')).toContainText('first trick tomorrow');
  await page.locator('[data-toy="yarn"]').click();
  await expect(page.locator('#toast')).toContainText('yarn');
  expect((await state(page)).play.toyCount).toEqual({ yarn: 1 });
  // Again straight away: the dragon needs a rest first, so nothing is gained.
  await page.locator('.act[data-act="play"]').click();
  await page.locator('[data-toy="yarn"]').click();
  await expect(page.locator('#toast')).toContainText('catching its breath');
  expect((await state(page)).play.toyCount).toEqual({ yarn: 1 });

  // Fast-forward to bedtime, then open the scrapbook from the summary.
  await page.evaluate(() => {
    const h = (window as unknown as Dk).__dk.hud;
    h.dispatch({ type: 'finishMorning' });
    h.dispatch({ type: 'startAfternoon' });
    h.dispatch({ type: 'startEvening' });
    for (let i = 0; i < 600 && !h.state.evening.over; i++) {
      if (h.state.evening.awaiting) h.dispatch({ type: 'visitorChoice', choiceId: 'quiet' });
      h.dispatch({ type: 'tick', dt: 1 });
    }
  });
  await page.getByRole('button', { name: /Goodnight/ }).click({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /Day 1 complete/ })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800); // the photo is shrunk and stored
  await page.getByRole('button', { name: '📷 Scrapbook' }).click();
  await expect(page.locator('.scrapbook img')).toHaveCount(1);
  await expect(page.locator('.scrapbook figcaption')).toContainText('Day 1');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: /Day 1 complete/ })).toBeVisible();
});

test('tricks on Day 2, a morning surprise, and free play after the ending', async ({ page }) => {
  await start(page);
  // Jump to Day 2's morning through the real next-day path.
  await page.evaluate(() => {
    const h = (window as unknown as Dk).__dk.hud;
    h.dispatch({ type: 'finishMorning' });
    h.dispatch({ type: 'startAfternoon' });
    h.dispatch({ type: 'startEvening' });
    for (let i = 0; i < 600 && !h.state.evening.over; i++) {
      if (h.state.evening.awaiting) h.dispatch({ type: 'visitorChoice', choiceId: 'quiet' });
      h.dispatch({ type: 'tick', dt: 1 });
    }
    h.dispatch({ type: 'finishDay' });
    h.goToNextDay();
  });
  await expect(page.locator('#msgcard')).toBeVisible({ timeout: 5000 });
  await page.locator('#msgcard [data-x="ok"]').click(); // the morning intro
  await expect(page.locator('#msgcard')).toContainText('hide-and-seek');
  await page.locator('#msgcard [data-x="ok"]').click();
  await expect(page.locator('#msgcard')).toContainText('New trick');
  await okCards(page);
  await page.locator('.act[data-act="play"]').click();
  await page.locator('[data-trick="spin"]').click();
  await expect(page.locator('#toast')).toContainText('spins');
  expect((await state(page)).play.tricksToday).toEqual(['spin']);

  // Free play: pretend the week is over and the ending chosen.
  await page.evaluate(() => {
    const h = (window as unknown as Dk).__dk.hud;
    h.state = { ...h.state, part: 'end', day: 9, world: { ...h.state.world, ending: 'fly' } };
    h.startFreePlay();
  });
  await expect(page.locator('#msgcard')).toContainText('next summer');
  await okCards(page);
  await expect(page.locator('#actions-free')).toBeVisible();
  await page.locator('[data-free="play"]').click();
  await expect(page.locator('[data-trick]')).toHaveCount(4);
  await page.locator('[data-trick="loop"]').click();
  await expect(page.locator('#toast')).toContainText('loop-the-loop');
  // Free play is saved, so Continue comes back to it.
  await page.reload();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('#actions-free')).toBeVisible();
});
