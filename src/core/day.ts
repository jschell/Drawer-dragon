/**
 * Afternoon (research) and evening (protect) rules. Called from `step` in reducer.ts,
 * so they share its contract: mutate the cloned state `s`, push events, never throw.
 */
import type { Content, PageDef } from './content';
import type { Action, GameEvent, GameState, Rating } from './state';

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function attentionWord(level: number): 'Unnoticed' | 'Curious' | 'Watching!' {
  return level < 20 ? 'Unnoticed' : level < 50 ? 'Curious' : 'Watching!';
}

function addAttention(s: GameState, delta: number, events: GameEvent[]) {
  const before = s.world.collectorAttention;
  s.world.collectorAttention = clamp(before + delta);
  const d = s.world.collectorAttention - before;
  if (d !== 0) events.push({ type: 'attention', delta: d, level: s.world.collectorAttention });
}

function addSticker(s: GameState, id: string) {
  if (!s.stickers.includes(id)) s.stickers.push(id);
}

/** The right call for each kind of page: trust the reliable one, doubt the rest. */
export function ratingIsCorrect(page: PageDef, rating: Rating): boolean {
  if (page.credibility === 'trusted') return rating === 'trust';
  if (page.credibility === 'mixed') return rating !== 'trust';
  return rating === 'distrust';
}

/** Pages matching every chosen keyword, in search-engine order. */
export function searchPages(chips: string[], c: Content): PageDef[] {
  if (chips.length === 0) return [];
  return c.archive.pages.filter((p) => chips.every((k) => p.keywords.includes(k))).sort((a, b) => a.rank - b.rank);
}

export function stepAfternoon(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const r = s.research;
  const page = (id: string) => c.archive.pages.find((p) => p.id === id);
  switch (a.type) {
    case 'startAfternoon':
      if (s.part !== 'morning' || s.phase !== 'done') return true;
      s.part = 'afternoon';
      events.push({ type: 'afternoon-start' });
      return true;
    case 'search': {
      if (s.part !== 'afternoon') return true;
      const chips = [...new Set(a.chips)].filter((k) => c.archive.chips.includes(k)).slice(0, c.archive.maxChips);
      r.query = chips;
      if (chips.length === 0) {
        r.results = [];
        r.feedback = 'empty';
      } else {
        r.searches += 1;
        const found = searchPages(chips, c);
        r.results = found.map((p) => p.id);
        r.feedback = found.length === 0 ? 'none' : found.length > c.archive.tooMany ? 'too-many' : 'ok';
        if (r.foundAnswerOnSearch === null && r.results.includes(c.archive.answerPageId)) r.foundAnswerOnSearch = r.searches;
      }
      events.push({ type: 'search-results', ids: r.results, feedback: r.feedback });
      return true;
    }
    case 'openPage': {
      if (s.part !== 'afternoon' || !page(a.pageId)) return true;
      if (!r.opened.includes(a.pageId)) r.opened.push(a.pageId);
      events.push({ type: 'page-opened', pageId: a.pageId });
      return true;
    }
    case 'check': {
      if (s.part !== 'afternoon' || !page(a.pageId)) return true;
      const list = (r.checks[a.pageId] ??= []);
      if (!list.includes(a.check)) list.push(a.check);
      events.push({ type: 'check-revealed', pageId: a.pageId, check: a.check });
      return true;
    }
    case 'rate': {
      const p = page(a.pageId);
      if (s.part !== 'afternoon' || !p) return true;
      r.ratings[a.pageId] = a.rating;
      events.push({ type: 'rated', pageId: a.pageId, rating: a.rating, correct: ratingIsCorrect(p, a.rating) });
      return true;
    }
    case 'trapChoice': {
      const p = page(a.pageId);
      if (s.part !== 'afternoon' || !p?.trap || r.trapChoices[a.pageId]) return true;
      r.trapChoices[a.pageId] = a.choice;
      events.push({ type: 'trap', pageId: a.pageId, choice: a.choice });
      if (a.choice === 'share') addAttention(s, c.evening.attention.share, events);
      return true;
    }
    case 'saveTip': {
      const id = c.archive.answerPageId;
      // You can only save the tip after checking it's trustworthy: that's the lesson.
      if (s.part !== 'afternoon' || r.tipSaved || r.ratings[id] !== 'trust') return true;
      r.tipSaved = true;
      s.world.blanketUnlocked = true;
      events.push({ type: 'tip-saved' });
      return true;
    }
    default:
      return false;
  }
}

function awardAfternoon(s: GameState, c: Content) {
  const r = s.research;
  if (r.foundAnswerOnSearch !== null && r.foundAnswerOnSearch <= 3) addSticker(s, 'Search Star');
  const rated = Object.entries(r.ratings);
  if (rated.length >= 3 && rated.every(([id, rating]) => ratingIsCorrect(c.archive.pages.find((p) => p.id === id)!, rating))) addSticker(s, 'Source Sleuth');
  const traps = Object.values(r.trapChoices);
  if (traps.length > 0 && !traps.includes('share')) addSticker(s, 'Privacy Pro');
}

