import { describe, expect, it } from 'vitest';
import { content } from '../src/core/content';
import { attentionWord, ratingIsCorrect, searchPages } from '../src/core/day';
import { step } from '../src/core/reducer';
import type { Action, GameState } from '../src/core/state';
import { caring, run, ticks } from './helpers';

const ANSWER = content.archive.answerPageId;

function afternoon(seed = 1): GameState {
  return run(caring(seed), [{ type: 'finishMorning' }, { type: 'startAfternoon' }]).state;
}

function evening(opts: { blanket?: boolean } = {}): GameState {
  const actions: Action[] = opts.blanket
    ? [{ type: 'search', chips: ['hatchling', 'calm'] }, { type: 'openPage', pageId: ANSWER }, { type: 'rate', pageId: ANSWER, rating: 'trust' }, { type: 'saveTip' }]
    : [];
  return run(afternoon(), [...actions, { type: 'startEvening' }]).state;
}

describe('afternoon flow', () => {
  it('only starts once the morning is finished', () => {
    expect(step(caring(), { type: 'startAfternoon' }).state.part).toBe('morning');
    expect(afternoon().part).toBe('afternoon');
  });
});

describe('search', () => {
  it('one broad word gives too many results', () => {
    const { state } = run(afternoon(), [{ type: 'search', chips: ['dragon'] }]);
    expect(state.research.feedback).toBe('too-many');
  });

  it('two good keywords find the answer, and the copycat site ranks first', () => {
    const { state } = run(afternoon(), [{ type: 'search', chips: ['hatchling', 'calm'] }]);
    expect(state.research.feedback).toBe('ok');
    expect(state.research.results).toEqual(['trap-lookalike', ANSWER]);
    expect(state.research.foundAnswerOnSearch).toBe(1);
  });

  it('words that never appear together give no results', () => {
    const { state } = run(afternoon(), [{ type: 'search', chips: ['fire', 'scared', 'free'] }]);
    expect(state.research.feedback).toBe('none');
  });

  it('ignores unknown chips and caps the number of words', () => {
    const { state } = run(afternoon(), [{ type: 'search', chips: ['hatchling', 'calm', 'scared', 'noise', 'bogus'] }]);
    expect(state.research.query).toEqual(['hatchling', 'calm', 'scared']);
  });

  it('every page can be found by some search', () => {
    for (const p of content.archive.pages) expect(searchPages(p.keywords.slice(0, 2), content).map((x) => x.id)).toContain(p.id);
  });
});

describe('trust ratings', () => {
  const page = (id: string) => content.archive.pages.find((p) => p.id === id)!;
  it('trust the reliable page, doubt the fan page, reject the traps', () => {
    expect(ratingIsCorrect(page(ANSWER), 'trust')).toBe(true);
    expect(ratingIsCorrect(page('fanpage'), 'unsure')).toBe(true);
    expect(ratingIsCorrect(page('fanpage'), 'trust')).toBe(false);
    expect(ratingIsCorrect(page('trap-lookalike'), 'distrust')).toBe(true);
    expect(ratingIsCorrect(page('trap-lookalike'), 'unsure')).toBe(false);
  });

  it('the tip can only be saved after trusting the page', () => {
    let s = run(afternoon(), [{ type: 'openPage', pageId: ANSWER }, { type: 'saveTip' }]).state;
    expect(s.research.tipSaved).toBe(false);
    s = run(s, [{ type: 'rate', pageId: ANSWER, rating: 'trust' }, { type: 'saveTip' }]).state;
    expect(s.research.tipSaved).toBe(true);
    expect(s.world.blanketUnlocked).toBe(true);
  });
});

