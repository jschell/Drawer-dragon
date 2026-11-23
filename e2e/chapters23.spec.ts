import type { Page } from '@playwright/test';
import { answerReading, okCards, pickName } from './helpers';
import { expect, test } from './wording';

/** Where review screenshots go when SHOTS is set (e.g. SHOTS=/tmp/shots). */
const SHOTS = process.env.SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** Fast-forwards the current evening (no story moment), answering visitors with `choice`. */
const finishEvening = (choice: string) =>
  `(() => { const h = window.__dk.hud; for (let i = 0; i < 600 && !h.state.evening.over; i++) {
     if (h.state.evening.stones.active) h.dispatch({ type: 'stepOrder', order: ['blink', 'hungry', 'kit'], reason: 'quick' });
     if (h.state.evening.awaiting) h.dispatch({ type: 'visitorChoice', choiceId: '${choice}' });
     if (h.state.evening.special.active) return;
     h.dispatch({ type: 'tick', dt: 1 }); } })()`;

async function go(page: Page, a: object) {
  await page.evaluate((x) => (window as unknown as { __dk: { hud: { dispatch(a: object): unknown } } }).__dk.hud.dispatch(x), a);
}
async function call(page: Page, method: string) {
  await page.evaluate((m) => (window as unknown as { __dk: { hud: Record<string, () => void> } }).__dk.hud[m](), method);
}
const state = (page: Page) => page.evaluate(() => (window as unknown as { __dk: { hud: { state: any } } }).__dk.hud.state);

/** Ends today (fast) and starts the next morning through the real "next day" path. */
async function nextMorning(page: Page) {
  await page.evaluate(finishEvening('quiet'));
  await go(page, { type: 'finishDay' });
  await call(page, 'goToNextDay');
  await page.waitForTimeout(900);
  await okCards(page);
}

/** Skips morning care (tested elsewhere) and opens the afternoon. */
async function toAfternoon(page: Page) {
  await page.evaluate(() => ((document.querySelector('#overlay') as HTMLElement).hidden = true));
  await go(page, { type: 'finishMorning' });
  await call(page, 'startAfternoonFlow');
}

