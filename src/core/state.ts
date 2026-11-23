import type { AfternoonKind, CheckKey, GrowthStage, Nutrient, Plate, PulseTarget, SpecialKind } from './content';

export const SAVE_VERSION = 5;

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

export type StoneId = 'hungry' | 'kit' | 'blink';

export interface StoreState {
  cart: Record<string, number>; // item id -> packs
  paid: boolean;
  total: number; // cents
  tendered: number;
  changeGiven: number | null; // what the shopkeeper handed back (deliberately wrong once)
  changeChecked: 'right' | 'wrong' | null; // what the player said
  bought: Record<string, number>; // food id -> servings
}

export interface SteppingStonesState {
  active: boolean;
  done: boolean;
  order: StoneId[];
  reason: string | null;
}

/** One finished day, for the end-of-chapter summary. */
export interface DayRecord {
  day: number;
  ready: boolean;
  balancedPlate: boolean;
  perfectMix: boolean;
  afternoon: AfternoonKind;
  foundAnswer: boolean;
  smartShopper: boolean;
  calmKnocks: number;
  scaredKnocks: number;
  helpers: number;
  spotted: number;
  missed: number;
  thoughts?: number; // dragon thoughts understood that morning (for Bond)
}

/**
 * Progress on one of Chapter 2–3's short activities (a morning lesson, an afternoon
 * task or an evening story moment). Wrong picks and answers are remembered only so
 * the screen can explain them; they never cost anything (spec §5.9).
 */
export interface TaskState {
  done: boolean;
  picks: string[]; // chosen items (materials, clues, evidence, favorites)
  wrong: string[]; // items tapped that weren't right, with an explanation shown
  tries: number[]; // flight distances, in feet
  correct: string[]; // questions answered right
  missed: string[]; // questions answered wrong at least once (so stickers need a first-try answer)
  submits: number;
  juneFilled: string[]; // evidence Aunt June found for the player, so no one is stuck
}

export type Ending = 'stay' | 'fly';

export interface FixItState {
  id: 'scorched-sock' | 'chewed-slipper';
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
  firstRatings: Record<string, Rating>; // stickers count first judgments, not repeated guesses
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
  calmKnocks: number; // knocks the dragon stayed calm through
  scaredKnocks: number; // knocks that startled it
  helpers: number; // visits from family who already know and came to help
  falseAlarms: number; // harmless things tapped at the window
  blanketBonusUsed: boolean;
  stones: SteppingStonesState;
  kitDiscovers: boolean; // Day 3: Kit spots the dragon during the Stepping Stones moment
  /** Chapters 2–3: tonight's story moment (Crane at the door, the hill flight, the choice). */
  special: TaskState & { kind: SpecialKind | null; active: boolean };
  over: boolean;
}