describe('trap sites', () => {
  it('sharing your street raises Collector Attention; closing does not', () => {
    const shared = run(afternoon(), [{ type: 'trapChoice', pageId: 'trap-lookalike', choice: 'share' }]).state;
    expect(shared.world.collectorAttention).toBe(content.evening.attention.share);
    const closed = run(afternoon(), [{ type: 'trapChoice', pageId: 'trap-lookalike', choice: 'close' }]).state;
    expect(closed.world.collectorAttention).toBe(0);
  });

  it('only the first choice on a trap counts', () => {
    const s = run(afternoon(), [
      { type: 'trapChoice', pageId: 'trap-prize', choice: 'close' },
      { type: 'trapChoice', pageId: 'trap-prize', choice: 'share' },
    ]).state;
    expect(s.world.collectorAttention).toBe(0);
  });

  it('awards afternoon stickers when heading home', () => {
    const s = run(afternoon(), [
      { type: 'search', chips: ['hatchling', 'calm'] },
      { type: 'rate', pageId: ANSWER, rating: 'trust' },
      { type: 'rate', pageId: 'trap-lookalike', rating: 'distrust' },
      { type: 'rate', pageId: 'fanpage', rating: 'unsure' },
      { type: 'trapChoice', pageId: 'trap-lookalike', choice: 'close' },
      { type: 'startEvening' },
    ]).state;
    expect(s.stickers).toEqual(expect.arrayContaining(['Search Star', 'Source Sleuth', 'Privacy Pro']));
  });
});

describe('evening', () => {
  it('starts with a nervous dragon', () => {
    const s = evening();
    expect(s.part).toBe('evening');
    expect(s.dragon.calm).toBe(content.evening.startCalm);
  });

  it('the blanket only works once the tip is saved', () => {
    expect(step(evening(), { type: 'blanket' }).state.evening.blanket).toBe(false);
    expect(step(evening({ blanket: true }), { type: 'blanket' }).state.evening.blanket).toBe(true);
  });

  it('footsteps come before every knock', () => {
    const { events } = run(evening(), ticks(30));
    const steps = events.findIndex((e) => e.type === 'footsteps');
    const knock = events.findIndex((e) => e.type === 'knock');
    expect(steps).toBeGreaterThanOrEqual(0);
    expect(knock).toBeGreaterThan(steps);
  });

  it('an unprepared dragon squeaks; the clock waits for an honest reply', () => {
    const { state } = run(evening(), ticks(30));
    expect(state.evening.awaiting).toBe('kit');
    const frozen = run(state, ticks(10)).state;
    expect(frozen.evening.t).toBe(state.evening.t);
    const told = step(frozen, { type: 'visitorChoice', choiceId: 'tell' }).state;
    expect(told.world.circle).toContain('kit');
    expect(told.evening.awaiting).toBeNull();
  });

  it('a prepared dragon stays quiet through a knock', () => {
    const { state, events } = run(evening({ blanket: true }), [{ type: 'lamp' }, { type: 'blanket' }, ...ticks(30)]);
    expect(events).toContainEqual({ type: 'knock', visitorId: 'kit', quiet: true });
    expect(state.evening.quiet).toBe(1);
  });

  it('spotting BLINK lowers attention; missing it raises attention, more with the lamp on', () => {
    let s = run(evening(), [{ type: 'trapChoice', pageId: 'x', choice: 'share' }]).state;
    s = { ...s, world: { ...s.world, collectorAttention: 30 } };
    // jump to when BLINK is at the window
    const base = { ...s, evening: { ...s.evening, visitorIdx: 99, windowIdx: 1, t: 40 } };
    const appeared = step(base, { type: 'tick', dt: 1 }).state;
    expect(appeared.evening.window?.id).toBe('blink');
    expect(step(appeared, { type: 'windowTap', thingId: 'blink' }).state.world.collectorAttention).toBe(22);
    const missed = run(appeared, ticks(10)).state;
    expect(missed.world.collectorAttention).toBe(45);
  });

  it('tapping something harmless costs nothing', () => {
    const s = evening();
    const base = { ...s, evening: { ...s.evening, visitorIdx: 99, t: 26 } };
    const moth = step(base, { type: 'tick', dt: 1 }).state;
    const r = step(moth, { type: 'windowTap', thingId: 'moth' });
    expect(r.state.world.collectorAttention).toBe(0);
    expect(r.events).toContainEqual({ type: 'spotted', thingId: 'moth', suspicious: false });
  });

  it('describes attention in words', () => {
    expect(attentionWord(0)).toBe('Unnoticed');
    expect(attentionWord(25)).toBe('Curious');
    expect(attentionWord(70)).toBe('Watching!');
  });
});

