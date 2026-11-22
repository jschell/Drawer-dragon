import { describe, expect, it } from 'vitest';
import { content } from '../src/core/content';
import { isReady, plateMissing, step } from '../src/core/reducer';
import type { Action, GameState } from '../src/core/state';
import { caring } from './helpers';

type Policy = (s: GameState, rnd: () => number) => Action | null;

const FOOD_FOR = { protein: 'beef', greens: 'greens', minerals: 'eggshell' } as const;

/** Sensible play: answer thoughts correctly, fix messes, then meet each need. */
const greedy: Policy = (s) => {
  if (s.thought) {
    const def = content.thoughts.find((t) => t.id === s.thought!.id)!;
    return { type: 'answerThought', choiceId: def.answerChoices.find((c) => c.correct)!.id };
  }
  if (s.fixIt) return { type: 'scrub', amount: 20 };
  const d = s.dragon;
  if (d.hunger > 30) {
    const missing = plateMissing(s);
    return { type: 'feed', foodId: missing.length ? FOOD_FOR[missing[0]] : 'beef' };
  }
  if (d.spark < 40) return { type: 'spice', scoops: { cinnamon: 2, ginger: 1 } };
  if (d.calm < 70) return s.t >= s.cooldowns.hum ? { type: 'hum' } : { type: 'pet', amount: 3 };
  return null;
};

/** Button-mashing: any action, any order, wrong answers included. */
const random: Policy = (s, rnd) => {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const options: Action[] = [
    { type: 'feed', foodId: pick(content.foods).id },
    { type: 'spice', scoops: { [pick(content.spices).id]: 1 + Math.floor(rnd() * 4), [pick(content.spices).id]: Math.floor(rnd() * 3) } },
    { type: 'hum' },
    { type: 'sock' },
    { type: 'pet', amount: 2 },
    { type: 'scrub', amount: 15 },
  ];
  if (s.thought) {
    const def = content.thoughts.find((t) => t.id === s.thought!.id)!;
    options.push({ type: 'answerThought', choiceId: pick(def.answerChoices).id }, { type: 'hint' });
  }
  return rnd() < 0.5 ? pick(options) : null;
};

function mulberry(seed: number) {
  return () => {
    let t = (seed = (seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays one morning; returns the first time the dragon was ready, or null. */
function play(policy: Policy, seed: number, seconds: number) {
  let s = caring(seed);
  const rnd = mulberry(seed * 7919);
  for (let i = 0; i < seconds; i++) {
    const a = policy(s, rnd);
    if (a) s = step(s, a).state;
    s = step(s, { type: 'tick', dt: 1 }).state;
    const d = s.dragon;
    for (const v of [d.hunger, d.spark, d.calm]) {
      if (!(v >= 0 && v <= 100)) throw new Error(`meter out of range at t=${s.t}: ${v}`);
    }
    if (isReady(s)) return { readyAt: s.t, state: s };
  }
  return { readyAt: null, state: s };
}

describe('autoplay', () => {
  it('a sensible player gets the dragon ready within two minutes, for every seed', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { readyAt } = play(greedy, seed, 600);
      expect(readyAt, `seed ${seed}`).not.toBeNull();
      expect(readyAt!).toBeLessThan(120);
    }
  });

  it('a button-masher never breaks the game, and can recover with sensible play', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const messy = play(random, seed, 120).state;
      let s = messy;
      let ready = isReady(s);
      for (let i = 0; i < 600 && !ready; i++) {
        const a = greedy(s, Math.random);
        if (a) s = step(s, a).state;
        s = step(s, { type: 'tick', dt: 1 }).state;
        ready = isReady(s);
      }
      expect(ready, `seed ${seed}`).toBe(true);
    }
  });
});
