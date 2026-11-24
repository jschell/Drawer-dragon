/**
 * Toys, tricks and the free-play visit after the ending (docs/FUN-PLAN.md). Called
 * from `step` in reducer.ts with the same contract: mutate the cloned state, push
 * events, never throw.
 *
 * Fair play (spec §5.9): the first game with each toy calms the dragon most, later
 * games only a little and only after a short rest, and each trick cheers it up once
 * a day. Tapping over and over is never the best way to care for it.
 */
import { lastDay, type Content } from './content';
import type { Action, GameEvent, GameState } from './state';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Toys and tricks are for the morning's care time and the free-play visit. */
export function canPlay(s: GameState): boolean {
  return (s.part === 'morning' && s.phase === 'care') || s.part === 'free';
}

export function toysFor(s: GameState, c: Content) {
  return c.play.toys.filter((t) => s.part === 'free' || t.fromDay <= s.day);
}

export function tricksKnown(s: GameState, c: Content) {
  return c.play.tricks.filter((t) => s.part === 'free' || t.fromDay <= s.day);
}

/** Tricks learned this morning, to announce them. */
export function tricksLearnedToday(s: GameState, c: Content) {
  return c.play.tricks.filter((t) => t.fromDay === s.day);
}

export function twistFor(day: number, c: Content) {
  return c.play.twists.find((t) => t.day === day);
}

export function stepPlay(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  switch (a.type) {
    case 'toy': {
      const toy = toysFor(s, c).find((t) => t.id === a.id);
      if (!toy || !canPlay(s)) return true;
      if (s.t < s.play.restUntil) {
        events.push({ type: 'toy-rest', id: toy.id, secondsLeft: Math.ceil(s.play.restUntil - s.t) });
        return true;
      }
      const count = s.play.toyCount[toy.id] ?? 0;
      const first = count === 0;
      const calm = first ? toy.firstCalm : toy.againCalm;
      s.dragon.calm = clamp(s.dragon.calm + calm);
      s.play.toyCount[toy.id] = count + 1;
      s.play.restUntil = s.t + toy.rest;
      events.push({ type: 'toy', id: toy.id, first, calm, line: count % toy.lines.length });
      return true;
    }
    case 'trick': {
      const trick = tricksKnown(s, c).find((t) => t.id === a.id);
      if (!trick || !canPlay(s)) return true;
      const first = !s.play.tricksToday.includes(trick.id);
      const calm = first ? c.play.trickCalm : 0;
      if (first) s.play.tricksToday.push(trick.id);
      s.dragon.calm = clamp(s.dragon.calm + calm);
      events.push({ type: 'trick', id: trick.id, first, calm });
      return true;
    }
    case 'freePlay': {
      // After the ending: a calm, happy dragon, no clock and no goals.
      if (s.part !== 'end' || s.day < lastDay(c) || !s.world.ending) return true;
      s.part = 'free';
      s.dragon = { ...s.dragon, hunger: 15, spark: 55, calm: 85 };
      s.play = { toyCount: {}, restUntil: 0, tricksToday: [] };
      s.t = 0;
      events.push({ type: 'free-play' });
      return true;
    }
    default:
      return false;
  }
}
