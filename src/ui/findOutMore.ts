import { z } from 'zod';
import resourcesJson from '../../content/resources.json';
import { sfx } from '../audio/sfx';

/**
 * "Find out more" at the end of the day: the books that inspired the game and a
 * library finder. These are the only links out of the game (spec §10.4), so they
 * sit behind a grown-up check, and the ZIP code is never stored or sent anywhere
 * except in the map-search link a grown-up chooses to open.
 */

const LinkSchema = z.object({ label: z.string(), url: z.string().url().startsWith('https://') });

export const ResourcesSchema = z
  .object({
    allowedHosts: z.array(z.string()).min(1),
    inspiration: z.object({
      series: z.string(),
      author: z.string(),
      blurb: z.string(),
      disclaimer: z.string(),
      links: z.array(LinkSchema).min(1),
    }),
    libraryFinder: z.object({
      searchUrl: z.string().url().startsWith('https://'),
      zipQuery: z.string().includes('{zip}'),
      nearMeQuery: z.string(),
    }),
  })
  .superRefine((r, ctx) => {
    const urls = [...r.inspiration.links.map((l) => l.url), r.libraryFinder.searchUrl];
    for (const u of urls) {
      if (!r.allowedHosts.includes(new URL(u).host)) ctx.addIssue({ code: 'custom', message: `Link host not allowed: ${u}` });
    }
  });

export const resources = ResourcesSchema.parse(resourcesJson);

/** A US ZIP code: exactly five digits. */
export function isZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

export function libraryUrl(zip?: string): string {
  const f = resources.libraryFinder;
  const q = zip ? f.zipQuery.replace('{zip}', zip.trim()) : f.nearMeQuery;
  return f.searchUrl + encodeURIComponent(q).replace(/%20/g, '+');
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function openExternal(url: string) {
  const host = new URL(url).host;
  if (!resources.allowedHosts.includes(host)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Renders the Find out more flow into the panel. `onBack` returns to the summary. */
export function showFindOutMore(panel: HTMLElement, onBack: () => void) {
  const r = resources.inspiration;
  panel.innerHTML = `
    <h2>📖 Find out more</h2>
    <p>Did you like raising a dragon? There are real books about kids who look after a dragon!</p>
    <p class="riddle">${esc(r.series)} by ${esc(r.author)}</p>
    <p class="sub">${esc(r.blurb)}</p>
    <p>Libraries lend books for free. <b>Ask a grown-up</b> to help you find these books, or your nearest library.</p>
    <div class="row">
      <button class="btn" data-x="grownup">👩‍👧 For grown-ups</button>
      <button class="btn ghost" data-x="back">Back</button>
    </div>
    <p class="sub small-print">${esc(r.disclaimer)}</p>`;
  panel.querySelector('[data-x="back"]')!.addEventListener('click', onBack);
  panel.querySelector('[data-x="grownup"]')!.addEventListener('click', () => {
    sfx.play('tap');
    grownUpGate(panel, onBack);
  });
}

/** A light check that a grown-up is here before any link leaves the game. */
function grownUpGate(panel: HTMLElement, onBack: () => void) {
  const a = 12 + Math.floor(Math.random() * 18);
  const b = 3 + Math.floor(Math.random() * 7);
  panel.innerHTML = `
    <h2>👩‍👧 Grown-ups only</h2>
    <p>The next page opens websites outside the game.</p>
    <p><b>Grown-up, please answer:</b> what is ${a} × ${b}?</p>
    <div class="row"><input class="name" inputmode="numeric" autocomplete="off" aria-label="Answer" /></div>
    <p class="gate-msg sub"></p>
    <div class="row">
      <button class="btn" data-x="check">Continue</button>
      <button class="btn ghost" data-x="back">Back</button>
    </div>`;
  const input = panel.querySelector<HTMLInputElement>('input')!;
  const check = () => {
    if (Number(input.value.trim()) === a * b) {
      sfx.play('sparkle');
      grownUpPage(panel, onBack);
    } else {
      sfx.play('sniff');
      panel.querySelector('.gate-msg')!.textContent = 'Not quite. Please ask a grown-up to help.';
      input.value = '';
    }
  };
  panel.querySelector('[data-x="check"]')!.addEventListener('click', check);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && check());
  panel.querySelector('[data-x="back"]')!.addEventListener('click', onBack);
  input.focus();
}

function grownUpPage(panel: HTMLElement, onBack: () => void) {
  const r = resources.inspiration;
  panel.innerHTML = `
    <h2>For grown-ups</h2>
    ${navigator.onLine ? '' : '<p class="hint">📶 These links need the internet. The game itself works offline.</p>'}
    <div class="find-cols">
      <div>
        <p><b>📚 The books</b></p>
        <div class="col">${r.links.map((l, i) => `<button class="choice" data-link="${i}">${esc(l.label)} ↗</button>`).join('')}</div>
      </div>
      <div>
        <p><b>🏛️ Find a library</b></p>
        <div class="zip-row">
          <input class="name zip" inputmode="numeric" maxlength="5" autocomplete="off" placeholder="ZIP code" aria-label="ZIP code" />
          <button class="btn small" data-x="zip">Find libraries ↗</button>
        </div>
        <p class="zip-msg sub"></p>
        <button class="btn ghost small" data-x="near">Use my location instead ↗</button>
        <p class="sub small-print">The ZIP code isn't saved. It's only used to open a map search for public libraries near you.</p>
      </div>
    </div>
    <div class="row"><button class="btn ghost" data-x="back">Back</button></div>
    <p class="sub small-print">${esc(r.disclaimer)}</p>`;
  panel.querySelectorAll<HTMLButtonElement>('[data-link]').forEach((b) =>
    b.addEventListener('click', () => openExternal(r.links[Number(b.dataset.link)].url)),
  );
  const zip = panel.querySelector<HTMLInputElement>('input.zip')!;
  zip.addEventListener('input', () => (zip.value = zip.value.replace(/\D/g, '').slice(0, 5)));
  const find = () => {
    if (!isZip(zip.value)) {
      panel.querySelector('.zip-msg')!.textContent = 'Please enter a 5-digit ZIP code.';
      return;
    }
    panel.querySelector('.zip-msg')!.textContent = '';
    openExternal(libraryUrl(zip.value));
  };
  panel.querySelector('[data-x="zip"]')!.addEventListener('click', find);
  zip.addEventListener('keydown', (e) => e.key === 'Enter' && find());
  panel.querySelector('[data-x="near"]')!.addEventListener('click', () => openExternal(libraryUrl()));
  panel.querySelector('[data-x="back"]')!.addEventListener('click', onBack);
}
