/**
 * Chapters 2–3 rules: morning lessons, afternoon tasks, evening story moments, the
 * Evidence Board and the ending. Called from `step` in reducer.ts with the same
 * contract: mutate the cloned state, push events, never throw.
 *
 * Fair play (spec §5.9, §6.5): wrong picks and answers cost nothing and are explained,
 * but stickers need real skill (a first-try answer, a clean set of clues, a flight in
 * the green zone), so tapping everything or guessing is never the best way to play.
 */
import { dayDef, eveningFor, type Content } from './content';
import type { Action, GameEvent, GameState, TaskState } from './state';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function addSticker(s: GameState, id: string) {
  if (!s.stickers.includes(id)) s.stickers.push(id);
}

type Slot = 'morning' | 'afternoon' | 'evening';
const TASK_KINDS = ['clues', 'board', 'map', 'farewell'];

/** Which activity the player is doing right now, if any. */
function current(s: GameState, c: Content): { slot: Slot; t: TaskState; kind: string } | null {
  const def = dayDef(c, s.day);
  // The lesson comes before care, but can still be finished after 'Off to school' (e.g. after reloading).
  if (s.part === 'morning' && (s.phase === 'care' || s.phase === 'done') && def.morning.activity) return { slot: 'morning', t: s.activity, kind: def.morning.activity };
  if (s.part === 'afternoon' && TASK_KINDS.includes(def.afternoon.kind)) return { slot: 'afternoon', t: s.task, kind: def.afternoon.kind };
  const sp = s.evening.special;
  if (s.part === 'evening' && sp.active && sp.kind) return { slot: 'evening', t: sp, kind: sp.kind };
  return null;
}

/** The morning lesson must be finished before the afternoon (and the family meeting on Day 4). */
export function morningActivityDone(s: GameState, c: Content): boolean {
  const def = dayDef(c, s.day).morning;
  return (!def.activity || s.activity.done) && (def.opening !== 'family' || s.world.familyMeeting);
}

/** Afternoon tasks (clues, Evidence Board, map, farewells) must be finished before the evening. */
export function afternoonTaskDone(s: GameState, c: Content): boolean {
  return !TASK_KINDS.includes(dayDef(c, s.day).afternoon.kind) || s.task.done;
}

export function specialDone(s: GameState, c: Content): boolean {
  return !eveningFor(c, s.day).special || s.evening.special.done;
}

/** How far a flap carries the dragon: farthest in the middle of the green zone, never more for flapping wildly. */
export function flightDistance(power: number, c: Content): number {
  const { zone, maxDistance } = c.activities.flight;
  const mid = (zone[0] + zone[1]) / 2;
  const p = Math.max(0, Math.min(100, power));
  return Math.max(2, Math.round(maxDistance * (1 - Math.abs(p - mid) / 50)));
}

export function inZone(power: number, c: Content): boolean {
  const [lo, hi] = c.activities.flight.zone;
  return power >= lo && power <= hi;
}

/** The bar-graph question: how much farther the best try went than the first. */
export function flightAnswer(tries: number[]): number {
  return tries.length ? Math.max(...tries) - tries[0] : 0;
}

export function addEvidence(s: GameState, id: string, events: GameEvent[]) {
  if (s.world.evidence.includes(id)) return;
  s.world.evidence.push(id);
  events.push({ type: 'evidence', id });
}

/** Evidence the player can pin to the board: what they found, plus the weak "evidence" to think about. */
export function boardItems(s: GameState, c: Content) {
  return c.activities.evidence.items.filter((e) => !e.strong || s.world.evidence.includes(e.id));
}

function finish(s: GameState, slot: Slot, t: TaskState, events: GameEvent[]) {
  t.done = true;
  if (slot === 'evening') s.evening.special.active = false;
  events.push({ type: 'activity-done', slot });
}

function pickClue(s: GameState, slot: Slot, t: TaskState, set: string, id: string, events: GameEvent[], c: Content) {
  const clues = c.activities.clues[set];
  const item = clues?.items.find((i) => i.id === id);
  if (!item || t.picks.includes(id) || t.wrong.includes(id)) return;
  // A wrong tap is explained and costs nothing, but it doesn't count as a clue.
  if (item.real) t.picks.push(id);
  else t.wrong.push(id);
  events.push({ type: 'picked', id, on: true, ok: item.real });
  if (clues.items.filter((i) => i.real).every((i) => t.picks.includes(i.id))) {
    if (t.wrong.length === 0) addSticker(s, 'Sharp Eyes');
    addEvidence(s, clues.evidence, events);
    finish(s, slot, t, events);
  }
}

