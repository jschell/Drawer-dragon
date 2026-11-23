/**
 * Afternoon (research) and evening (protect) rules. Called from `step` in reducer.ts,
 * so they share its contract: mutate the cloned state `s`, push events, never throw.
 */
import { archiveFor, dayDef, eveningFor, type Content, type EveningDef, type PageDef, type VisitorDef } from './content';
import { cheapestCart, onAfternoonStart } from './days';
import { addEvidence, afternoonTaskDone, morningActivityDone, specialDone, tickSpecial } from './chapters';
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
export function searchPages(chips: string[], c: Content, day = 1): PageDef[] {
  if (chips.length === 0) return [];
  return archiveFor(c, day).pages.filter((p) => chips.every((k) => p.keywords.includes(k))).sort((a, b) => a.rank - b.rank);
}

export function stepAfternoon(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const r = s.research;
  const archive = archiveFor(c, s.day);
  const page = (id: string) => archive.pages.find((p) => p.id === id);
  switch (a.type) {
    case 'startAfternoon':
      if (s.part !== 'morning' || s.phase !== 'done' || !morningActivityDone(s, c)) return true;
      s.part = 'afternoon';
      events.push({ type: 'afternoon-start' });
      onAfternoonStart(s, events, c);
      return true;
    case 'search': {
      if (s.part !== 'afternoon') return true;
      const chips = [...new Set(a.chips)].filter((k) => archive.chips.includes(k)).slice(0, archive.maxChips);
      r.query = chips;
      if (chips.length === 0) {
        r.results = [];
        r.feedback = 'empty';
      } else {
        r.searches += 1;
        const found = searchPages(chips, c, s.day);
        r.results = found.map((p) => p.id);
        r.feedback = found.length === 0 ? 'none' : found.length > archive.tooMany ? 'too-many' : 'ok';
        if (r.foundAnswerOnSearch === null && r.results.includes(archive.answerPageId)) r.foundAnswerOnSearch = r.searches;
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
      r.firstRatings[a.pageId] ??= a.rating;
      // Chapter 2: judging a page right turns it into a fact for the Evidence Board.
      if (p.evidence && ratingIsCorrect(p, a.rating)) addEvidence(s, p.evidence, events);
      events.push({ type: 'rated', pageId: a.pageId, rating: a.rating, correct: ratingIsCorrect(p, a.rating) });
      return true;
    }
    case 'trapChoice': {
      const p = page(a.pageId);
      if (s.part !== 'afternoon' || !p?.trap || r.trapChoices[a.pageId]) return true;
      r.trapChoices[a.pageId] = a.choice;
      events.push({ type: 'trap', pageId: a.pageId, choice: a.choice });
      if (a.choice === 'share') addAttention(s, eveningFor(c, s.day).attention.share, events);
      return true;
    }
    case 'saveTip': {
      const id = archive.answerPageId;
      // You can only save the tip after checking it's trustworthy: that's the lesson.
      if (s.part !== 'afternoon' || r.tipSaved || r.ratings[id] !== 'trust') return true;
      r.tipSaved = true;
      const unlocks = page(id)?.tip?.unlocks;
      if (unlocks === 'lullaby') s.world.lullabyUnlocked = true;
      else if (unlocks === 'blanket') s.world.blanketUnlocked = true;
      events.push({ type: 'tip-saved' });
      return true;
    }
    default:
      return false;
  }
}

/** Bought everything on the list, at the lowest possible price. */
export function storeSmart(s: GameState, c: Content): boolean {
  const list = c.store.list;
  const got = s.store.bought;
  const enough = list.every((l) => (got[l.food] ?? 0) >= l.servings);
  return enough && s.store.total <= cheapestCart(c);
}

function awardAfternoon(s: GameState, c: Content) {
  const r = s.research;
  if (r.foundAnswerOnSearch !== null && r.foundAnswerOnSearch <= 3) addSticker(s, 'Search Star');
  const rated = Object.entries(r.firstRatings);
  const archive = archiveFor(c, s.day);
  if (rated.length >= 3 && rated.every(([id, rating]) => ratingIsCorrect(archive.pages.find((p) => p.id === id)!, rating))) addSticker(s, 'Source Sleuth');
  const traps = Object.values(r.trapChoices);
  if (traps.length > 0 && !traps.includes('share')) addSticker(s, 'Privacy Pro');
}

/** A family member's details for this evening, or from Day 1 if they aren't scheduled today. */
export function visitorDef(ev: EveningDef, id: string, c: Content): VisitorDef | undefined {
  return ev.visitors.find((x) => x.id === id) ?? c.evening.visitors.find((x) => x.id === id);
}

export function stepEvening(s: GameState, a: Action, events: GameEvent[], c: Content): boolean {
  const e = s.evening;
  const ev = eveningFor(c, s.day);
  const d = s.dragon;
  switch (a.type) {
    case 'startEvening':
      if (s.part !== 'afternoon' || !afternoonTaskDone(s, c)) return true;
      if (dayDef(c, s.day).afternoon.kind === 'research') awardAfternoon(s, c);
      else if (s.store.paid && storeSmart(s, c)) addSticker(s, 'Smart Shopper');
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
      // The cozy bonus comes once a night, so toggling the blanket isn't rewarded.
      if (e.blanket && !e.blanketBonusUsed) {
        d.calm = clamp(d.calm + 8);
        e.blanketBonusUsed = true;
      }
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
      } else {
        e.falseAlarms += 1;
      }
      events.push({ type: 'spotted', thingId: thing.id, suspicious: thing.suspicious });
      return true;
    }
    case 'visitorChoice': {
      if (s.part !== 'evening' || !e.awaiting) return true;
      const v = visitorDef(ev, e.awaiting, c);
      const choice = v?.choices.find((x) => x.id === a.choiceId);
      if (!v) return true;
      if (!choice) return true;
      d.calm = clamp(d.calm + choice.calm);
      const joined = !!choice.joins && !s.world.circle.includes(choice.joins);
      if (joined) {
        s.world.circle.push(choice.joins!);
        addSticker(s, 'I Trusted My Family');
      }
      e.awaiting = null;
      // Kit spotting the dragon during Stepping Stones isn't one of tonight's scheduled visits.
      if (e.kitDiscovers && v.id === 'kit') e.kitDiscovers = false;
      else e.visitorIdx += 1;
      events.push({ type: 'visitor-left', visitorId: v.id, choiceId: choice.id, joined });
      return true;
    }
    case 'finishDay':
      if (s.part !== 'evening' || !e.over || !specialDone(s, c)) return true;
      if (e.scaredKnocks === 0) addSticker(s, 'Calm Night');
      if (e.spotted >= 2 && e.falseAlarms === 0) addSticker(s, 'Scout Spotter');
      s.history = s.history.filter((h) => h.day !== s.day);
      s.history.push({
        day: s.day,
        ready: s.stats.readyAt !== null,
        balancedPlate: s.stats.balancedPlate,
        perfectMix: s.stats.perfectMix,
        afternoon: dayDef(c, s.day).afternoon.kind,
        foundAnswer: dayDef(c, s.day).afternoon.kind === 'research' ? s.research.tipSaved : s.task.done,
        smartShopper: s.store.paid && storeSmart(s, c),
        calmKnocks: e.calmKnocks,
        scaredKnocks: e.scaredKnocks,
        helpers: e.helpers,
        spotted: e.spotted,
        missed: e.missed,
        thoughts: s.stats.thoughtsSolved.length,
      });
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
  const ev = eveningFor(c, s.day);
  const d = s.dragon;
  if (e.over || e.awaiting || e.stones.active || e.special.active) return;
  if (tickSpecial(s, events, c)) return;
  e.t += dt;

  if (ev.steppingStonesAt && !e.stones.done && e.t >= ev.steppingStonesAt) {
    // Three problems at once: a hungry dragon, Kit at the door and BLINK at the window.
    e.stones.active = true;
    d.hunger = Math.max(d.hunger, 60);
    events.push({ type: 'stepping-stones' });
    return;
  }

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
    const v = ev.visitors.find((x) => x.id === id)!;
    e.visitor = null;
    if (s.world.circle.includes(v.member)) {
      // Family who already know come in to help: no startle, a little extra calm.
      d.calm = clamp(d.calm + ev.friendlyCalm);
      e.helpers += 1;
      e.visitorIdx += 1;
      events.push({ type: 'helper-visit', visitorId: id });
    } else {
      d.calm = clamp(d.calm - (e.blanket ? ev.knockCalm.blanket : ev.knockCalm.normal));
      const calm = d.calm >= ev.calmEnough;
      events.push({ type: 'knock', visitorId: id, calm });
      if (calm) {
        e.calmKnocks += 1;
        e.visitorIdx += 1;
        events.push({ type: 'visitor-left', visitorId: id, choiceId: null, joined: false });
      } else {
        e.scaredKnocks += 1;
        e.awaiting = id;
        return;
      }
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

  if (e.t >= ev.endAt && specialDone(s, c) && e.visitorIdx >= ev.visitors.length && e.windowIdx >= ev.windowThings.length && !e.visitor && !e.window) {
    e.over = true;
    events.push({ type: 'evening-over' });
  }
}
