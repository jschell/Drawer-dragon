import type { CheckKey, GrowthStage, Nutrient, Plate, PulseTarget } from './content';

export const SAVE_VERSION = 2;

/** Morning care sub-phase. */
export type Phase = 'egg' | 'naming' | 'care' | 'done';
/** Which part of the day the player is in. */
export type Part = 'morning' | 'afternoon' | 'evening' | 'end';
export type Rating = 'trust' | 'unsure' | 'distrust';
export type TrapChoice = 'share' | 'ask' | 'close';
export type SearchFeedback = 'ok' | 'too-many' | 'none' | 'empty';
export type NoiseKind = 'vacuum' | 'doorbell' | 'dog';
export type SpiceOutcome = 'perfect' | 'too-much' | 'off-ratio' | 'too-little';

export interface DragonState {
  name: string;
  stage: GrowthStage;
  hunger: number; // 0..100, low is good
  spark: number; // 0..100, healthy band 40..70
  calm: number; // 0..100, high is good
  plate: Plate; // food eaten this morning, by nutrient
}

export interface ThoughtState {
  id: string;
  shownAt: number;
  hintLevel: 0 | 1 | 2 | 3;
  wrongGuesses: number;
}

export interface FixItState {
  id: 'scorched-sock';
  progress: number; // 0..100
}

export interface ResearchState {
  searches: number;
  query: string[];
  results: string[];
  feedback: SearchFeedback | null;
  foundAnswerOnSearch: number | null;
  opened: string[];
  checks: Record<string, CheckKey[]>;
  ratings: Record<string, Rating>;
  trapChoices: Record<string, TrapChoice>;
  tipSaved: boolean;
}

export interface EveningState {
  t: number;
  lampDim: boolean;
  blanket: boolean;
  visitorIdx: number;
  visitor: { id: string; knockAt: number } | null;
  awaiting: string | null; // visitor waiting for the player's reply
  windowIdx: number;
  window: { id: string; until: number } | null;
  spotted: number;
  missed: number;
  quiet: number;
  noisy: number;
  over: boolean;
}

export interface GameState {
  version: number;
  part: Part;
  world: { collectorAttention: number; circle: string[]; blanketUnlocked: boolean };
  research: ResearchState;
  evening: EveningState;
  t: number; // seconds of care time elapsed
  seed: number; // RNG state (mulberry32)
  phase: Phase;
  eggTaps: number;
  dragon: DragonState;
  thought: ThoughtState | null;
  quietThoughts: string[]; // solved thoughts that stay hidden until their need is met
  nextThoughtAt: number;
  nextNoiseAt: number;
  noisesLeft: number;
  cooldowns: { hum: number; sock: number };
  sockInNest: boolean;
  fixIt: FixItState | null;
  stats: {
    thoughtsSolved: string[];
    hintsUsed: number;
    balancedPlate: boolean;
    perfectMix: boolean;
    mixes: number;
    fixItsDone: number;
    readyAt: number | null;
  };
  stickers: string[];
}

export type Action =
  | { type: 'tick'; dt: number }
  | { type: 'tapEgg' }
  | { type: 'name'; name: string }
  | { type: 'feed'; foodId: string }
  | { type: 'spice'; scoops: Record<string, number> }
  | { type: 'pet'; amount: number }
  | { type: 'hum' }
  | { type: 'sock' }
  | { type: 'noise'; kind: NoiseKind }
  | { type: 'hint' }
  | { type: 'answerThought'; choiceId: string }
  | { type: 'dismissThought' }
  | { type: 'scrub'; amount: number }
  | { type: 'finishMorning' }
  | { type: 'startAfternoon' }
  | { type: 'search'; chips: string[] }
  | { type: 'openPage'; pageId: string }
  | { type: 'check'; pageId: string; check: CheckKey }
  | { type: 'rate'; pageId: string; rating: Rating }
  | { type: 'trapChoice'; pageId: string; choice: TrapChoice }
  | { type: 'saveTip' }
  | { type: 'startEvening' }
  | { type: 'lamp' }
  | { type: 'blanket' }
  | { type: 'windowTap'; thingId: string }
  | { type: 'visitorChoice'; choiceId: string }
  | { type: 'finishDay' };

