/**
 * Multi-day rules: moving to the next day, the corner store, owning up after a
 * Fix-It, and the Stepping Stones moment. Called from `step` in reducer.ts, with
 * the same contract: mutate the cloned state, push events, never throw.
 */
import { dayDef, lastDay, type Content, type StoreItemDef } from './content';
import { onBoardStart } from './chapters';
import { emptyStore, initialState, type Action, type GameEvent, type GameState, type StoneId } from './state';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export const LAST_DAY = 9;

function addSticker(s: GameState, id: string) {
  if (!s.stickers.includes(id)) s.stickers.push(id);
}

/** Starts the next day: per-day state resets, the dragon and the player's progress carry over. */
function nextDay(s: GameState, events: GameEvent[], c: Content) {
  const fresh = initialState(s.seed ^ (s.day * 0x9e3779b9));
  const day = s.day + 1;
  const def = dayDef(c, day);
  const name = s.dragon.name || 'Sprocket';
  const carry = {
    day,
    coins: s.coins,
    world: s.world,
    stickers: s.stickers,
    history: s.history,
    seed: fresh.seed,
    reading: s.reading,
  };
  Object.assign(s, fresh, carry);
  s.phase = 'care';
  s.part = 'morning';
  s.eggTaps = 3;
  s.dragon = {
    ...fresh.dragon,
    name,
    stage: def.morning.stage,
    ...def.morning.start,
  };
  if (def.morning.chewedSlipper) s.fixIt = { id: 'chewed-slipper', progress: 0 };
  events.push({ type: 'day-start', day });
}

// ---------- Corner store ----------

export function cartTotal(cart: Record<string, number>, c: Content): number {
  return Object.entries(cart).reduce((sum, [id, n]) => sum + (c.store.items.find((i) => i.id === id)?.price ?? 0) * n, 0);
}

export function cartServings(cart: Record<string, number>, c: Content): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(cart)) {
    const item = c.store.items.find((i) => i.id === id);
    if (item) out[item.food] = (out[item.food] ?? 0) + item.servings * n;
  }
  return out;
}

export function listMet(cart: Record<string, number>, c: Content): boolean {
  const got = cartServings(cart, c);
  return c.store.list.every((l) => (got[l.food] ?? 0) >= l.servings);
}

export function unitPrice(item: StoreItemDef): number {
  return item.price / item.servings;
}

const cheapestCache = new WeakMap<Content, number>();

/** The cheapest way to buy everything on the list (small search: a few items, a few packs each). */
export function cheapestCart(c: Content): number {
  const cached = cheapestCache.get(c);
  if (cached !== undefined) return cached;
  let best = Infinity;
  const items = c.store.items;
  const walk = (i: number, cart: Record<string, number>) => {
    if (i === items.length) {
      if (listMet(cart, c)) best = Math.min(best, cartTotal(cart, c));
      return;
    }
    for (let n = 0; n <= 6; n++) walk(i + 1, { ...cart, [items[i].id]: n });
  };
  walk(0, {});
  cheapestCache.set(c, best);
  return best;
}

function stepStore(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const st = s.store;
  const storeDay = s.part === 'afternoon' && dayDef(c, s.day).afternoon.kind === 'store';
  switch (a.type) {
    case 'addToCart':
    case 'removeFromCart': {
      if (!storeDay || st.paid || !c.store.items.some((i) => i.id === a.itemId)) return true;
      const n = Math.max(0, Math.min(9, (st.cart[a.itemId] ?? 0) + (a.type === 'addToCart' ? 1 : -1)));
      if (n === 0) delete st.cart[a.itemId];
      else st.cart[a.itemId] = n;
      st.total = cartTotal(st.cart, c);
      events.push({ type: 'cart', itemId: a.itemId, packs: n });
      return true;
    }
    case 'pay': {
      if (!storeDay || st.paid || st.total === 0 || st.total > s.coins) return true;
      const tendered = a.tender.reduce((x, y) => x + y, 0);
      if (tendered < st.total) return true;
      const changeDue = tendered - st.total;
      // Mr. Patel always makes one small mistake, so the player gets to check the change.
      const changeGiven = changeDue >= c.store.changeMistake ? changeDue - c.store.changeMistake : changeDue + c.store.changeMistake;
      st.paid = true;
      st.tendered = tendered;
      st.changeGiven = changeGiven;
      st.bought = cartServings(st.cart, c);
      s.coins -= st.total;
      events.push({ type: 'paid', total: st.total, changeDue, changeGiven });
      return true;
    }
    case 'checkChange': {
      if (!storeDay || !st.paid || st.changeChecked) return true;
      st.changeChecked = a.answer;
      const changeDue = st.tendered - st.total;
      const correct = a.answer === 'wrong'; // the change handed back is always off by a little
      if (correct) addSticker(s, 'Change Checker');
      events.push({ type: 'change-checked', correct, changeDue });
      return true;
    }
    default:
      return false;
  }
}

