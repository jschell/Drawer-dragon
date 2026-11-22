import type { GrowthStage, Nutrient, Plate, PulseTarget } from './content';

export const SAVE_VERSION = 1;

export type Phase = 'egg' | 'naming' | 'care' | 'done';
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

export interface GameState {
  version: number;
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
  | { type: 'finishMorning' };

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
  | { type: 'finished' };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function initialState(seed = 12345): GameState {
  return {
    version: SAVE_VERSION,
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
