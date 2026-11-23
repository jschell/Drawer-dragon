import type { Page } from '@playwright/test';

/** The right answers to the Sharp Reader questions (content/reading.json). */
const READING_ANSWERS = [
  'Glass cases',
  'Knocks on the door',
  'Your little sibling',
  'The price per serving',
  "Crane's helpers",
  'One stone at a time',
  'Came back to visit',
  'A bright window shows from the street',
];

/** Taps OK on any message cards waiting to be read. */
export async function okCards(page: Page) {
  for (let i = 0; i < 10; i++) {
    const ok = page.locator('#msgcard:not([hidden]) [data-x="ok"]');
    if (!(await ok.isVisible())) return;
    await ok.click();
  }
}

/** Answers a Sharp Reader question correctly, if one is showing. */
export async function answerReading(page: Page) {
  if (!(await page.getByText('Sharp Reader').isVisible())) return;
  for (const label of READING_ANSWERS) {
    const b = page.locator('#panel .choice', { hasText: label });
    if (await b.isVisible()) {
      await b.click();
      return;
    }
  }
}

/** Picks a dragon name from the list, tapping "More names" until it shows up. */
export async function pickName(page: Page, name: string) {
  const b = page.locator(`#panel [data-name="${name}"]`);
  for (let i = 0; i < 12 && !(await b.isVisible()); i++) await page.getByRole('button', { name: 'More names ▶' }).click();
  await b.click();
  await page.getByRole('button', { name: `${name} it is!` }).click();
}
