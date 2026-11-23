import { content as defaultContent, NUTRIENTS, type Content, type Nutrient, type ThoughtCondition } from './content';
import { dayDef, eveningFor } from './content';
import { stepAfternoon, stepEvening, tickEvening } from './day';
import { stepDays } from './days';
import { stepChapters } from './chapters';
import type { Action, GameEvent, GameState, NoiseKind, SpiceOutcome, StepResult } from './state';

/** Tuning constants for the morning care prototype. */
export const TUNING = {
  hungerPerSec: 0.1,
  sparkDecayPerSec: 0.08,
  sparkHotDecayPerSec: 0.5,
  calmDriftPerSec: 0.04,
  calmRestTarget: 55,
  calmCozyTarget: 78,
  ready: { maxHunger: 30, sparkMin: 40, sparkMax: 70, minCalm: 70 },
  scorchAbove: 75,
  humCalm: 15,
  humCooldown: 8,
  sockFirstCalm: 20,
  sockAgainCalm: 8,
  sockCooldown: 20,
  noiseCalm: { vacuum: 22, doorbell: 16, dog: 14 } as Record<NoiseKind, number>,
  noiseGap: [40, 70] as [number, number],
  thoughtGap: 6,
  thoughtConditions: {
    'spark-low': (s: GameState) => s.dragon.spark < 35,
    hungry: (s: GameState) => s.dragon.hunger > 55,
    'calm-low': (s: GameState) => s.dragon.calm < 40,
    'minerals-missing': (s: GameState) => s.dragon.plate.protein >= 1 && s.dragon.plate.minerals === 0,
  } as Record<ThoughtCondition, (s: GameState) => boolean>,
};

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Deterministic RNG (mulberry32) stored in state so runs are reproducible. */
function rand(s: GameState): number {
  let t = (s.seed = (s.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function isReady(s: GameState): boolean {
  const r = TUNING.ready;
  const d = s.dragon;
  return s.part === 'morning' && s.phase === 'care' && d.hunger <= r.maxHunger && d.spark >= r.sparkMin && d.spark <= r.sparkMax && d.calm >= r.minCalm;
}

/** Calming actions (hum, petting) work in the morning and in the evening. */
function canCalm(s: GameState): boolean {
  return (s.part === 'morning' && s.phase === 'care') || (s.part === 'evening' && !s.evening.over && !s.evening.awaiting);
}

export function plateMissing(s: GameState, c: Content = defaultContent): Nutrient[] {
  const target = c.plateTargets[s.dragon.stage];
  if (!target) return [];
  return NUTRIENTS.filter((n) => s.dragon.plate[n] < target[n]);
}

/** The single entry point for game logic: pure apart from returning a fresh state object. */
export function step(prev: GameState, action: Action, c: Content = defaultContent): StepResult {
  const s: GameState = structuredClone(prev);
  const events: GameEvent[] = [];
  const d = s.dragon;

  switch (action.type) {
    case 'tapEgg': {
      if (s.phase !== 'egg') break;
      s.eggTaps += 1;
      events.push({ type: 'egg-crack', taps: s.eggTaps });
      if (s.eggTaps >= 3) {
        s.phase = 'naming';
        d.stage = 'hatchling';
        events.push({ type: 'hatched' });
      }
      break;
    }
    case 'name': {
      if (s.phase !== 'naming') break;
      // Only names from the list are accepted: nothing typed can become the dragon's name.
      d.name = c.names.names.includes(action.name) ? action.name : c.names.default;
      s.phase = 'care';
      events.push({ type: 'named', name: d.name });
      break;
    }
    case 'tick': {
      if (action.dt <= 0) break;
      if (s.part === 'evening') {
        const dt = Math.min(action.dt, 1);
        s.t += dt; // keeps hum cooldowns running
        tickEvening(s, dt, events, c);
        break;
      }
      if (s.part !== 'morning' || s.phase !== 'care') break;
      const dt = Math.min(action.dt, 1);
      s.t += dt;
      d.hunger = clamp(d.hunger + TUNING.hungerPerSec * dt);
      d.spark = clamp(d.spark - (d.spark > TUNING.ready.sparkMax ? TUNING.sparkHotDecayPerSec : TUNING.sparkDecayPerSec) * dt);
      const target = s.sockInNest ? TUNING.calmCozyTarget : TUNING.calmRestTarget;
      if (d.calm > target) d.calm = Math.max(target, d.calm - TUNING.calmDriftPerSec * dt);
      else if (d.calm < target) d.calm = Math.min(target, d.calm + TUNING.calmDriftPerSec * dt);

      if (s.noisesLeft > 0 && s.t >= s.nextNoiseAt && s.fixIt?.id !== 'scorched-sock') {
        const kinds: NoiseKind[] = ['vacuum', 'doorbell', 'dog'];
        noise(s, kinds[Math.floor(rand(s) * kinds.length)], events);
        // Day 1's first loud noise startles the hatchling into a smoky hiccup, so the
        // scorched-sock Fix-It (responsibility) happens without the player causing mischief.
        if (s.day === 1 && s.noisesLeft === 3 && !s.fixIt) {
          s.fixIt = { id: 'scorched-sock', progress: 0 };
          events.push({ type: 'startle-scorch' }, { type: 'scorched' });
        }
        s.noisesLeft -= 1;
        s.nextNoiseAt = s.t + TUNING.noiseGap[0] + rand(s) * (TUNING.noiseGap[1] - TUNING.noiseGap[0]);
      }
      updateThoughts(s, events, c);
      break;
    }
    case 'feed': {
      if (s.phase !== 'care') break;
      const food = c.foods.find((f) => f.id === action.foodId);
      if (!food) break;
      if (d.hunger <= 5) {
        events.push({ type: 'refuse-full' });
        break;
      }
      const missing = plateMissing(s, c);
      if (missing.length > 0 && !missing.includes(food.nutrient)) {
        events.push({ type: 'refuse-wants-other', foodId: food.id, wants: missing });
        break;
      }
      d.hunger = clamp(d.hunger - food.hunger);
      d.plate[food.nutrient] += 1;
      events.push({ type: 'eat', foodId: food.id, nutrient: food.nutrient });
      if (!s.stats.balancedPlate && plateMissing(s, c).length === 0) {
        s.stats.balancedPlate = true;
        d.calm = clamp(d.calm + 10);
        events.push({ type: 'balanced' });
      }
      break;
    }
    case 'spice': {
      if (s.phase !== 'care') break;
      mixSpice(s, action.scoops, events, c);
      break;
    }
    case 'pet': {
      if (!canCalm(s) || action.amount <= 0) break;
      d.calm = clamp(d.calm + Math.min(action.amount, 5));
      events.push({ type: 'pet' });
      break;
    }
    case 'hum': {
      if (!canCalm(s)) break;
      if (s.t < s.cooldowns.hum) {
        events.push({ type: 'cooldown', action: 'hum', secondsLeft: Math.ceil(s.cooldowns.hum - s.t) });
        break;
      }
      // The lullaby from Day 3's research works better at night.
      const lullaby = s.part === 'evening' && s.world.lullabyUnlocked;
      d.calm = clamp(d.calm + (lullaby ? eveningFor(c, s.day).lullabyHumCalm : TUNING.humCalm));
      s.cooldowns.hum = s.t + TUNING.humCooldown;
      events.push({ type: 'hum' });
      break;
    }
    case 'sock': {
      if (s.phase !== 'care') break;
      if (s.t < s.cooldowns.sock) {
        events.push({ type: 'cooldown', action: 'sock', secondsLeft: Math.ceil(s.cooldowns.sock - s.t) });
        break;
      }
      const first = !s.sockInNest;
      d.calm = clamp(d.calm + (first ? TUNING.sockFirstCalm : TUNING.sockAgainCalm));
      s.sockInNest = true;
      s.cooldowns.sock = s.t + TUNING.sockCooldown;
      events.push({ type: 'sock', first });
      break;
    }
    case 'noise': {
      if (s.phase !== 'care') break;
      noise(s, action.kind, events);
      break;
    }
    case 'hint': {
      const th = s.thought;
      if (!th || th.hintLevel >= 3) break;
      th.hintLevel = (th.hintLevel + 1) as 1 | 2 | 3;
      s.stats.hintsUsed += 1;
      events.push({ type: 'hint', id: th.id, level: th.hintLevel });
      break;
    }
    case 'answerThought': {
      const th = s.thought;
      if (!th) break;
      const def = c.thoughts.find((x) => x.id === th.id);
      const choice = def?.answerChoices.find((x) => x.id === action.choiceId);
      if (!def || !choice) break;
      if (choice.correct) {
        if (!s.stats.thoughtsSolved.includes(def.id)) s.stats.thoughtsSolved.push(def.id);
        if (th.wrongGuesses === 0 && !s.stats.thoughtsReadWell.includes(def.id)) s.stats.thoughtsReadWell.push(def.id);
        s.quietThoughts.push(def.id);
        s.thought = null;
        s.nextThoughtAt = s.t + TUNING.thoughtGap;
        events.push({ type: 'thought-solved', id: def.id, pulse: def.pulse });
      } else {
        th.wrongGuesses += 1;
        if (th.hintLevel < 1) th.hintLevel = 1;
        events.push({ type: 'thought-wrong', id: def.id });
      }
      break;
    }
    case 'dismissThought': {
      if (!s.thought) break;
      s.quietThoughts.push(s.thought.id);
      events.push({ type: 'thought-gone', id: s.thought.id });
      s.thought = null;
      s.nextThoughtAt = s.t + TUNING.thoughtGap * 2;
      break;
    }
    case 'scrub': {
      if (!s.fixIt || action.amount <= 0) break;
      s.fixIt.progress = Math.min(100, s.fixIt.progress + action.amount);
      if (s.fixIt.progress >= 100) {
        const id = s.fixIt.id;
        s.fixIt = null;
        s.stats.fixItsDone += 1;
        events.push({ type: 'fixed', id });
        if (id === 'chewed-slipper') {
          // It's Kit's slipper: the honest thing is to give it back and say sorry.
          s.ownUpPending = true;
          events.push({ type: 'own-up-needed' });
        }
      }
      break;
    }
    case 'finishMorning': {
      if (s.phase !== 'care') break;
      s.phase = 'done';
      awardStickers(s);
      events.push({ type: 'finished' });
      break;
    }
    default:
      if (!stepAfternoon(s, action, events, c) && !stepEvening(s, action, events, c) && !stepChapters(s, action, events, c)) stepDays(s, action, events, c);
  }

  const wasReady = isReady(prev);
  const nowReady = isReady(s);
  if (nowReady && !wasReady) {
    if (s.stats.readyAt === null) s.stats.readyAt = s.t;
    events.push({ type: 'ready' });
  } else if (!nowReady && wasReady && s.phase === 'care') {
    events.push({ type: 'unready' });
  }
  return { state: s, events };
}

function noise(s: GameState, kind: NoiseKind, events: GameEvent[]) {
  s.dragon.calm = clamp(s.dragon.calm - TUNING.noiseCalm[kind]);
  events.push({ type: 'startle', kind });
}

/**
 * Classifies a spice mix without changing anything, so the spice tin can check a mix
 * before it is fed. Only a perfect mix is fed from the tin (no rewards for mischief).
 */
export function classifyMix(scoops: Record<string, number>, scale: number, c: Content): SpiceOutcome | 'empty' | 'wrong-spice' {
  const recipe = c.spiceRecipes[0];
  const used = Object.entries(scoops).filter(([, n]) => n > 0);
  const total = used.reduce((a, [, n]) => a + n, 0);
  if (total === 0) return 'empty';
  const partIds = Object.keys(recipe.parts);
  if (!used.every(([id]) => partIds.includes(id))) return 'wrong-spice';
  const ks = partIds.map((id) => (scoops[id] ?? 0) / recipe.parts[id]);
  const k = ks[0];
  const same = (x: number, y: number) => Math.abs(x - y) < 1e-9;
  const ratioOk = k > 0 && ks.every((x) => same(x, k));
  if (ratioOk && same(k, scale)) return 'perfect';
  if (ratioOk && k > scale) return 'too-much';
  if (total < recipe.baseScoops * scale) return 'too-little';
  return 'off-ratio';
}

function mixSpice(s: GameState, scoops: Record<string, number>, events: GameEvent[], c: Content) {
  const recipe = c.spiceRecipes[0];
  const d = s.dragon;
  const used = Object.entries(scoops).filter(([, n]) => n > 0);
  const total = used.reduce((a, [, n]) => a + n, 0);
  if (total === 0) return;

  let gain = 0;
  for (const [id, n] of used) gain += (c.spices.find((x) => x.id === id)?.sparkPerScoop ?? 0) * n;

  // Today's batch size: 1× for a hatchling, 1½× after Day 3's growth spurt.
  const scale = dayDef(c, s.day).morning.recipeScale;
  const partIds = Object.keys(recipe.parts);
  const onlyRecipe = used.every(([id]) => partIds.includes(id));
  // The mix matches the ratio when every part is scaled by the same amount k (halves allowed).
  const ks = partIds.map((id) => (scoops[id] ?? 0) / recipe.parts[id]);
  const k = ks[0];
  const same = (x: number, y: number) => Math.abs(x - y) < 1e-9;
  const ratioOk = onlyRecipe && k > 0 && ks.every((x) => same(x, k));

  let outcome: SpiceOutcome;
  if (ratioOk && same(k, scale)) {
    outcome = 'perfect';
    d.spark = clamp(d.spark + recipe.perfectSpark);
    d.calm = clamp(d.calm + 5);
    s.stats.perfectMix = true;
  } else if (ratioOk && k > scale) {
    outcome = 'too-much';
    d.spark = clamp(d.spark + gain);
  } else if (total < recipe.baseScoops * scale) {
    outcome = 'too-little';
    d.spark = clamp(d.spark + gain * 0.6);
  } else {
    outcome = 'off-ratio';
    d.spark = clamp(d.spark + gain * 0.6);
    d.calm = clamp(d.calm - 4);
  }

  const sneeze = (scoops['pepper'] ?? 0) > 0;
  if (sneeze) d.calm = clamp(d.calm - 3);
  const scorch = d.spark > TUNING.scorchAbove;
  const hiccup = (scoops['chili'] ?? 0) > 0 || scorch;
  s.stats.mixes += 1;
  events.push({ type: 'spice', outcome, sneeze, hiccup });

  if (scorch && !s.fixIt) {
    s.fixIt = { id: 'scorched-sock', progress: 0 };
    d.calm = clamp(d.calm - 8);
    events.push({ type: 'scorched' });
  }
}

function updateThoughts(s: GameState, events: GameEvent[], c: Content) {
  const conds = TUNING.thoughtConditions;
  // Quiet thoughts wake up again only after their need has been met once.
  s.quietThoughts = s.quietThoughts.filter((id) => {
    const def = c.thoughts.find((x) => x.id === id);
    return def ? conds[def.condition](s) : false;
  });

  if (s.thought) {
    const def = c.thoughts.find((x) => x.id === s.thought!.id);
    if (def && !conds[def.condition](s)) {
      events.push({ type: 'thought-gone', id: def.id });
      s.thought = null;
      s.nextThoughtAt = s.t + TUNING.thoughtGap;
    }
    return;
  }
  if (s.t < s.nextThoughtAt || s.fixIt?.id === 'scorched-sock') return;
  const candidates = c.thoughts.filter((x) => conds[x.condition](s) && !s.quietThoughts.includes(x.id));
  if (candidates.length === 0) return;
  // Prefer thoughts the player hasn't solved yet, then keep content order.
  const fresh = candidates.filter((x) => !s.stats.thoughtsSolved.includes(x.id));
  const pick = (fresh.length ? fresh : candidates)[0];
  s.thought = { id: pick.id, shownAt: s.t, hintLevel: 0, wrongGuesses: 0 };
  events.push({ type: 'thought', id: pick.id });
}

function awardStickers(s: GameState) {
  const add = (id: string) => {
    if (!s.stickers.includes(id)) s.stickers.push(id);
  };
  if (s.stats.balancedPlate) add('Balanced Plate');
  if (s.stats.perfectMix) add('Master Mixer');
  if (s.stats.thoughtsReadWell.length >= 2) add('Thought Reader');
  if (s.stats.fixItsDone > 0) add('Good as New');
  if (s.stats.readyAt !== null) add('Cozy Keeper');
}
