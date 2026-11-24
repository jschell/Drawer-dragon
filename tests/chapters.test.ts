import { describe, expect, it } from 'vitest';
import { content, dayDef, lastDay } from '../src/core/content';
import { bondExtras, bondScore, flightAnswer, flightDistance } from '../src/core/chapters';
import { isReady, plateMissing, step } from '../src/core/reducer';
import type { Action, Ending, GameState } from '../src/core/state';
import { caring, run } from './helpers';

const A = content.activities;
const FOOD_FOR = { protein: 'beef', greens: 'greens', minerals: 'eggshell' } as const;

interface Style {
  /** Answer Kit and the parents with "show them the dragon" on Day 1 (or keep it quiet until Day 4). */
  tell: boolean;
  /** Try wrong answers and weak evidence first, like a guesser or a button-masher. */
  messy: boolean;
  /** Judge research pages correctly (collecting evidence) or skip the library. */
  research: boolean;
  ending: Ending;
}

const SENSIBLE: Style = { tell: true, messy: false, research: true, ending: 'stay' };

const go = (s: GameState, a: Action) => step(s, a).state;

function care(s: GameState): GameState {
  const scale = dayDef(content, s.day).morning.recipeScale;
  for (let i = 0; i < 400 && !isReady(s); i++) {
    const d = s.dragon;
    let a: Action | null = null;
    if (s.thought) {
      const def = content.thoughts.find((t) => t.id === s.thought!.id)!;
      a = { type: 'answerThought', choiceId: def.answerChoices.find((c) => c.correct)!.id };
    } else if (s.fixIt) a = { type: 'scrub', amount: 25 };
    else if (s.ownUpPending) a = { type: 'ownUp', choice: 'sorry' };
    else if (d.hunger > 30) {
      const missing = plateMissing(s);
      a = { type: 'feed', foodId: missing.length ? FOOD_FOR[missing[0]] : 'beef' };
    } else if (d.spark < 40) a = { type: 'spice', scoops: { cinnamon: 2 * scale, ginger: scale } };
    else if (d.calm < 70) a = s.t >= s.cooldowns.hum ? { type: 'hum' } : { type: 'pet', amount: 3 };
    if (a) s = go(s, a);
    s = go(s, { type: 'tick', dt: 1 });
  }
  if (s.ownUpPending) s = go(s, { type: 'ownUp', choice: 'sorry' });
  return s;
}

function morningActivity(s: GameState, st: Style): GameState {
  const def = dayDef(content, s.day).morning;
  if (def.opening === 'family') s = go(s, { type: 'familyMeeting' });
  switch (def.activity) {
    case 'insulation':
      if (st.messy) s = run(s, [{ type: 'pick', id: 'foil' }, { type: 'pick', id: 'wet-leaves' }, { type: 'submit' }]).state;
      for (const id of A.insulation.best) if (!s.activity.picks.includes(id)) s = go(s, { type: 'pick', id });
      return go(s, { type: 'submit' });
    case 'flight': {
      for (const p of st.messy ? [100, 0, 100] : [40, 60, 70]) s = go(s, { type: 'flap', power: p });
      if (st.messy) s = go(s, { type: 'answer', qid: 'graph', value: '999' });
      return go(s, { type: 'answer', qid: 'graph', value: String(flightAnswer(s.activity.tries)) });
    }
    case 'fire':
      for (const sc of A.fire.scenarios) {
        if (st.messy) for (const ab of A.fire.abilities) s = go(s, { type: 'answer', qid: sc.id, value: ab.id });
        else s = go(s, { type: 'answer', qid: sc.id, value: sc.answer });
      }
      return s;
    case 'letter':
      return go(s, { type: 'activityDone' });
    case 'favorites':
      for (const g of A.favorites.groups) s = go(s, { type: 'pick', id: `${g.id}:${g.options[st.messy ? 1 : 0]}` });
      return go(s, { type: 'activityDone' });
    default:
      return s;
  }
}