export interface GameState {
  version: number;
  part: Part;
  day: number;
  coins: number; // cents in the wallet
  world: {
    collectorAttention: number;
    circle: string[];
    blanketUnlocked: boolean;
    lullabyUnlocked: boolean;
    /** Facts for the Evidence Board, collected in Chapter 2. */
    evidence: string[];
    familyMeeting: boolean; // Day 4: the whole family agreed on the treehouse
    craneGone: boolean;
    favorites: Record<string, string>;
    ending: Ending | null;
  };
  /** Today's morning lesson and afternoon task (Chapters 2–3). */
  activity: TaskState;
  task: TaskState;
  store: StoreState;
  ownUpPending: boolean; // the chewed slipper is fixed; time to give it back to Kit
  history: DayRecord[];
  /** Reading rewards, kept across days: Sharp Reader stars and panels read to the dragon. */
  reading: { answered: string[]; stars: number; readTo: string[] };
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
    thoughtsReadWell: string[]; // solved without a wrong guess (hints are fine)
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
  | { type: 'finishDay' }
  | { type: 'nextDay' }
  | { type: 'addToCart'; itemId: string }
  | { type: 'removeFromCart'; itemId: string }
  | { type: 'pay'; tender: number[] }
  | { type: 'checkChange'; answer: 'right' | 'wrong' }
  | { type: 'ownUp'; choice: 'sorry' | 'sorry-chores' }
  | { type: 'stepOrder'; order: StoneId[]; reason: string }
  | { type: 'readingAnswer'; questionId: string; choiceId: string; firstTry: boolean }
  | { type: 'readToDragon'; panelId: string }
  | { type: 'familyMeeting' }
  | { type: 'pick'; id: string }
  | { type: 'submit' }
  | { type: 'flap'; power: number }
  | { type: 'answer'; qid: string; value: string }
  | { type: 'activityDone' }
  | { type: 'chooseEnding'; choice: Ending };

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
  | { type: 'fixed'; id: 'scorched-sock' | 'chewed-slipper' }
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
  | { type: 'knock'; visitorId: string; calm: boolean }
  | { type: 'helper-visit'; visitorId: string }
  | { type: 'visitor-left'; visitorId: string; choiceId: string | null; joined: boolean }
  | { type: 'window-thing'; thingId: string }
  | { type: 'window-gone'; thingId: string; missed: boolean }
  | { type: 'spotted'; thingId: string; suspicious: boolean }
  | { type: 'startle-scorch' }
  | { type: 'lamp'; dim: boolean }
  | { type: 'blanket'; on: boolean }
  | { type: 'evening-over' }
  | { type: 'day-finished' }
  | { type: 'day-start'; day: number }
  | { type: 'allowance'; cents: number }
  | { type: 'cart'; itemId: string; packs: number }
  | { type: 'paid'; total: number; changeDue: number; changeGiven: number }
  | { type: 'change-checked'; correct: boolean; changeDue: number }
  | { type: 'own-up-needed' }
  | { type: 'owned-up'; choice: 'sorry' | 'sorry-chores' }
  | { type: 'stepping-stones' }
  | { type: 'stones-done'; order: StoneId[]; reason: string; best: boolean }
  | { type: 'reading-answer'; questionId: string; correct: boolean; star: boolean }
  | { type: 'read-to-dragon'; panelId: string; calm: number }
  | { type: 'family-meeting'; joined: string[] }
  | { type: 'picked'; id: string; on: boolean; ok: boolean }
  | { type: 'submitted'; ok: boolean; wrong: string[] }
  | { type: 'flapped'; power: number; distance: number; inZone: boolean; tryNo: number }
  | { type: 'answered'; qid: string; correct: boolean }
  | { type: 'activity-done'; slot: 'morning' | 'afternoon' | 'evening' }
  | { type: 'evidence'; id: string }
  | { type: 'june-filled'; ids: string[] }
  | { type: 'special'; kind: SpecialKind }
  | { type: 'crane-left' }
  | { type: 'ending-chosen'; choice: Ending }

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export function emptyStore(): StoreState {
  return { cart: {}, paid: false, total: 0, tendered: 0, changeGiven: null, changeChecked: null, bought: {} };
}

export function emptyTask(): TaskState {
  return { done: false, picks: [], wrong: [], tries: [], correct: [], missed: [], submits: 0, juneFilled: [] };
}

export function initialState(seed = 12345): GameState {
  return {
    version: SAVE_VERSION,
    part: 'morning',
    day: 1,
    coins: 0,
    world: {
      collectorAttention: 0,
      circle: ['june'],
      blanketUnlocked: false,
      lullabyUnlocked: false,
      evidence: [],
      familyMeeting: false,
      craneGone: false,
      favorites: {},
      ending: null,
    },
    activity: emptyTask(),
    task: emptyTask(),
    store: emptyStore(),
    ownUpPending: false,
    history: [],
    reading: { answered: [], stars: 0, readTo: [] },
    research: {
      searches: 0,
      query: [],
      results: [],
      feedback: null,
      foundAnswerOnSearch: null,
      opened: [],
      checks: {},
      ratings: {},
      firstRatings: {},
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
      calmKnocks: 0,
      scaredKnocks: 0,
      helpers: 0,
      falseAlarms: 0,
      blanketBonusUsed: false,
      stones: { active: false, done: false, order: [], reason: null },
      kitDiscovers: false,
      special: { ...emptyTask(), kind: null, active: false },
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
      thoughtsReadWell: [],
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