export function stepEvening(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const e = s.evening;
  const ev = c.evening;
  const d = s.dragon;
  switch (a.type) {
    case 'startEvening':
      if (s.part !== 'afternoon') return true;
      awardAfternoon(s, c);
      s.part = 'evening';
      d.calm = ev.startCalm;
      events.push({ type: 'evening-start' });
      return true;
    case 'lamp':
      if (s.part !== 'evening' || e.over) return true;
      e.lampDim = !e.lampDim;
      events.push({ type: 'lamp', dim: e.lampDim });
      return true;
    case 'blanket':
      if (s.part !== 'evening' || e.over || !s.world.blanketUnlocked) return true;
      e.blanket = !e.blanket;
      if (e.blanket) d.calm = clamp(d.calm + 8);
      events.push({ type: 'blanket', on: e.blanket });
      return true;
    case 'windowTap': {
      if (s.part !== 'evening' || !e.window || e.window.id !== a.thingId) return true;
      const thing = ev.windowThings.find((w) => w.id === a.thingId)!;
      e.window = null;
      e.windowIdx += 1;
      if (thing.suspicious) {
        e.spotted += 1;
        addAttention(s, ev.attention.spotted, events);
      }
      events.push({ type: 'spotted', thingId: thing.id, suspicious: thing.suspicious });
      return true;
    }
    case 'visitorChoice': {
      if (s.part !== 'evening' || !e.awaiting) return true;
      const v = ev.visitors.find((x) => x.id === e.awaiting)!;
      const choice = v.choices.find((x) => x.id === a.choiceId);
      if (!choice) return true;
      d.calm = clamp(d.calm + choice.calm);
      const joined = !!choice.joins && !s.world.circle.includes(choice.joins);
      if (joined) {
        s.world.circle.push(choice.joins!);
        addSticker(s, 'I Trusted My Family');
      }
      e.awaiting = null;
      e.visitorIdx += 1;
      events.push({ type: 'visitor-left', visitorId: v.id, choiceId: choice.id, joined });
      return true;
    }
    case 'finishDay':
      if (s.part !== 'evening' || !e.over) return true;
      if (e.noisy === 0) addSticker(s, 'Quiet Night');
      if (e.spotted >= 2) addSticker(s, 'Scout Spotter');
      s.part = 'end';
      events.push({ type: 'day-finished' });
      return true;
    default:
      return false;
  }
}

/** One second (or less) of evening time. Paused while a visitor waits for an answer. */
export function tickEvening(s: GameState, dt: number, events: GameEvent[], c: Content) {
  const e = s.evening;
  const ev = c.evening;
  const d = s.dragon;
  if (e.over || e.awaiting) return;
  e.t += dt;

  const target = ev.calmBase + (e.lampDim ? ev.calmLampDim : 0) + (e.blanket ? ev.calmBlanket : 0);
  const step = ev.calmDriftPerSec * dt;
  d.calm = d.calm > target ? Math.max(target, d.calm - step) : Math.min(target, d.calm + step);

  // Visitors: footsteps first, then a knock.
  const next = ev.visitors[e.visitorIdx];
  if (!e.visitor && next && e.t >= next.at - next.warn) {
    e.visitor = { id: next.id, knockAt: next.at };
    events.push({ type: 'footsteps', visitorId: next.id, seconds: Math.max(1, Math.round(next.at - e.t)) });
  }
  if (e.visitor && e.t >= e.visitor.knockAt) {
    const id = e.visitor.id;
    e.visitor = null;
    d.calm = clamp(d.calm - (e.blanket ? ev.knockCalm.blanket : ev.knockCalm.normal));
    const quiet = d.calm >= ev.quietCalm;
    events.push({ type: 'knock', visitorId: id, quiet });
    if (quiet) {
      e.quiet += 1;
      e.visitorIdx += 1;
      events.push({ type: 'visitor-left', visitorId: id, choiceId: null, joined: false });
    } else {
      e.noisy += 1;
      e.awaiting = id;
      return;
    }
  }

  // Things at the window.
  const thing = ev.windowThings[e.windowIdx];
  if (!e.window && thing && e.t >= thing.at) {
    e.window = { id: thing.id, until: e.t + thing.stay };
    events.push({ type: 'window-thing', thingId: thing.id });
  }
  if (e.window && e.t >= e.window.until) {
    const w = ev.windowThings.find((x) => x.id === e.window!.id)!;
    e.window = null;
    e.windowIdx += 1;
    if (w.suspicious) {
      e.missed += 1;
      addAttention(s, ev.attention.missed + (e.lampDim ? 0 : ev.attention.missedBright), events);
    }
    events.push({ type: 'window-gone', thingId: w.id, missed: w.suspicious });
  }

  if (e.t >= ev.endAt && e.visitorIdx >= ev.visitors.length && e.windowIdx >= ev.windowThings.length && !e.visitor && !e.window) {
    e.over = true;
    events.push({ type: 'evening-over' });
  }
}