// ---------- Owning up (Day 3's chewed slipper) ----------

function stepOwnUp(s: GameState, a: Action, events: GameEvent[]): boolean {
  if (a.type !== 'ownUp') return false;
  if (!s.ownUpPending) return true;
  s.ownUpPending = false;
  s.dragon.calm = clamp(s.dragon.calm + 5);
  addSticker(s, 'Owned Up');
  events.push({ type: 'owned-up', choice: a.choice });
  return true;
}

// ---------- Stepping Stones (spec §5.6) ----------

export const STONE_IDS: StoneId[] = ['hungry', 'kit', 'blink'];

/** Several orders are sensible; closing the curtains on BLINK first is quickest and safest. */
export function bestFirst(order: StoneId[]): boolean {
  return order[0] === 'blink';
}

function stepStones(s: GameState, a: Action, events: GameEvent[]): boolean {
  if (a.type !== 'stepOrder') return false;
  const st = s.evening.stones;
  if (s.part !== 'evening' || !st.active) return true;
  const order = a.order.filter((x, i) => STONE_IDS.includes(x) && a.order.indexOf(x) === i);
  if (order.length !== STONE_IDS.length) return true;
  st.active = false;
  st.done = true;
  st.order = order;
  st.reason = a.reason;
  // Every order works out: the dragon gets a snack, the curtains close, and Kit is dealt with.
  s.dragon.calm = clamp(s.dragon.calm + (bestFirst(order) ? 12 : 8));
  s.dragon.hunger = clamp(s.dragon.hunger - 20);
  s.world.collectorAttention = Math.max(0, s.world.collectorAttention - 5);
  addSticker(s, 'One Stone at a Time');
  events.push({ type: 'stones-done', order, reason: a.reason, best: bestFirst(order) });
  if (!s.world.circle.includes('kit')) {
    // Kit saw the dragon's tail. The usual honest choices follow, led by "Show Kit the dragon".
    s.evening.kitDiscovers = true;
    s.evening.awaiting = 'kit';
  }
  return true;
}

// ---------- Reading rewards ----------

function stepReading(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const r = s.reading;
  if (a.type === 'readingAnswer') {
    const q = c.reading.questions.find((x) => x.id === a.questionId);
    const choice = q?.choices.find((x) => x.id === a.choiceId);
    if (!q || !choice) return true;
    // A star only for a right first answer, so guessing isn't rewarded. Wrong answers cost nothing.
    const star = choice.correct && a.firstTry && !r.answered.includes(q.id);
    if (choice.correct && !r.answered.includes(q.id)) r.answered.push(q.id);
    if (star) {
      r.stars += 1;
      if (r.stars >= c.reading.starsForSticker) addSticker(s, 'Sharp Reader');
    }
    events.push({ type: 'reading-answer', questionId: q.id, correct: choice.correct, star });
    return true;
  }
  if (a.type === 'readToDragon') {
    const key = `${s.day}:${a.panelId}`;
    if (r.readTo.includes(key)) return true; // once per panel, so it can't be farmed
    r.readTo.push(key);
    const calm = s.part === 'evening' || (s.part === 'morning' && s.phase === 'care') ? c.reading.readToCalm : 0;
    s.dragon.calm = clamp(s.dragon.calm + calm);
    if (r.readTo.length >= c.reading.readsForSticker) addSticker(s, 'Storyteller');
    events.push({ type: 'read-to-dragon', panelId: a.panelId, calm });
    return true;
  }
  return false;
}

export function stepDays(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  if (a.type === 'nextDay') {
    if (s.part === 'end' && s.day < lastDay(c)) nextDay(s, events, c);
    return true;
  }
  return stepStore(s, a, events, c) || stepOwnUp(s, a, events) || stepStones(s, a, events) || stepReading(s, a, events, c);
}

/** Called when the afternoon starts, so store days begin with the week's allowance. */
export function onAfternoonStart(s: GameState, events: GameEvent[], c: Content) {
  if (dayDef(c, s.day).afternoon.kind === 'board') onBoardStart(s, events, c);
  if (dayDef(c, s.day).afternoon.kind === 'store') {
    s.store = emptyStore();
    s.coins += c.store.allowance;
    events.push({ type: 'allowance', cents: c.store.allowance });
  }
}