function stepPick(s: GameState, id: string, events: GameEvent[], c: Content) {
  const cur = current(s, c);
  if (!cur || cur.t.done) return;
  const { slot, t, kind } = cur;
  const a = c.activities;
  if (kind === 'insulation') {
    if (!a.insulation.materials.some((m) => m.id === id)) return;
    const on = !t.picks.includes(id);
    if (on && t.picks.length >= a.insulation.pick) return;
    t.picks = on ? [...t.picks, id] : t.picks.filter((x) => x !== id);
    events.push({ type: 'picked', id, on, ok: true });
  } else if (kind === 'favorites') {
    const [group, option] = id.split(':');
    const g = a.favorites.groups.find((x) => x.id === group);
    if (!g || !g.options.includes(option)) return;
    t.picks = [...t.picks.filter((x) => !x.startsWith(`${group}:`)), id];
    events.push({ type: 'picked', id, on: true, ok: true });
  } else if (kind === 'clues') {
    const def = dayDef(c, s.day).afternoon;
    if (def.kind === 'clues') pickClue(s, slot, t, def.set, id, events, c);
  } else if (kind === 'crane-door') {
    pickClue(s, slot, t, 'crane', id, events, c);
  } else if (kind === 'board') {
    if (!boardItems(s, c).some((e) => e.id === id)) return;
    const on = !t.picks.includes(id);
    if (on && t.picks.length >= a.evidence.pick) return;
    t.picks = on ? [...t.picks, id] : t.picks.filter((x) => x !== id);
    events.push({ type: 'picked', id, on, ok: true });
  }
}

function stepSubmit(s: GameState, events: GameEvent[], c: Content) {
  const cur = current(s, c);
  if (!cur || cur.t.done) return;
  const { slot, t, kind } = cur;
  const a = c.activities;
  if (kind === 'insulation') {
    if (t.picks.length !== a.insulation.pick) return;
    t.submits += 1;
    const wrong = t.picks.filter((id) => !a.insulation.best.includes(id));
    events.push({ type: 'submitted', ok: wrong.length === 0, wrong });
    if (wrong.length) {
      // Explained, then the player tries again: nothing is lost.
      t.picks = t.picks.filter((id) => !wrong.includes(id));
      return;
    }
    if (t.submits === 1) addSticker(s, 'Nest Scientist');
    s.dragon.calm = clamp(s.dragon.calm + 10);
    finish(s, slot, t, events);
  } else if (kind === 'board') {
    if (t.picks.length !== a.evidence.pick) return;
    t.submits += 1;
    const weak = t.picks.filter((id) => !a.evidence.items.find((e) => e.id === id)?.strong);
    events.push({ type: 'submitted', ok: weak.length === 0, wrong: weak });
    if (weak.length) {
      for (const w of weak) if (!t.wrong.includes(w)) t.wrong.push(w);
      t.picks = t.picks.filter((id) => !weak.includes(id));
      return;
    }
    if (t.submits === 1) addSticker(s, 'Fact Finder');
    // The real wildlife rescue (trusted adults) takes it from here, and Crane leaves town.
    s.world.craneGone = true;
    s.world.collectorAttention = 0;
    events.push({ type: 'crane-left' });
    finish(s, slot, t, events);
  }
}

function stepFlap(s: GameState, power: number, events: GameEvent[], c: Content) {
  const cur = current(s, c);
  if (!cur || cur.t.done || (cur.kind !== 'flight' && cur.kind !== 'hill-flight')) return;
  const { slot, t, kind } = cur;
  const f = c.activities.flight;
  if (t.tries.length >= f.tries || !Number.isFinite(power)) return;
  const distance = flightDistance(power, c);
  const zone = inZone(power, c);
  t.tries.push(distance);
  events.push({ type: 'flapped', power, distance, inZone: zone, tryNo: t.tries.length });
  if (zone) addSticker(s, kind === 'flight' ? 'Flight School' : 'Sky High');
  // The hill flight ends after the tries; morning practice ends with the bar-graph question.
  if (kind === 'hill-flight' && t.tries.length >= f.tries) finish(s, slot, t, events);
}

function stepAnswer(s: GameState, qid: string, value: string, events: GameEvent[], c: Content) {
  const cur = current(s, c);
  if (!cur || cur.t.done) return;
  const { slot, t, kind } = cur;
  const a = c.activities;
  let correct: boolean;
  let all: string[];
  let sticker: string;
  if (kind === 'flight') {
    if (qid !== 'graph' || t.tries.length < a.flight.tries) return;
    correct = Number(value) === flightAnswer(t.tries);
    all = ['graph'];
    sticker = 'Graph Reader';
  } else if (kind === 'fire') {
    const sc = a.fire.scenarios.find((x) => x.id === qid);
    if (!sc) return;
    correct = sc.answer === value;
    all = a.fire.scenarios.map((x) => x.id);
    sticker = 'Fire Safety Expert';
  } else if (kind === 'map') {
    const q = a.map.questions.find((x) => x.id === qid);
    if (!q) return;
    correct = q.answer === value;
    all = a.map.questions.map((x) => x.id);
    sticker = 'Navigator';
  } else return;
  if (t.correct.includes(qid)) return;
  events.push({ type: 'answered', qid, correct });
  if (!correct) {
    // The screen shows the working; try again for free. Only first-try answers count for the sticker.
    if (!t.missed.includes(qid)) t.missed.push(qid);
    return;
  }
  t.correct.push(qid);
  if (all.every((x) => t.correct.includes(x))) {
    if (t.missed.length === 0) addSticker(s, sticker);
    finish(s, slot, t, events);
  }
}