export type GameEvent =
  | { type: 'egg-crack'; taps: number }
  | { type: 'hatched' }
  | { type: 'named'; name: string }
  | { type: 'eat'; foodId: string; nutrient: Nutrient }
  | { type: 'refuse-full' }
  | { type: 'refuse-wants-other'; foodId: string; wants: Nutrient[] }
  | { type: 'balanced' }
  | { type: 'spice'; outcome: SpiceOutcome; sneeze: boolean; hiccup: boolean }
  | { type: 'scorched' }
  | { type: 'pet' }
  | { type: 'hum' }
  | { type: 'sock'; first: boolean }
  | { type: 'cooldown'; action: 'hum' | 'sock'; secondsLeft: number }
  | { type: 'startle'; kind: NoiseKind }
  | { type: 'thought'; id: string }
  | { type: 'thought-gone'; id: string }
  | { type: 'thought-solved'; id: string; pulse: PulseTarget }
  | { type: 'thought-wrong'; id: string }
  | { type: 'hint'; id: string; level: number }
  | { type: 'fixed' }
  | { type: 'ready' }
  | { type: 'unready' }
  | { type: 'finished' }
  | { type: 'afternoon-start' }
  | { type: 'search-results'; ids: string[]; feedback: SearchFeedback }
  | { type: 'page-opened'; pageId: string }
  | { type: 'check-revealed'; pageId: string; check: CheckKey }
  | { type: 'rated'; pageId: string; rating: Rating; correct: boolean }
  | { type: 'trap'; pageId: string; choice: TrapChoice }
  | { type: 'tip-saved' }
  | { type: 'attention'; delta: number; level: number }
  | { type: 'evening-start' }
  | { type: 'footsteps'; visitorId: string; seconds: number }
  | { type: 'knock'; visitorId: string; quiet: boolean }
  | { type: 'visitor-left'; visitorId: string; choiceId: string | null; joined: boolean }
  | { type: 'window-thing'; thingId: string }
  | { type: 'window-gone'; thingId: string; missed: boolean }
  | { type: 'spotted'; thingId: string; suspicious: boolean }
  | { type: 'lamp'; dim: boolean }
  | { type: 'blanket'; on: boolean }
  | { type: 'evening-over' }
  | { type: 'day-finished' };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function initialState(seed = 12345): GameState {
  return {
    version: SAVE_VERSION,
    part: 'morning',
    world: { collectorAttention: 0, circle: ['june'], blanketUnlocked: false },
    research: {
      searches: 0,
      query: [],
      results: [],
      feedback: null,
      foundAnswerOnSearch: null,
      opened: [],
      checks: {},
      ratings: {},
      trapChoices: {},
      tipSaved: false,
    },
    evening: {
      t: 0,
      lampDim: false,
      blanket: false,
      visitorIdx: 0,
      visitor: null,
      awaiting: null,
      windowIdx: 0,
      window: null,
      spotted: 0,
      missed: 0,
      quiet: 0,
      noisy: 0,
      over: false,
    },
    t: 0,
    seed: seed >>> 0,
    phase: 'egg',
    eggTaps: 0,
    dragon: {
      name: '',
      stage: 'egg',
      hunger: 70,
      spark: 20,
      calm: 45,
      plate: { protein: 0, greens: 0, minerals: 0 },
    },
    thought: null,
    quietThoughts: [],
    nextThoughtAt: 4,
    nextNoiseAt: 50,
    noisesLeft: 3,
    cooldowns: { hum: 0, sock: 0 },
    sockInNest: false,
    fixIt: null,
    stats: {
      thoughtsSolved: [],
      hintsUsed: 0,
      balancedPlate: false,
      perfectMix: false,
      mixes: 0,
      fixItsDone: 0,
      readyAt: null,
    },
    stickers: [],
  };
}