test('Chapters 2–3: treehouse, flight, fire, Crane, the Evidence Board, the map and the choice', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to wake the egg' }).click();
  for (let i = 0; i < 3; i++) await go(page, { type: 'tapEgg' });
  await pickName(page, 'Pip');
  await okCards(page);
  // Days 1–3, fast, keeping the dragon quiet so Day 4 has the telling scene.
  for (let d = 1; d <= 3; d++) {
    await go(page, { type: 'finishMorning' });
    await go(page, { type: 'startAfternoon' });
    await go(page, { type: 'startEvening' });
    if (d < 3) await nextMorning(page);
  }

  // ---- Day 4: family meeting, insulation, poster clues ----
  await nextMorning(page);
  expect((await state(page)).day).toBe(4);
  await expect(page.locator('#panel h2')).toContainText('Family meeting');
  await shot(page, '01-family');
  await page.getByRole('button', { name: 'Show Mom, Dad and Kit the dragon' }).click();
  await okCards(page);
  await expect(page.locator('#panel h2')).toContainText('treehouse nest');
  await page.locator('[data-test="foil"]').click();
  await page.locator('[data-pick="foil"]').click();
  await page.locator('[data-pick="newspaper"]').click();
  await page.locator('[data-x="build"]').click();
  await expect(page.locator('#panel .hint')).toContainText('Test the others');
  await page.locator('[data-test="wool"]').click();
  await page.locator('[data-test="straw"]').click();
  await page.locator('[data-pick="wool"]').click();
  await page.locator('[data-pick="straw"]').click();
  await shot(page, '02-insulation');
  await page.locator('[data-x="build"]').click();
  await okCards(page);
  expect((await state(page)).activity.done).toBe(true);
  expect((await state(page)).world.circle).toEqual(expect.arrayContaining(['parents', 'kit']));

  await toAfternoon(page);
  await expect(page.locator('#panel h2')).toContainText('poster');
  await page.locator('[data-clue="reward"]').click();
  await expect(page.locator('#panel .hint')).toContainText('not a clue');
  for (const id of ['no-phone', 'logo']) await page.locator(`[data-clue="${id}"]`).click();
  await shot(page, '03-poster');
  await page.locator('[data-clue="handwriting"]').click();
  await page.getByRole('button', { name: 'Head home 🌙' }).click();
  await expect(page.locator('#panel h2')).toContainText('Evening, Day 4');
  await shot(page, '04-treehouse-evening');
  await page.locator('#panel [data-x="go"]').click();
  await answerReading(page);

  // ---- Day 5: flight practice with a bar graph ----
  await nextMorning(page);
  await expect(page.locator('#panel h2')).toContainText('Flight practice');
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-x="flap"]').click();
    await page.waitForTimeout(350);
  }
  await page.locator('[data-x="graph"]').click();
  await shot(page, '05-flight');
  const tries: number[] = (await state(page)).activity.tries;
  const right = Math.max(...tries) - tries[0];
  await page.locator(`[data-a="${right}"]`).click();
  await okCards(page);
  expect((await state(page)).activity.done).toBe(true);
  await toAfternoon(page);
  await page.getByRole('button', { name: 'Start searching' }).click();
  await answerReading(page);
  await expect(page.locator('#research')).toBeVisible();
  await go(page, { type: 'startEvening' });
  await page.locator('#panel [data-x="go"]').click();

  // ---- Day 6: fire control, then Crane at the door ----
  await nextMorning(page);
  await expect(page.locator('#panel h2')).toContainText('Fire control');
  await shot(page, '06-fire');
  for (const ab of ['glow', 'puff', 'spark']) await page.locator(`[data-f="${ab}"]`).click();
  await okCards(page);
  expect((await state(page)).stickers).toContain('Fire Safety Expert');
  await toAfternoon(page);
  await page.getByRole('button', { name: 'Start searching' }).click();
  await answerReading(page);
  await go(page, { type: 'startEvening' });
  await page.locator('#panel [data-x="go"]').click();
  await page.evaluate(finishEvening('quiet'));
  await expect(page.locator('#panel h2')).toContainText('Someone at the door');
  await shot(page, '07-crane');
  for (const id of ['boots', 'remote', 'card']) await page.locator(`[data-clue="${id}"]`).click();
  await okCards(page);
  expect((await state(page)).world.evidence).toEqual(expect.arrayContaining(['poster', 'business-card']));

  // ---- Day 7: the Evidence Board and the meeting ----
  await nextMorning(page);
  await toAfternoon(page);
  await expect(page.locator('#panel h2')).toContainText('Evidence Board');
  await page.locator('[data-ev="mean-face"]').click();
  const s7 = await state(page);
  const strong = s7.world.evidence.filter((id: string) => id !== 'mean-face').slice(0, 2);
  for (const id of strong) await page.locator(`[data-ev="${id}"]`).click();
  await page.locator('#panel [data-x="go"]').click();
  await expect(page.locator('#panel .hint')).toContainText("isn't evidence");
  await page.locator(`[data-ev="${s7.world.evidence.filter((id: string) => !strong.includes(id))[0]}"]`).click();
  await shot(page, '08-board');
  await page.locator('#panel [data-x="go"]').click();
  await expect(page.locator('#panel h2')).toContainText('neighborhood meeting');
  await shot(page, '09-meeting');
  await page.locator('#panel [data-x="go"]').click();
  await expect(page.locator('#panel')).toContainText('BLINK');
  await page.getByRole('button', { name: 'Head home 🌙' }).click();
  expect((await state(page)).world.craneGone).toBe(true);
  await page.locator('#panel [data-x="go"]').click();

  // ---- Day 8: June's letter, the map, the hill flight ----
  await nextMorning(page);
  await expect(page.locator('#panel h2')).toContainText('letter');
  await shot(page, '10-letter');
  await page.locator('#panel [data-x="go"]').click();
  await answerReading(page);
  await okCards(page);
  await toAfternoon(page);
  await expect(page.locator('#panel h2')).toContainText('Mapping');
  await page.locator('[data-m="South-west"]').click();
  await expect(page.locator('#panel .hint')).toContainText('north');
  await shot(page, '11-map');
  await page.locator('[data-m="North-east"]').click();
  await page.locator('[data-m="60 miles"]').click();
  await page.locator('[data-m="8 servings"]').click();
  await page.getByRole('button', { name: 'Head home 🌙' }).click();
  await page.locator('#panel [data-x="go"]').click();
  await page.evaluate(finishEvening('quiet'));
  await expect(page.locator('#panel h2')).toContainText('Larkspur Hill');
  for (let i = 0; i < 3; i++) {
    await page.locator('[data-x="flap"]').click();
    await page.waitForTimeout(300);
  }
  await okCards(page);

  // ---- Day 9: favorites, farewells, the choice and the epilogue ----
  await nextMorning(page);
  await expect(page.locator('#panel h2')).toContainText('special last morning');
  for (const o of ['Apple slices', 'Fuzzy blue', 'The top of the hill']) await page.getByRole('button', { name: o }).click();
  await page.locator('#panel [data-x="go"]').click();
  await okCards(page);
  await toAfternoon(page);
  for (let i = 0; i < 3; i++) await page.locator('#panel [data-x="next"]').click();
  await page.locator('#panel [data-x="go"]').click();
  await page.evaluate(finishEvening('quiet'));
  await expect(page.locator('#panel h2')).toContainText('Choose together');
  await shot(page, '12-choice');
  await page.getByRole('button', { name: /Fly with the flock/ }).click();
  await okCards(page);
  await page.evaluate(finishEvening('quiet'));
  await page.getByRole('button', { name: /Goodnight/ }).click();
  await page.getByRole('button', { name: 'What happens next? ➜' }).click({ timeout: 10_000 });
  await expect(page.locator('#panel h2')).toContainText('next summer');
  await shot(page, '13-epilogue');
  await page.getByRole('button', { name: 'The end ➜' }).click();
  await expect(page.locator('#panel h2')).toContainText('The End');
  await shot(page, '14-the-end');
  expect((await state(page)).world.ending).toBe('fly');
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
});