function stepDone(s: GameState, events: GameEvent[], c: Content) {
  const cur = current(s, c);
  if (!cur || cur.t.done) return;
  const { slot, t, kind } = cur;
  if (kind === 'favorites') {
    const groups = c.activities.favorites.groups;
    if (!groups.every((g) => t.picks.some((p) => p.startsWith(`${g.id}:`)))) return;
    for (const p of t.picks) {
      const [g, o] = p.split(':');
      s.world.favorites[g] = o;
    }
    s.dragon.calm = clamp(s.dragon.calm + 10);
    finish(s, slot, t, events);
  } else if (kind === 'letter' || kind === 'farewell') {
    finish(s, slot, t, events);
  }
}

function stepFamilyMeeting(s: GameState, events: GameEvent[], c: Content) {
  const def = dayDef(c, s.day).morning;
  if (s.part !== 'morning' || def.opening !== 'family' || s.world.familyMeeting) return;
  // A dragon this size needs the whole family. Everyone who doesn't know yet is told, honestly.
  const joined = ['parents', 'kit'].filter((m) => !s.world.circle.includes(m));
  s.world.circle.push(...joined);
  s.world.familyMeeting = true;
  if (joined.length) addSticker(s, 'I Trusted My Family');
  events.push({ type: 'family-meeting', joined });
}

function stepEnding(s: GameState, choice: 'stay' | 'fly', events: GameEvent[]) {
  const sp = s.evening.special;
  if (s.part !== 'evening' || !sp.active || sp.kind !== 'choice' || (choice !== 'stay' && choice !== 'fly')) return;
  // Both choices are good ones, made together. Bond only adds epilogue extras (spec §6.4).
  s.world.ending = choice;
  addSticker(s, 'Chose Together');
  events.push({ type: 'ending-chosen', choice });
  finish(s, 'evening', sp, events);
}

export function stepChapters(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  switch (a.type) {
    case 'familyMeeting':
      stepFamilyMeeting(s, events, c);
      return true;
    case 'pick':
      stepPick(s, a.id, events, c);
      return true;
    case 'submit':
      stepSubmit(s, events, c);
      return true;
    case 'flap':
      stepFlap(s, a.power, events, c);
      return true;
    case 'answer':
      stepAnswer(s, a.qid, a.value, events, c);
      return true;
    case 'activityDone':
      stepDone(s, events, c);
      return true;
    case 'chooseEnding':
      stepEnding(s, a.choice, events);
      return true;
    default:
      return false;
  }
}

/** Day 7: Aunt June fills any gaps, so every player has enough strong evidence for the board. */
export function onBoardStart(s: GameState, events: GameEvent[], c: Content) {
  const ev = c.activities.evidence;
  const strong = ev.items.filter((e) => e.strong);
  const have = strong.filter((e) => s.world.evidence.includes(e.id)).length;
  const missing = strong.filter((e) => !s.world.evidence.includes(e.id)).slice(0, Math.max(0, ev.pick - have));
  if (!missing.length) return;
  for (const m of missing) addEvidence(s, m.id, events);
  s.task.juneFilled = missing.map((m) => m.id);
  events.push({ type: 'june-filled', ids: s.task.juneFilled });
}

/** Starts tonight's story moment once its time comes. Returns true while it holds the evening. */
export function tickSpecial(s: GameState, events: GameEvent[], c: Content): boolean {
  const ev = eveningFor(c, s.day);
  const sp = s.evening.special;
  if (!ev.special || sp.done) return false;
  if (sp.active) return true;
  if (s.evening.t >= (ev.specialAt ?? 0)) {
    sp.kind = ev.special;
    sp.active = true;
    events.push({ type: 'special', kind: ev.special });
    return true;
  }
  return false;
}

/**
 * Bond (spec §6.4): how well the dragon was cared for over the week. Never shown as a
 * number; it only adds epilogue extras, and every player gets a warm, complete ending.
 */
export function bondScore(s: GameState): number {
  const h = s.history;
  const count = (f: (x: (typeof h)[number]) => boolean) => h.filter(f).length;
  const has = (id: string) => s.stickers.includes(id);
  const thoughts = h.reduce((n, x) => n + (x.thoughts ?? 0), 0);
  return [
    count((x) => x.ready) >= 6,
    count((x) => x.balancedPlate) >= 6,
    count((x) => x.scaredKnocks === 0) >= 6,
    thoughts >= 9, // hints count the same as solving alone
    has('Owned Up'),
    has('Privacy Pro'),
    has('Good as New'),
    s.reading.readTo.length >= 3,
  ].filter(Boolean).length;
}

export function bondExtras(s: GameState, c: Content): string[] {
  const score = bondScore(s);
  return c.activities.ending.bondExtras.filter((x) => x.line && score >= x.min).map((x) => x.line);
}
