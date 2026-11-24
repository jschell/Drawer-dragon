import { describe, expect, it } from 'vitest';
import { content } from '../src/core/content';
import { toysFor, tricksKnown, twistFor } from '../src/core/play';
import { step } from '../src/core/reducer';
import type { Action, GameState } from '../src/core/state';
import { caring, run, ticks } from './helpers';

const P = content.play;
const calmAt = (s: GameState, calm: number): GameState => ({ ...s, dragon: { ...s.dragon, calm } });
const onDay = (s: GameState, day: number): GameState => ({ ...s, day });

describe('toys', () => {
  it('the first game calms the dragon most; tapping again during the rest does nothing', () => {
    const yarn = P.toys.find((t) => t.id === 'yarn')!;
    let s = calmAt(caring(), 40);
    const r = step(s, { type: 'toy', id: 'yarn' });
    expect(r.events).toContainEqual({ type: 'toy', id: 'yarn', first: true, calm: yarn.firstCalm, line: 0 });
    s = r.state;
    expect(s.dragon.calm).toBe(40 + yarn.firstCalm);
    const spam = run(s, Array.from({ length: 10 }, () => ({ type: 'toy', id: 'yarn' }) as Action));
    expect(spam.state.dragon.calm).toBe(s.dragon.calm);
    expect(spam.events.every((e) => e.type === 'toy-rest')).toBe(true);
  });

  it('after a rest, playing again calms only a little', () => {
    const yarn = P.toys.find((t) => t.id === 'yarn')!;
    let s = step(calmAt(caring(), 30), { type: 'toy', id: 'yarn' }).state;
    // Hold the other meters still so only the toy changes calm.
    s = run(s, ticks(yarn.rest)).state;
    const before = s.dragon.calm;
    s = step(s, { type: 'toy', id: 'yarn' }).state;
    expect(s.dragon.calm - before).toBeCloseTo(yarn.againCalm);
    expect(yarn.againCalm).toBeLessThan(yarn.firstCalm);
  });

  it('toys only work during care (and free play), and new toys arrive on their day', () => {
    expect(step(step(caring(), { type: 'finishMorning' }).state, { type: 'toy', id: 'yarn' }).events).toEqual([]);
    expect(toysFor(caring(), content).map((t) => t.id)).toEqual(['yarn']);
    expect(toysFor(onDay(caring(), 4), content).map((t) => t.id)).toContain('pinecone');
    expect(step(caring(), { type: 'toy', id: 'pinecone' }).events).toEqual([]);
  });
});

describe('tricks', () => {
  it('are learned on story days, never by tapping', () => {
    expect(tricksKnown(caring(), content)).toEqual([]);
    expect(step(caring(), { type: 'trick', id: 'spin' }).events).toEqual([]);
    expect(tricksKnown(onDay(caring(), 9), content).map((t) => t.id)).toEqual(P.tricks.map((t) => t.id));
  });

  it('cheer the dragon once each per day; repeats are just for fun', () => {
    let s = calmAt(onDay(caring(), 2), 40);
    const first = step(s, { type: 'trick', id: 'spin' });
    expect(first.events).toContainEqual({ type: 'trick', id: 'spin', first: true, calm: P.trickCalm });
    s = first.state;
    const again = run(s, Array.from({ length: 5 }, () => ({ type: 'trick', id: 'spin' }) as Action));
    expect(again.state.dragon.calm).toBe(s.dragon.calm);
    expect(again.events.every((e) => e.type === 'trick' && !e.first && e.calm === 0)).toBe(true);
  });

  it('reset each new day', () => {
    const s = step(onDay(caring(), 2), { type: 'trick', id: 'spin' }).state;
    expect(s.play.tricksToday).toEqual(['spin']);
  });
});

describe('morning surprises', () => {
  it('there is one for every day after the first, and none change the rules', () => {
    for (let d = 2; d <= 9; d++) expect(twistFor(d, content), `day ${d}`).toBeDefined();
    expect(twistFor(1, content)).toBeUndefined();
  });

  it('tricks are learned in story order, before the game ends', () => {
    for (const t of P.tricks) expect(t.fromDay).toBeLessThanOrEqual(9);
    const days = P.tricks.map((t) => t.fromDay);
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });
});

describe('free play after the ending', () => {
  it('only opens after the last day, with an ending chosen', () => {
    expect(step(caring(), { type: 'freePlay' }).state.part).toBe('morning');
    const end = { ...caring(), part: 'end' as const, day: 9, world: { ...caring().world, ending: 'stay' as const } };
    const s = step(end, { type: 'freePlay' }).state;
    expect(s.part).toBe('free');
    expect(step(s, { type: 'toy', id: 'pinecone' }).events[0]).toMatchObject({ type: 'toy', first: true });
    expect(step(s, { type: 'trick', id: 'loop' }).events[0]).toMatchObject({ type: 'trick', first: true });
    // No clock pressure: ticks never make it hungry or scared.
    const later = run(s, ticks(120)).state;
    expect(later.dragon).toEqual(s.dragon);
  });
});