function afternoon(s: GameState, st: Style): GameState {
  const a = dayDef(content, s.day).afternoon;
  s = go(s, { type: 'startAfternoon' });
  if (a.kind === 'research' && st.research) {
    const set = content.archiveSets[a.set];
    for (const p of set.pages) {
      const rating = p.credibility === 'trusted' ? 'trust' : p.credibility === 'mixed' ? 'unsure' : 'distrust';
      s = run(s, [{ type: 'openPage', pageId: p.id }, { type: 'rate', pageId: p.id, rating }]).state;
      if (p.trap) s = go(s, { type: 'trapChoice', pageId: p.id, choice: 'close' });
    }
    s = go(s, { type: 'saveTip' });
  }
  if (a.kind === 'clues') {
    const items = A.clues[a.set].items;
    for (const i of st.messy ? items : items.filter((x) => x.real)) s = go(s, { type: 'pick', id: i.id });
  }
  if (a.kind === 'board') {
    const strong = A.evidence.items.filter((e) => e.strong && s.world.evidence.includes(e.id)).map((e) => e.id);
    if (st.messy) s = run(s, [{ type: 'pick', id: 'mean-face' }, { type: 'pick', id: 'kit-spooky' }, { type: 'pick', id: strong[0] }, { type: 'submit' }]).state;
    for (const id of strong) if (s.task.picks.length < A.evidence.pick && !s.task.picks.includes(id)) s = go(s, { type: 'pick', id });
    s = go(s, { type: 'submit' });
  }
  if (a.kind === 'map') {
    for (const q of A.map.questions) {
      if (st.messy) for (const c of q.choices) s = go(s, { type: 'answer', qid: q.id, value: c });
      else s = go(s, { type: 'answer', qid: q.id, value: q.answer });
    }
  }
  if (a.kind === 'farewell') s = go(s, { type: 'activityDone' });
  return go(s, { type: 'startEvening' });
}

function evening(s: GameState, st: Style): GameState {
  for (let i = 0; i < 600 && !s.evening.over; i++) {
    const e = s.evening;
    if (e.stones.active) s = go(s, { type: 'stepOrder', order: ['blink', 'hungry', 'kit'], reason: 'quick' });
    if (s.evening.awaiting) s = go(s, { type: 'visitorChoice', choiceId: st.tell ? 'tell' : 'quiet' });
    const sp = s.evening.special;
    if (sp.active && sp.kind === 'crane-door') for (const c of A.clues.crane.items) if (st.messy || c.real) s = go(s, { type: 'pick', id: c.id });
    if (sp.active && sp.kind === 'hill-flight') for (let k = 0; k < A.flight.tries; k++) s = go(s, { type: 'flap', power: st.messy ? 5 : 70 });
    if (sp.active && sp.kind === 'choice') s = go(s, { type: 'chooseEnding', choice: st.ending });
    s = go(s, { type: 'tick', dt: 1 });
  }
  if (!s.evening.over) throw new Error(`Day ${s.day}: evening did not finish`);
  return go(s, { type: 'finishDay' });
}

function playDay(s: GameState, st: Style): GameState {
  s = morningActivity(s, st);
  s = care(s);
  s = go(s, { type: 'finishMorning' });
  s = afternoon(s, st);
  s = evening(s, st);
  if (s.part !== 'end') throw new Error(`Day ${s.day} did not end`);
  return s;
}

/** Plays from Day 1 up to (and including) `until`. */
function playTo(until: number, st: Style = SENSIBLE): GameState {
  let s = caring(3);
  for (;;) {
    s = playDay(s, st);
    if (s.day >= until) return s;
    s = go(s, { type: 'nextDay' });
  }
}

/** The morning of `day`, after everything before it was played. */
function morningOf(day: number, st: Style = SENSIBLE): GameState {
  return go(playTo(day - 1, st), { type: 'nextDay' });
}

