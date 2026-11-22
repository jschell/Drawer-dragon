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
});
