import { describe, expect, it } from 'vitest';
import { content } from '../src/core/content';
import { classifyMix, step } from '../src/core/reducer';
import type { Action, GameState } from '../src/core/state';
import { caring, run, ticks } from './helpers';

/**
 * Fair play: the game must never reward mischief, spam-tapping or random guessing
 * (see SPEC.md §5.9). Each test pins one of those rules.
 */

const afternoon = () => run(caring(), [{ type: 'finishMorning' }, { type: 'startAfternoon' }]).state;
const evening = (s: GameState = afternoon()) => step(s, { type: 'startEvening' }).state;

describe('the spice tin only feeds a correct mix', () => {
  it('classifies mixes without changing the game', () => {
    expect(classifyMix({ cinnamon: 2, ginger: 1 }, 1, content)).toBe('perfect');
    expect(classifyMix({ cinnamon: 3, ginger: 1.5 }, 1.5, content)).toBe('perfect');
    expect(classifyMix({ cinnamon: 1, ginger: 2 }, 1, content)).toBe('off-ratio');
    expect(classifyMix({ cinnamon: 4, ginger: 2 }, 1, content)).toBe('too-much');
    expect(classifyMix({ cinnamon: 2, ginger: 1 }, 1.5, content)).toBe('too-little');
    expect(classifyMix({ chili: 1 }, 1, content)).toBe('wrong-spice');
    expect(classifyMix({ cinnamon: 2, ginger: 1, pepper: 1 }, 1, content)).toBe('wrong-spice');
    expect(classifyMix({}, 1, content)).toBe('empty');
  });
});

describe('no rewards for spam-tapping', () => {
  it('the blanket calms the dragon once a night, however often it is toggled', () => {
    let s = evening({ ...afternoon(), world: { ...afternoon().world, blanketUnlocked: true } });
    const start = s.dragon.calm;
    const toggles: Action[] = Array.from({ length: 10 }, () => ({ type: 'blanket' }) as Action);
    s = run(s, toggles).state;
    expect(s.dragon.calm).toBe(Math.min(100, start + 8));
  });

  it('reading a panel to the dragon calms it once, not every tap', () => {
    let s = evening();
    const start = s.dragon.calm;
    s = run(s, Array.from({ length: 5 }, () => ({ type: 'readToDragon', panelId: 'evening-1' }) as Action)).state;
    expect(s.dragon.calm).toBe(start + content.reading.readToCalm);
    expect(s.reading.readTo).toEqual(['1:evening-1']);
  });

  it('tapping harmless things at the window costs nothing, but Scout Spotter needs careful looking', () => {
    let s = evening();
    // Tap the moth (harmless), then spot every scout.
    s = { ...s, evening: { ...s.evening, visitorIdx: 99, t: 26 } };
    s = step(s, { type: 'tick', dt: 1 }).state;
    expect(s.evening.window?.id).toBe('moth');
    const attention = s.world.collectorAttention;
    s = step(s, { type: 'windowTap', thingId: 'moth' }).state;
    expect(s.world.collectorAttention).toBe(attention);
    expect(s.evening.falseAlarms).toBe(1);
    for (let i = 0; i < 200 && !s.evening.over; i++) {
      if (s.evening.window) {
        const w = content.evening.windowThings.find((x) => x.id === s.evening.window!.id)!;
        if (w.suspicious) s = step(s, { type: 'windowTap', thingId: w.id }).state;
      }
      s = step(s, { type: 'tick', dt: 1 }).state;
    }
    s = step(s, { type: 'finishDay' }).state;
    expect(s.evening.spotted).toBe(3);
    expect(s.stickers).not.toContain('Scout Spotter');
  });
});

