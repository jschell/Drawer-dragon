import { describe, expect, it } from 'vitest';
import { content, eveningFor } from '../src/core/content';
import { cartServings, cartTotal, cheapestCart, unitPrice } from '../src/core/days';
import { step } from '../src/core/reducer';
import type { Action, GameState } from '../src/core/state';
import { caring, run, ticks } from './helpers';

/** Plays a whole evening, answering honestly with the given choice, until bedtime. */
function finishEvening(s: GameState, choice: 'tell' | 'quiet' = 'quiet'): GameState {
  for (let i = 0; i < 600 && !s.evening.over; i++) {
    if (s.evening.stones.active) s = step(s, { type: 'stepOrder', order: ['blink', 'hungry', 'kit'], reason: 'quick' }).state;
    if (s.evening.awaiting) s = step(s, { type: 'visitorChoice', choiceId: choice }).state;
    s = step(s, { type: 'tick', dt: 1 }).state;
  }
  if (!s.evening.over) throw new Error('evening did not finish');
  return step(s, { type: 'finishDay' }).state;
}

function day1Done(): GameState {
  const s = run(caring(), [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;
  return finishEvening(s);
}

function toDay(day: 2 | 3): GameState {
  let s = step(day1Done(), { type: 'nextDay' }).state;
  if (day === 3) {
    s = run(s, [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;
    s = step(finishEvening(s), { type: 'nextDay' }).state;
  }
  return s;
}

describe('moving to the next day', () => {
  it('only happens after the day ends', () => {
    expect(step(caring(), { type: 'nextDay' }).state.day).toBe(1);
  });

  it('keeps the dragon, the circle, attention, stickers and money; resets the day', () => {
    let s = day1Done();
    s = { ...s, coins: 40, world: { ...s.world, collectorAttention: 30, circle: ['june', 'kit'], blanketUnlocked: true } };
    const r = step(s, { type: 'nextDay' });
    const n = r.state;
    expect(r.events).toContainEqual({ type: 'day-start', day: 2 });
    expect(n.day).toBe(2);
    expect(n.part).toBe('morning');
    expect(n.phase).toBe('care');
    expect(n.dragon.name).toBe('Pip');
    expect(n.coins).toBe(40);
    expect(n.world).toEqual(s.world);
    expect(n.stickers).toEqual(s.stickers);
    expect(n.history.map((h) => h.day)).toEqual([1]);
    expect(n.t).toBe(0);
    expect(n.dragon.plate).toEqual({ protein: 0, greens: 0, minerals: 0 });
    expect(n.evening.over).toBe(false);
    expect(n.dragon.spark).toBe(8); // Day 2 starts with a cold belly
  });

  it('goes on to Chapter 2 after Day 3', () => {
    let s = toDay(3);
    s = run(s, [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;
    s = finishEvening(s);
    expect(s.day).toBe(3);
    expect(step(s, { type: 'nextDay' }).state.day).toBe(4);
    expect(s.history.map((h) => h.day)).toEqual([1, 2, 3]);
  });
});

describe('Day 2: the corner store', () => {
  const atStore = () => run(toDay(2), [{ type: 'finishMorning' }, { type: 'startAfternoon' }]).state;
  const item = (id: string) => content.store.items.find((i) => i.id === id)!;

  it('the week allowance arrives when the afternoon starts', () => {
    expect(atStore().coins).toBe(content.store.allowance);
  });

  it('the "SUPER DEAL" greens bag costs more per serving than single bunches', () => {
    expect(unitPrice(item('greens-bag'))).toBeGreaterThan(unitPrice(item('greens-bunch')));
    expect(unitPrice(item('beef-big'))).toBeLessThan(unitPrice(item('beef-small')));
  });

  it('the cheapest full basket fits the budget, and the obvious one does not', () => {
    expect(cheapestCart(content)).toBe(540);
    expect(cheapestCart(content)).toBeLessThanOrEqual(content.store.allowance);
    const obvious = { 'beef-small': 3, 'greens-bag': 1 };
    expect(cartServings(obvious, content)).toEqual({ beef: 6, greens: 3 });
    expect(cartTotal(obvious, content)).toBeGreaterThan(content.store.allowance);
  });

  it("you can't pay for more than you have", () => {
    const s = run(atStore(), [...Array(4).fill({ type: 'addToCart', itemId: 'beef-big' }), { type: 'pay', tender: [500, 25, 25, 25, 25] }]).state;
    expect(s.store.total).toBe(1560);
    expect(s.store.paid).toBe(false);
  });

  it('buys the best basket, notices the wrong change, and earns both stickers', () => {
    const buy: Action[] = [
      { type: 'addToCart', itemId: 'beef-big' },
      { type: 'addToCart', itemId: 'greens-bunch' },
      { type: 'addToCart', itemId: 'greens-bunch' },
      { type: 'addToCart', itemId: 'greens-bunch' },
    ];
    let r = run(atStore(), [...buy, { type: 'pay', tender: [500, 25, 25, 25, 25] }]);
    expect(r.state.store.total).toBe(540);
    const paid = r.events.find((e) => e.type === 'paid')!;
    expect(paid).toMatchObject({ total: 540, changeDue: 60, changeGiven: 50 });
    expect(r.state.coins).toBe(60);
    r = run(r.state, [{ type: 'checkChange', answer: 'wrong' }, { type: 'startEvening' }]);
    expect(r.events).toContainEqual({ type: 'change-checked', correct: true, changeDue: 60 });
    expect(r.state.stickers).toEqual(expect.arrayContaining(['Smart Shopper', 'Change Checker']));
  });

  it('a pricier basket still works, just without the Smart Shopper sticker', () => {
    const s = run(atStore(), [
      { type: 'addToCart', itemId: 'beef-small' },
      { type: 'addToCart', itemId: 'beef-small' },
      { type: 'addToCart', itemId: 'beef-big' },
      { type: 'addToCart', itemId: 'greens-bunch' },
      { type: 'pay', tender: [500, 25, 25, 25, 25] },
      { type: 'checkChange', answer: 'right' },
      { type: 'startEvening' },
    ]).state;
    expect(s.store.paid).toBe(false); // 3.20 + 3.90 + 0.50 = 7.60 is over budget
    const ok = run(atStore(), [
      { type: 'addToCart', itemId: 'beef-big' },
      { type: 'addToCart', itemId: 'greens-bag' },
      { type: 'pay', tender: [500, 25, 25, 25, 25] },
      { type: 'checkChange', answer: 'right' },
      { type: 'startEvening' },
    ]).state;
    expect(ok.store.paid).toBe(true);
    expect(ok.stickers).not.toContain('Smart Shopper');
    expect(ok.stickers).not.toContain('Change Checker');
    expect(ok.part).toBe('evening');
  });
});

describe('Day 3 morning', () => {
  it('a growth spurt needs a 1½ batch: 3 cinnamon and 1½ ginger is perfect', () => {
    const s = toDay(3);
    const perfect = step(s, { type: 'spice', scoops: { cinnamon: 3, ginger: 1.5 } });
    expect(perfect.events[0]).toMatchObject({ type: 'spice', outcome: 'perfect' });
    const small = step(s, { type: 'spice', scoops: { cinnamon: 2, ginger: 1 } });
    expect(small.events[0]).toMatchObject({ outcome: 'too-little' });
  });

  it("starts with Kit's chewed slipper to fix, then owning up", () => {
    let s = toDay(3);
    expect(s.fixIt).toEqual({ id: 'chewed-slipper', progress: 0 });
    const r = run(s, Array.from({ length: 10 }, () => ({ type: 'scrub', amount: 10 }) as Action));
    expect(r.events).toContainEqual({ type: 'fixed', id: 'chewed-slipper' });
    expect(r.events).toContainEqual({ type: 'own-up-needed' });
    s = step(r.state, { type: 'ownUp', choice: 'sorry' }).state;
    expect(s.ownUpPending).toBe(false);
    expect(s.stickers).toContain('Owned Up');
  });

  it('dragon thoughts still appear while the slipper waits to be fixed', () => {
    const { state } = run(toDay(3), ticks(6));
    expect(state.thought).not.toBeNull();
  });
});

describe('Day 3 afternoon: the sleep research', () => {
  it('trusting the bedtime page unlocks the lullaby, which calms more at night', () => {
    let s = run(toDay(3), [{ type: 'finishMorning' }, { type: 'startAfternoon' }]).state;
    s = run(s, [{ type: 'search', chips: ['hatchling', 'sleep'] }, { type: 'rate', pageId: 'commons-sleep', rating: 'trust' }, { type: 'saveTip' }]).state;
    expect(s.research.results).toContain('trap-sleep-visit');
    expect(s.world.lullabyUnlocked).toBe(true);
    expect(s.world.blanketUnlocked).toBe(false);
    s = step(s, { type: 'startEvening' }).state;
    const before = s.dragon.calm;
    const after = step(s, { type: 'hum' }).state.dragon.calm;
    expect(after - before).toBe(eveningFor(content, 3).lullabyHumCalm);
  });
});

describe('Day 3 evening: Stepping Stones', () => {
  const evening3 = () => run(toDay(3), [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;

  it('three problems arrive at once and pause the evening', () => {
    const { state, events } = run(evening3(), ticks(40));
    expect(events).toContainEqual({ type: 'stepping-stones' });
    expect(state.evening.stones.active).toBe(true);
    expect(state.evening.t).toBe(eveningFor(content, 3).steppingStonesAt);
  });

  it('any order works; BLINK first is best; then Kit spots the dragon and can be shown it', () => {
    let s = run(evening3(), ticks(40)).state;
    const r = step(s, { type: 'stepOrder', order: ['kit', 'hungry', 'blink'], reason: 'kit' });
    expect(r.events).toContainEqual({ type: 'stones-done', order: ['kit', 'hungry', 'blink'], reason: 'kit', best: false });
    expect(r.state.stickers).toContain('One Stone at a Time');
    expect(r.state.evening.awaiting).toBe('kit');
    s = step(r.state, { type: 'visitorChoice', choiceId: 'tell' }).state;
    expect(s.world.circle).toContain('kit');
    expect(s.evening.awaiting).toBeNull();
    expect(s.evening.visitorIdx).toBe(0); // Mom's and Dad's visits are still to come
  });

  it('if Kit already knows, Kit just helps', () => {
    let s = evening3();
    s = { ...s, world: { ...s.world, circle: ['june', 'kit'] } };
    s = run(s, ticks(40)).state;
    s = step(s, { type: 'stepOrder', order: ['blink', 'hungry', 'kit'], reason: 'quick' }).state;
    expect(s.evening.awaiting).toBeNull();
  });

  it('a whole chapter can be played start to finish, every way', () => {
    for (const choice of ['tell', 'quiet'] as const) {
      let s = run(caring(), [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;
      for (let day = 1; day <= 3; day++) {
        if (day > 1) s = run(step(s, { type: 'nextDay' }).state, [{ type: 'finishMorning' }, { type: 'startAfternoon' }, { type: 'startEvening' }]).state;
        s = finishEvening(s, choice);
        expect(s.part, `day ${day}`).toBe('end');
      }
      expect(s.history).toHaveLength(3);
      if (choice === 'tell') expect(s.world.circle).toEqual(expect.arrayContaining(['kit', 'parents']));
    }
  });
});