describe('evening autoplay', () => {
  type Policy = (s: GameState) => Action | null;

  /** Answers any waiting visitor, taps any window thing, otherwise idles. */
  function play(s: GameState, policy: Policy, maxSeconds = 400) {
    for (let i = 0; i < maxSeconds && !s.evening.over; i++) {
      const a = policy(s);
      if (a) s = step(s, a).state;
      if (s.evening.awaiting) {
        const v = content.evening.visitors.find((x) => x.id === s.evening.awaiting)!;
        s = step(s, { type: 'visitorChoice', choiceId: v.choices[v.choices.length - 1].id }).state;
      }
      s = step(s, { type: 'tick', dt: 1 }).state;
      if (s.world.collectorAttention < 0 || s.world.collectorAttention > 100) throw new Error('attention out of range');
    }
    return s;
  }

  const careful: Policy = (s) => {
    const e = s.evening;
    if (e.window) {
      const t = content.evening.windowThings.find((w) => w.id === e.window!.id)!;
      return t.suspicious ? { type: 'windowTap', thingId: t.id } : null;
    }
    if (!e.lampDim) return { type: 'lamp' };
    if (s.world.blanketUnlocked && !e.blanket) return { type: 'blanket' };
    if (s.dragon.calm < 80) return { type: 'hum' };
    return null;
  };

  it('a careful keeper with the blanket gets a quiet night and spots every scout', () => {
    const s = play(evening({ blanket: true }), careful);
    expect(s.evening.over).toBe(true);
    expect(s.evening.noisy).toBe(0);
    expect(s.evening.missed).toBe(0);
    const done = step(s, { type: 'finishDay' }).state;
    expect(done.part).toBe('end');
    expect(done.stickers).toEqual(expect.arrayContaining(['Quiet Night', 'Scout Spotter']));
  });

  it('a keeper who does nothing still reaches the end of the night', () => {
    const s = play(evening(), () => null);
    expect(s.evening.over).toBe(true);
    expect(s.evening.noisy).toBe(content.evening.visitors.length);
    expect(step(s, { type: 'finishDay' }).state.part).toBe('end');
  });

  it('humming alone, without the blanket, is enough for a quiet night', () => {
    const s = play(evening(), careful);
    expect(s.evening.noisy).toBe(0);
  });
});

describe('evening tuning', () => {
  const sim = (s: GameState, prep: Action[], hum: boolean) => {
    s = run(s, prep).state;
    for (let i = 0; i < 400 && !s.evening.over; i++) {
      if (hum && s.t >= s.cooldowns.hum) s = step(s, { type: 'hum' }).state;
      if (s.evening.awaiting) s = step(s, { type: 'visitorChoice', choiceId: 'quiet' }).state;
      s = step(s, { type: 'tick', dt: 1 }).state;
    }
    return s.evening;
  };
  it('doing nothing, or only dimming the lamp, is not enough', () => {
    expect(sim(evening(), [], false).quiet).toBe(0);
    expect(sim(evening(), [{ type: 'lamp' }], false).quiet).toBe(0);
  });
  it('the researched blanket plus a dim lamp keeps every visit quiet', () => {
    expect(sim(evening({ blanket: true }), [{ type: 'lamp' }, { type: 'blanket' }], false).noisy).toBe(0);
  });
  it('without the blanket, steady humming also works', () => {
    expect(sim(evening(), [{ type: 'lamp' }], true).noisy).toBe(0);
  });
});
