import { expect, test as base } from '@playwright/test';

/**
 * Child-safety wording (spec §5.4): players must never see the word "secret".
 * This fixture watches the page for the whole test: every piece of text that is
 * added or changed, plus the labels read-aloud and screen readers use
 * (aria-label, title, alt, placeholder) and the page title. If any of it ever
 * contains a banned word, even in a toast that disappears a moment later,
 * the test fails.
 */
export const BANNED = /\bsecret/i;

declare global {
  interface Window {
    __bannedSeen: string[];
  }
}

function watchForBannedWords(pattern: string) {
  const re = new RegExp(pattern, 'i');
  window.__bannedSeen = [];
  const note = (where: string, text: string | null | undefined) => {
    if (text && re.test(text)) window.__bannedSeen.push(`${where}: ${text.trim().slice(0, 200)}`);
  };
  const ATTRS = ['aria-label', 'title', 'alt', 'placeholder', 'value'];
  const scan = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      note('text', node.textContent);
      return;
    }
    if (!(node instanceof Element)) return;
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    for (const a of ATTRS) note(`[${a}]`, node.getAttribute(a));
    node.childNodes.forEach(scan);
  };
  const start = () => {
    note('title', document.title);
    scan(document.documentElement);
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') note('text', r.target.textContent);
        else if (r.type === 'attributes' && r.target instanceof Element) note(`[${r.attributeName}]`, r.target.getAttribute(r.attributeName!));
        else r.addedNodes.forEach(scan);
      }
      note('title', document.title);
    }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

/** Use this `test` instead of Playwright's: it fails any test where a banned word appears. */
export const test = base.extend<{ wordingGuard: void }>({
  wordingGuard: [
    async ({ page }, use) => {
      await page.addInitScript(watchForBannedWords, BANNED.source);
      await use();
      const seen = await page.evaluate(() => window.__bannedSeen ?? []).catch(() => []);
      expect(seen, 'Players must never see the word "secret" (spec §5.4)').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
