import { describe, expect, it } from 'vitest';

/**
 * Source check: every content file and source file (art, scenes, UI, rules).
 * The browser tests add a second check on what actually appears on screen (e2e/wording.ts).
 *
 * Child-safety wording (spec §5.4): child-safety programs teach kids that being asked
 * to keep secrets from family is a warning sign. The game keeps the dragon *safe*
 * from strangers; it never asks kids to keep a secret. Nothing players see may say "secret".
 */
const files: Record<string, string> = {
  ...import.meta.glob<string>('../content/*.json', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../src/**/*.{ts,css}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../index.html', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../public/manifest.webmanifest', { query: '?raw', import: 'default', eager: true }),
};

describe('wording', () => {
  it('checks the player-facing files', () => {
    expect(Object.keys(files).length).toBeGreaterThan(15);
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['../src/art/svg.ts', '../src/scenes/BedroomScene.ts', '../content/evening.json']));
  });

  it.each(Object.entries(files))('%s never uses the word "secret"', (_file, text) => {
    const lines = text.split('\n').filter((l) => /\bsecret/i.test(l) && !/^\s*(\*|\/\/)/.test(l));
    expect(lines).toEqual([]);
  });
});
