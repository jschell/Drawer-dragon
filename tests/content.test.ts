import { describe, expect, it } from 'vitest';
import items from '../content/items.json';
import recipes from '../content/recipes.json';
import thoughts from '../content/thoughts.json';
import { content, parseContent } from '../src/core/content';

describe('content', () => {
  it('ships valid content', () => {
    expect(content.thoughts.length).toBeGreaterThan(0);
  });

  it('rejects a riddle longer than 12 words', () => {
    const bad = structuredClone(thoughts);
    bad.thoughts[0].riddle = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    expect(() => parseContent({ items, recipes, thoughts: bad })).toThrow(/12 words/);
  });

  it('rejects a thought with two right answers', () => {
    const bad = structuredClone(thoughts);
    bad.thoughts[0].answerChoices[1].correct = true;
    expect(() => parseContent({ items, recipes, thoughts: bad })).toThrow(/Exactly one/);
  });

  it('rejects a recipe that uses an unknown spice', () => {
    const bad = structuredClone(recipes) as { spiceRecipes: { parts: Record<string, number> }[] };
    bad.spiceRecipes[0].parts = { saffron: 1 };
    expect(() => parseContent({ items, recipes: bad, thoughts })).toThrow(/unknown spice/);
  });

  it('dragon names: a long list, simple words, no story characters, no duplicates', () => {
    const n = content.names;
    expect(n.names.length).toBeGreaterThanOrEqual(n.perPage * 4);
    expect(new Set(n.names).size).toBe(n.names.length);
    for (const name of n.names) expect(name).toMatch(/^[A-Z][a-z]{1,11}$/);
    for (const story of ['Cinder', 'Kit', 'Blink', 'Pickles']) expect(n.names).not.toContain(story);
  });
});