describe('the full nine-day game', () => {
  const styles: [string, Style][] = [
    ['a careful player who tells family early and stays', SENSIBLE],
    ['a careful player who flies with the flock', { ...SENSIBLE, ending: 'fly' }],
    ['a messy guesser who keeps the dragon quiet until Day 4', { tell: false, messy: true, research: false, ending: 'fly' }],
    ['a messy guesser who stays', { tell: false, messy: true, research: false, ending: 'stay' }],
  ];

  for (const [label, st] of styles) {
    it(`reaches a warm ending: ${label}`, () => {
      const s = playTo(lastDay(content), st);
      expect(lastDay(content)).toBe(9);
      expect(s.day).toBe(9);
      expect(s.history.map((h) => h.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(s.world.ending).toBe(st.ending);
      expect(s.world.circle).toEqual(expect.arrayContaining(['june', 'kit', 'parents']));
      expect(s.world.craneGone).toBe(true);
      expect(s.world.collectorAttention).toBe(0);
      expect(s.stickers).toContain('Chose Together');
      // No day after the last one.
      expect(go(s, { type: 'nextDay' }).day).toBe(9);
      // Bond only adds extras; the epilogue itself always exists.
      const ending = A.ending.choices.find((c) => c.id === st.ending)!;
      expect(ending.epilogue.length).toBeGreaterThan(20);
      expect(bondExtras(s, content).length).toBeLessThanOrEqual(A.ending.bondExtras.length);
    });
  }

  it('careful play earns more Bond extras than messy play, but both endings are complete', () => {
    const careful = playTo(9, SENSIBLE);
    const messy = playTo(9, { tell: false, messy: true, research: false, ending: 'stay' });
    expect(bondScore(careful)).toBeGreaterThan(bondScore(messy));
    expect(bondExtras(careful, content).length).toBeGreaterThan(0);
  });

  it('moves into Chapter 2 after Day 3, as a fledgling with a 2× recipe', () => {
    const s = morningOf(4);
    expect(s.day).toBe(4);
    expect(s.dragon.stage).toBe('fledgling');
    expect(dayDef(content, 4).morning.recipeScale).toBe(2);
  });
});

describe('Day 4: the family meeting', () => {
  it('everyone who did not know is told, honestly, and joins the Keeper Circle', () => {
    let s = morningOf(4, { ...SENSIBLE, tell: false });
    expect(s.world.circle).not.toContain('parents');
    const r = step(s, { type: 'familyMeeting' });
    expect(r.events).toContainEqual({ type: 'family-meeting', joined: expect.arrayContaining(['parents']) });
    s = r.state;
    expect(s.world.circle).toEqual(expect.arrayContaining(['parents', 'kit']));
    expect(s.stickers).toContain('I Trusted My Family');
  });

  it('the afternoon waits until the meeting and the nest are done', () => {
    let s = care(morningOf(4));
    s = go(s, { type: 'finishMorning' });
    expect(go(s, { type: 'startAfternoon' }).part).toBe('morning');
    s = morningActivity(s, SENSIBLE);
    expect(go(s, { type: 'startAfternoon' }).part).toBe('afternoon');
  });

  it('the meeting button always says "Show ... the dragon"', () => {
    expect(A.family.notToldButton.startsWith('Show ')).toBe(true);
    expect(A.family.notToldButton).toMatch(/dragon/);
  });
});

describe('fair play in Chapters 2–3', () => {
  it('insulation: the nest holds two materials; a wrong pick is explained and costs nothing', () => {
    let s = go(morningOf(4), { type: 'familyMeeting' });
    s = run(s, ['foil', 'newspaper', 'wool'].map((id) => ({ type: 'pick', id }) as Action)).state;
    expect(s.activity.picks).toEqual(['foil', 'newspaper']);
    const r = step(s, { type: 'submit' });
    expect(r.events).toContainEqual({ type: 'submitted', ok: false, wrong: ['foil', 'newspaper'] });
    s = run(r.state, [{ type: 'pick', id: 'wool' }, { type: 'pick', id: 'straw' }, { type: 'submit' }]).state;
    expect(s.activity.done).toBe(true);
    expect(s.stickers).not.toContain('Nest Scientist'); // the sticker needs a first-try nest
  });

  it('insulation: testing tells you the answer, so a first-try nest earns the sticker', () => {
    const best = [...A.insulation.materials].filter((m) => m.dry).sort((a, b) => b.warmth - a.warmth).slice(0, 2).map((m) => m.id);
    expect(best.sort()).toEqual([...A.insulation.best].sort());
    let s = go(morningOf(4), { type: 'familyMeeting' });
    s = run(s, [...best.map((id) => ({ type: 'pick', id }) as Action), { type: 'submit' }]).state;
    expect(s.stickers).toContain('Nest Scientist');
  });

  it('flight: flapping as hard as possible never goes farther than a steady green-zone flap', () => {
    for (const p of [0, 20, 40, 90, 100]) expect(flightDistance(p, content)).toBeLessThan(flightDistance(70, content));
    for (let p = A.flight.zone[0]; p <= A.flight.zone[1]; p++) expect(flightDistance(p, content)).toBeGreaterThanOrEqual(flightDistance(A.flight.zone[0], content));
  });

  it('flight: three tries only, and the sticker needs a flap in the green zone', () => {
    let s = morningOf(5);
    s = run(s, [0, 100, 95, 70, 70].map((power) => ({ type: 'flap', power }) as Action)).state;
    expect(s.activity.tries).toHaveLength(3);
    expect(s.stickers).not.toContain('Flight School');
    s = morningOf(5);
    s = go(s, { type: 'flap', power: 72 });
    expect(s.stickers).toContain('Flight School');
  });

  it('flight: the graph question has one right answer, and guessing first loses the sticker', () => {
    let s = run(morningOf(5), [40, 60, 70].map((power) => ({ type: 'flap', power }) as Action)).state;
    const right = String(flightAnswer(s.activity.tries));
    expect(Number(right)).toBe(flightDistance(70, content) - flightDistance(40, content));
    s = run(s, [{ type: 'answer', qid: 'graph', value: '1' }, { type: 'answer', qid: 'graph', value: right }]).state;
    expect(s.activity.done).toBe(true);
    expect(s.stickers).not.toContain('Graph Reader');
  });

  it('fire control: trying every button finishes the lesson but earns no sticker', () => {
    const messy = morningActivity(morningOf(6), { ...SENSIBLE, messy: true });
    expect(messy.activity.done).toBe(true);
    expect(messy.stickers).not.toContain('Fire Safety Expert');
    const careful = morningActivity(morningOf(6), SENSIBLE);
    expect(careful.stickers).toContain('Fire Safety Expert');
  });

  it('fire is only ever made by the dragon, outdoors on the stone slab', () => {
    const text = JSON.stringify(A.fire).toLowerCase();
    expect(text).toContain('stone slab');
    expect(text).not.toMatch(/\b(match|matches|lighter)\b/);
    expect(A.fire.scenarios.find((s) => s.answer === 'spark')!.job.toLowerCase()).toContain('outdoors');
  });

  it('the right answers are never simply listed first', () => {
    expect(A.insulation.materials.slice(0, 2).map((m) => m.id).sort()).not.toEqual([...A.insulation.best].sort());
    for (const set of Object.values(A.clues)) expect(set.items.slice(0, set.items.filter((i) => i.real).length).every((i) => i.real)).toBe(false);
    expect(A.evidence.items.slice(0, A.evidence.pick).every((e) => e.strong)).toBe(false);
    for (const q of A.map.questions) expect(q.choices[0]).not.toBe(q.answer);
  });

  it('clues: tapping everything finds the clues but not the Sharp Eyes sticker', () => {
    const atPoster = go(go(care(morningActivity(morningOf(4), SENSIBLE)), { type: 'finishMorning' }), { type: 'startAfternoon' });
    let s = run(atPoster, A.clues.poster.items.map((i) => ({ type: 'pick', id: i.id }) as Action)).state;
    expect(s.task.done).toBe(true);
    expect(s.world.evidence).toContain('poster');
    expect(s.stickers).not.toContain('Sharp Eyes');
    s = run(atPoster, A.clues.poster.items.filter((i) => i.real).map((i) => ({ type: 'pick', id: i.id }) as Action)).state;
    expect(s.stickers).toContain('Sharp Eyes');
  });

  it('the evening waits until the afternoon task is done', () => {
    const atPoster = go(go(care(morningActivity(morningOf(4), SENSIBLE)), { type: 'finishMorning' }), { type: 'startAfternoon' });
    expect(go(atPoster, { type: 'startEvening' }).part).toBe('afternoon');
  });

  it('research: judging the fake rescue site and the library directory correctly adds evidence', () => {
    const s = playTo(5);
    expect(s.world.evidence).toEqual(expect.arrayContaining(['poster', 'fake-site', 'directory']));
  });

  it('Crane at the door pauses the evening until the clues are found, and gives evidence', () => {
    let s = playTo(5);
    s = go(s, { type: 'nextDay' });
    s = afternoon(go(care(morningActivity(s, SENSIBLE)), { type: 'finishMorning' }), SENSIBLE);
    for (let i = 0; i < 60 && !s.evening.special.active; i++) s = go(s, { type: 'tick', dt: 1 });
    expect(s.evening.special.kind).toBe('crane-door');
    const t = s.evening.t;
    s = run(s, Array.from({ length: 10 }, () => ({ type: 'tick', dt: 1 }) as Action)).state;
    expect(s.evening.t).toBe(t);
    expect(go(s, { type: 'finishDay' }).part).toBe('evening');
    s = run(s, A.clues.crane.items.filter((c) => c.real).map((c) => ({ type: 'pick', id: c.id }) as Action)).state;
    expect(s.evening.special.done).toBe(true);
    expect(s.world.evidence).toContain('business-card');
  });

  it('the Evidence Board rejects weak "evidence" with a reason, and Aunt June fills any gaps', () => {
    const noResearch: Style = { tell: true, messy: false, research: false, ending: 'stay' };
    let s = go(care(morningOf(7, noResearch)), { type: 'finishMorning' });
    const r = step(s, { type: 'startAfternoon' });
    s = r.state;
    const juneFilled = r.events.find((e) => e.type === 'june-filled');
    const strong = A.evidence.items.filter((e) => e.strong && s.world.evidence.includes(e.id));
    expect(strong.length).toBeGreaterThanOrEqual(A.evidence.pick);
    expect(juneFilled === undefined || s.task.juneFilled.length > 0).toBe(true);
    for (const weak of A.evidence.items.filter((e) => !e.strong)) expect(weak.why).toBeTruthy();
    s = run(s, [{ type: 'pick', id: 'mean-face' }, { type: 'pick', id: strong[0].id }, { type: 'pick', id: strong[1].id }]).state;
    const sub = step(s, { type: 'submit' });
    expect(sub.events).toContainEqual({ type: 'submitted', ok: false, wrong: ['mean-face'] });
    expect(sub.state.world.craneGone).toBe(false);
    s = run(sub.state, [{ type: 'pick', id: strong[2].id }, { type: 'submit' }]).state;
    expect(s.task.done).toBe(true);
    expect(s.world.craneGone).toBe(true);
    expect(s.stickers).not.toContain('Fact Finder');
  });

  it('a player who skipped the library still gets enough evidence from Aunt June', () => {
    const s = playTo(7, { tell: false, messy: true, research: false, ending: 'stay' });
    expect(s.world.craneGone).toBe(true);
  });

  it('map: wrong answers show the working and cost nothing; first-try answers earn Navigator', () => {
    const atMap = go(go(care(morningActivity(morningOf(8), SENSIBLE)), { type: 'finishMorning' }), { type: 'startAfternoon' });
    for (const q of A.map.questions) expect(q.choices).toContain(q.answer);
    const messy = afternoon(go(care(morningActivity(morningOf(8), SENSIBLE)), { type: 'finishMorning' }), { ...SENSIBLE, messy: true });
    expect(messy.part).toBe('evening');
    expect(messy.stickers).not.toContain('Navigator');
    const careful = run(atMap, A.map.questions.map((q) => ({ type: 'answer', qid: q.id, value: q.answer }) as Action)).state;
    expect(careful.stickers).toContain('Navigator');
  });

  it('map maths matches the map', () => {
    const m = A.map;
    const squares = Math.abs(m.lakes[0] - m.home[0]) + Math.abs(m.lakes[1] - m.home[1]);
    expect(m.questions.find((q) => q.id === 'distance')!.answer).toBe(`${squares * 10} miles`);
    expect(m.lakes[1] < m.home[1] && m.lakes[0] > m.home[0]).toBe(true); // up and right: north-east
    expect(m.questions.find((q) => q.id === 'direction')!.answer).toBe('North-east');
  });

  it('the ending can only be chosen at sunset on Day 9, and both choices are offered', () => {
    expect(A.ending.choices.map((c) => c.id).sort()).toEqual(['fly', 'stay']);
    const s = morningOf(8);
    expect(go(s, { type: 'chooseEnding', choice: 'fly' }).world.ending).toBeNull();
    // "Fly" is never a permanent goodbye.
    expect(A.ending.choices.find((c) => c.id === 'fly')!.epilogue.toLowerCase()).toMatch(/home|visit|back/);
  });
});

describe('old Chapter 1 saves', () => {
  it('a version 4 save is upgraded with empty Chapter 2–3 progress', async () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    };
    const old = structuredClone(caring()) as Partial<GameState> & { version: number };
    old.version = 4;
    delete old.activity;
    delete old.task;
    const w = old.world as unknown as Record<string, unknown>;
    delete w.evidence;
    delete w.ending;
    store.set('dragon-keeper:proto-save', JSON.stringify(old));
    const { loadSave } = await import('../src/core/save');
    const s = loadSave()!;
    expect(s.version).toBe(5);
    expect(s.world.evidence).toEqual([]);
    expect(s.world.ending).toBeNull();
    expect(s.activity.done).toBe(false);
    expect(s.evening.special.active).toBe(false);
    // A name typed in an older version is replaced: only listed names are shown now.
    const typed = { ...old, dragon: { ...old.dragon!, name: 'Typed Name' } };
    store.set('dragon-keeper:proto-save', JSON.stringify(typed));
    expect(loadSave()!.dragon.name).toBe(content.names.default);
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

describe('the flight game score', () => {
  it('more rings always flies farther, all but one ring is still green-zone, and the best needs every ring', async () => {
    const { flightPower, inZone } = await import('../src/core/chapters');
    const total = 6;
    const d = Array.from({ length: total + 1 }, (_, r) => flightDistance(flightPower(r, total), content));
    for (let r = 1; r <= total; r++) expect(d[r]).toBeGreaterThan(d[r - 1]);
    expect(inZone(flightPower(total, total), content)).toBe(true);
    expect(inZone(flightPower(total - 1, total), content)).toBe(true);
    expect(inZone(flightPower(total - 2, total), content)).toBe(false);
    expect(flightPower(99, total)).toBe(flightPower(total, total)); // can't score more than every ring
  });
});