describe('no rewards for random guessing', () => {
  it('Source Sleuth counts first judgments, not guesses until right', () => {
    const guessed = run(afternoon(), [
      { type: 'rate', pageId: 'commons-calm', rating: 'distrust' },
      { type: 'rate', pageId: 'commons-calm', rating: 'trust' },
      { type: 'rate', pageId: 'trap-lookalike', rating: 'distrust' },
      { type: 'rate', pageId: 'fanpage', rating: 'unsure' },
      { type: 'startEvening' },
    ]).state;
    expect(guessed.stickers).not.toContain('Source Sleuth');
    const careful = run(afternoon(), [
      { type: 'rate', pageId: 'commons-calm', rating: 'trust' },
      { type: 'rate', pageId: 'trap-lookalike', rating: 'distrust' },
      { type: 'rate', pageId: 'fanpage', rating: 'unsure' },
      { type: 'startEvening' },
    ]).state;
    expect(careful.stickers).toContain('Source Sleuth');
  });

  it('Thought Reader counts thoughts solved without guessing (hints are fine)', () => {
    const solve = (s: GameState, guessFirst: boolean) => {
      for (let i = 0; i < 300 && s.stats.thoughtsSolved.length < 2; i++) {
        if (s.thought) {
          const def = content.thoughts.find((t) => t.id === s.thought!.id)!;
          if (guessFirst && s.thought.wrongGuesses === 0) {
            s = step(s, { type: 'answerThought', choiceId: def.answerChoices.find((c) => !c.correct)!.id }).state;
          } else {
            s = step(s, { type: 'hint' }).state;
            s = step(s, { type: 'answerThought', choiceId: def.answerChoices.find((c) => c.correct)!.id }).state;
          }
        }
        s = step(s, { type: 'tick', dt: 1 }).state;
        if (s.fixIt) s = step(s, { type: 'scrub', amount: 100 }).state;
        if (s.dragon.spark < 40) s = step(s, { type: 'spice', scoops: { cinnamon: 2, ginger: 1 } }).state;
      }
      return step(s, { type: 'finishMorning' }).state;
    };
    expect(solve(caring(), false).stickers).toContain('Thought Reader');
    expect(solve(caring(), true).stickers).not.toContain('Thought Reader');
  });

  it('Sharp Reader stars come only from right first answers; wrong answers cost nothing', () => {
    let s = caring();
    const calm = s.dragon.calm;
    s = run(s, [
      { type: 'readingAnswer', questionId: 'june-cases', choiceId: 'boxes', firstTry: true },
      { type: 'readingAnswer', questionId: 'june-cases', choiceId: 'cases', firstTry: false },
    ]).state;
    expect(s.reading.stars).toBe(0);
    expect(s.reading.answered).toEqual(['june-cases']);
    expect(s.dragon.calm).toBe(calm);
    s = run(s, [
      { type: 'readingAnswer', questionId: 'evening-kit', choiceId: 'sibling', firstTry: true },
      { type: 'readingAnswer', questionId: 'evening-kit', choiceId: 'sibling', firstTry: true },
      { type: 'readingAnswer', questionId: 'store-compare', choiceId: 'serving', firstTry: true },
      { type: 'readingAnswer', questionId: 'evening-stones', choiceId: 'stone', firstTry: true },
    ]).state;
    expect(s.reading.stars).toBe(3); // the repeat doesn't count twice
    expect(s.stickers).toContain('Sharp Reader');
  });
});

describe('honest boundaries are never punished', () => {
  it('asking for quiet time leaves the dragon just as calm', () => {
    for (const v of content.evening.visitors) {
      const quiet = v.choices.find((c) => c.id === 'quiet');
      if (quiet) expect(quiet.calm, v.id).toBe(0);
    }
  });
});

describe('reading questions', () => {
  it('every answer can be found in its panel', async () => {
    const { panelText } = await import('../src/core/content');
    for (const q of content.reading.questions) {
      expect(panelText(content, q.panel).join(' ').toLowerCase(), q.id).toContain(q.answerText.toLowerCase());
    }
  });
});

void ticks;
