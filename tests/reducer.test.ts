import { content } from '../src/core/content';
import { describe, expect, it } from 'vitest';
import { isReady, step } from '../src/core/reducer';
import { initialState } from '../src/core/state';
import { caring, run, ticks } from './helpers';

describe('hatching', () => {
  it('hatches after three taps and then accepts a name', () => {
    let s = initialState();
    const r1 = run(s, [{ type: 'tapEgg' }, { type: 'tapEgg' }]);
    expect(r1.state.phase).toBe('egg');
    const r2 = step(r1.state, { type: 'tapEgg' });
    expect(r2.state.phase).toBe('naming');
    expect(r2.events.some((e) => e.type === 'hatched')).toBe(true);
    s = step(r2.state, { type: 'name', name: '   ' }).state;
    expect(s.dragon.name).toBe('Sprocket');
    expect(s.phase).toBe('care');
  });

  it('only accepts names from the list: typed text never becomes the name', () => {
    const hatched = run(initialState(), [{ type: 'tapEgg' }, { type: 'tapEgg' }, { type: 'tapEgg' }]).state;
    for (const typed of ['Bob', 'pip', 'Pip!', '<b>Hi</b>', 'Mochi Mochi', 'x'.repeat(40)]) {
      expect(step(hatched, { type: 'name', name: typed }).state.dragon.name).toBe(content.names.default);
    }
    expect(step(hatched, { type: 'name', name: 'Tumble' }).state.dragon.name).toBe('Tumble');
  });

  it('does not run the clock before care starts', () => {
    const s = step(initialState(), { type: 'tick', dt: 1 }).state;
    expect(s.t).toBe(0);
  });

  it('never mutates the previous state', () => {
    const s = caring();
    const snapshot = JSON.stringify(s);
    step(s, { type: 'feed', foodId: 'beef' });
    step(s, { type: 'tick', dt: 1 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('feeding', () => {
  it('lowers hunger and records the nutrient', () => {
    const { state, events } = run(caring(), [{ type: 'feed', foodId: 'beef' }]);
    expect(state.dragon.hunger).toBe(50);
    expect(state.dragon.plate.protein).toBe(1);
    expect(events[0]).toMatchObject({ type: 'eat', nutrient: 'protein' });
  });

  it('refuses a third helping of protein while other nutrients are missing', () => {
    const { state, events } = run(caring(), [
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'beef' },
    ]);
    expect(state.dragon.plate.protein).toBe(2);
    expect(events.at(-1)).toMatchObject({ type: 'refuse-wants-other', wants: ['greens', 'minerals'] });
  });

  it('celebrates a balanced plate once', () => {
    const { state, events } = run(caring(), [
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'greens' },
      { type: 'feed', foodId: 'eggshell' },
    ]);
    expect(state.stats.balancedPlate).toBe(true);
    expect(events.filter((e) => e.type === 'balanced')).toHaveLength(1);
    expect(state.dragon.hunger).toBe(12);
  });

  it('refuses food when full', () => {
    let s = caring();
    s = { ...s, dragon: { ...s.dragon, hunger: 3 } };
    expect(step(s, { type: 'feed', foodId: 'apple' }).events[0].type).toBe('refuse-full');
  });
});

describe('spice mixing', () => {
  it('a 2:1 cinnamon-ginger 1x batch is perfect and lands in the healthy band', () => {
    const { state, events } = run(caring(), [{ type: 'spice', scoops: { cinnamon: 2, ginger: 1 } }]);
    expect(events[0]).toMatchObject({ type: 'spice', outcome: 'perfect', hiccup: false });
    expect(state.dragon.spark).toBe(50);
    expect(state.stats.perfectMix).toBe(true);
  });

  it('a double batch is too much: hiccups and a scorched sock Fix-It', () => {
    const { state, events } = run(caring(), [{ type: 'spice', scoops: { cinnamon: 4, ginger: 2 } }]);
    expect(events[0]).toMatchObject({ outcome: 'too-much', hiccup: true });
    expect(events.some((e) => e.type === 'scorched')).toBe(true);
    expect(state.fixIt).toEqual({ id: 'scorched-sock', progress: 0 });
  });

  it('a wrong ratio still helps a little', () => {
    const { state, events } = run(caring(), [{ type: 'spice', scoops: { cinnamon: 1, ginger: 2 } }]);
    expect(events[0]).toMatchObject({ outcome: 'off-ratio' });
    expect(state.dragon.spark).toBeCloseTo(38);
  });

  it('pepper makes it sneeze and chili makes it hiccup', () => {
    const r = run(caring(), [{ type: 'spice', scoops: { cinnamon: 2, pepper: 1 } }]);
    expect(r.events[0]).toMatchObject({ sneeze: true, hiccup: false });
    const r2 = run(caring(), [{ type: 'spice', scoops: { chili: 1 } }]);
    expect(r2.events[0]).toMatchObject({ outcome: 'too-little', hiccup: true });
  });

  it('scrubbing fixes the sock', () => {
    let { state } = run(caring(), [{ type: 'spice', scoops: { cinnamon: 4, ginger: 2 } }]);
    const r = run(state, Array.from({ length: 10 }, () => ({ type: 'scrub', amount: 10 }) as const));
    state = r.state;
    expect(state.fixIt).toBeNull();
    expect(state.stats.fixItsDone).toBe(1);
    expect(r.events.filter((e) => e.type === 'fixed')).toHaveLength(1);
  });

  it('extra Spark burns off quickly', () => {
    const { state } = run(caring(), [{ type: 'spice', scoops: { cinnamon: 4, ginger: 2 } }, ...ticks(30)]);
    expect(state.dragon.spark).toBeLessThanOrEqual(70);
  });
});

describe('calm', () => {
  it('humming has a cooldown', () => {
    const { state, events } = run(caring(), [{ type: 'hum' }, { type: 'hum' }]);
    expect(state.dragon.calm).toBe(60);
    expect(events[1]).toMatchObject({ type: 'cooldown', action: 'hum' });
  });

  it('a sock in the nest raises the resting calm level', () => {
    const quiet = { ...caring(), noisesLeft: 0 };
    const withSock = run(quiet, [{ type: 'sock' }, ...ticks(400)]).state;
    const without = run(quiet, ticks(400)).state;
    expect(withSock.dragon.calm).toBeGreaterThan(75);
    expect(without.dragon.calm).toBeCloseTo(55);
  });

  it('noises startle the dragon, at most three per morning', () => {
    let s = caring();
    let startles = 0;
    for (let i = 0; i < 400; i++) {
      const r = step(s, { type: 'tick', dt: 1 });
      s = r.state;
      startles += r.events.filter((e) => e.type === 'startle').length;
      if (s.fixIt) s = step(s, { type: 'scrub', amount: 100 }).state; // clean up straight away
    }
    expect(startles).toBe(3);
  });

  it("Day 1's first noise makes the dragon hiccup a scorched sock (no mischief needed)", () => {
    const { state, events } = run(caring(), ticks(60));
    expect(events.some((e) => e.type === 'startle-scorch')).toBe(true);
    expect(state.fixIt).toEqual({ id: 'scorched-sock', progress: 0 });
    // Further noises wait until the mess is cleaned up.
    expect(events.filter((e) => e.type === 'startle')).toHaveLength(1);
  });
});

describe('thoughts', () => {
  it('shows a thought for a real need, and accepts the right answer', () => {
    let { state, events } = run(caring(), ticks(5));
    expect(events.some((e) => e.type === 'thought')).toBe(true);
    expect(state.thought?.id).toBe('cold-belly');
    const r = step(state, { type: 'answerThought', choiceId: 'spice' });
    expect(r.events[0]).toMatchObject({ type: 'thought-solved', pulse: 'spice' });
    expect(r.state.stats.thoughtsSolved).toContain('cold-belly');
    // It stays quiet while the need is still there.
    ({ state } = run(r.state, ticks(10)));
    expect(state.thought?.id).not.toBe('cold-belly');
  });

  it('a wrong answer gives a free hint, never a penalty', () => {
    const { state } = run(caring(), [...ticks(5), { type: 'answerThought', choiceId: 'water' }]);
    expect(state.thought?.hintLevel).toBe(1);
    expect(state.dragon.calm).toBeGreaterThan(0);
  });

  it('a thought pops away when its need is met', () => {
    const { state, events } = run(caring(), [...ticks(5), { type: 'spice', scoops: { cinnamon: 2, ginger: 1 } }, ...ticks(1)]);
    expect(events.some((e) => e.type === 'thought-gone' && e.id === 'cold-belly')).toBe(true);
    expect(state.thought?.id).not.toBe('cold-belly');
  });
});

describe('ready for the day', () => {
  it('becomes ready when fed, warm and calm, and awards stickers at the end', () => {
    const { state, events } = run(caring(), [
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'beef' },
      { type: 'feed', foodId: 'greens' },
      { type: 'feed', foodId: 'eggshell' },
      { type: 'spice', scoops: { cinnamon: 2, ginger: 1 } },
      { type: 'hum' },
    ]);
    expect(isReady(state)).toBe(true);
    expect(events.some((e) => e.type === 'ready')).toBe(true);
    const done = step(state, { type: 'finishMorning' }).state;
    expect(done.phase).toBe('done');
    expect(done.stickers).toEqual(expect.arrayContaining(['Balanced Plate', 'Master Mixer', 'Cozy Keeper']));
  });

  it('can finish the morning at any time, ready or not', () => {
    const done = step(caring(), { type: 'finishMorning' }).state;
    expect(done.phase).toBe('done');
  });
});
