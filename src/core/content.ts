import { z } from 'zod';
import itemsJson from '../../content/items.json';
import recipesJson from '../../content/recipes.json';
import thoughtsJson from '../../content/thoughts.json';
import archiveJson from '../../content/archive.json';
import eveningJson from '../../content/evening.json';
import storyJson from '../../content/story.json';
import storeJson from '../../content/store.json';
import daysJson from '../../content/days.json';
import readingJson from '../../content/reading.json';
import activitiesJson from '../../content/activities.json';
import namesJson from '../../content/names.json';

export const NUTRIENTS = ['protein', 'greens', 'minerals'] as const;
export type Nutrient = (typeof NUTRIENTS)[number];

export const STAGES = ['egg', 'hatchling', 'fledgling', 'youngling'] as const;
export type GrowthStage = (typeof STAGES)[number];

export const CONDITIONS = ['spark-low', 'hungry', 'calm-low', 'minerals-missing'] as const;
export type ThoughtCondition = (typeof CONDITIONS)[number];

export const PULSE_TARGETS = ['food', 'spice', 'hum', 'sock'] as const;
export type PulseTarget = (typeof PULSE_TARGETS)[number];

const MAX_RIDDLE_WORDS = 12;
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const FoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  nutrient: z.enum(NUTRIENTS),
  hunger: z.number().positive(),
  art: z.string(),
});

const SpiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  sparkPerScoop: z.number().positive(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  effect: z.enum(['warm', 'sneeze', 'hiccup']),
});

const ItemsSchema = z.object({ foods: z.array(FoodSchema).min(1), spices: z.array(SpiceSchema).min(1) });

const PlateSchema = z.object({ protein: z.number().int(), greens: z.number().int(), minerals: z.number().int() });

const RecipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  card: z.string(),
  parts: z.record(z.string(), z.number().int().positive()),
  baseScoops: z.number().int().positive(),
  scaleByStage: z.record(z.enum(STAGES), z.number().nonnegative()),
  perfectSpark: z.number().positive(),
});

const RecipesSchema = z.object({
  plateTargets: z.record(z.string(), PlateSchema),
  spiceRecipes: z.array(RecipeSchema).min(1),
});

const ThoughtSchema = z
  .object({
    id: z.string(),
    condition: z.enum(CONDITIONS),
    icons: z.array(z.string()).min(1).max(3),
    riddle: z.string().refine((s) => wordCount(s) <= MAX_RIDDLE_WORDS, {
      message: `Riddles must be ${MAX_RIDDLE_WORDS} words or fewer`,
    }),
    meaning: z.string(),
    hints: z.tuple([z.string(), z.string(), z.string()]),
    answerChoices: z
      .array(z.object({ id: z.string(), label: z.string(), correct: z.boolean() }))
      .min(2)
      .max(4)
      .refine((c) => c.filter((x) => x.correct).length === 1, { message: 'Exactly one correct answer' }),
    pulse: z.enum(PULSE_TARGETS),
  })
  .strict();

const ThoughtsSchema = z.object({ thoughts: z.array(ThoughtSchema).min(1) });

export const CHECK_KEYS = ['who', 'when', 'why', 'proof'] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];
export const CREDIBILITY = ['trusted', 'mixed', 'trap'] as const;

const PageSchema = z
  .object({
    id: z.string(),
    rank: z.number().int(),
    site: z.string().regex(/\.keep$/, { message: 'In-game sites must use the fictional .keep ending' }),
    title: z.string(),
    credibility: z.enum(CREDIBILITY),
    keywords: z.array(z.string()).min(1),
    snippet: z.string(),
    body: z.array(z.string()).min(1),
    checks: z.object({ who: z.string(), when: z.string(), why: z.string(), proof: z.string() }),
    trap: z.object({ prompt: z.string() }).optional(),
    tip: z.object({ text: z.string(), unlocks: z.enum(['blanket', 'lullaby', 'none']) }).optional(),
    /** Judging this page correctly adds a piece of evidence to the Evidence Board (Chapter 2). */
    evidence: z.string().optional(),
  })
  .strict()
  .refine((p) => (p.credibility === 'trap') === (p.trap !== undefined), { message: 'Trap pages (and only trap pages) need a trap prompt' });

const ArchiveSchema = z.object({
  question: z.string(),
  answerPageId: z.string(),
  chips: z.array(z.string()).min(3),
  maxChips: z.number().int().positive(),
  tooMany: z.number().int().positive(),
  pages: z.array(PageSchema).min(1),
});

const ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  result: z.string(),
  calm: z.number(),
  joins: z.enum(['kit', 'parents']).optional(),
  // Guardrail (spec §5.4): no dialogue option may be a lie.
  deceptive: z.never().optional(),
});

const VisitorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    /** The Keeper Circle group this family member belongs to. */
    member: z.enum(['kit', 'parents']),
    emoji: z.string(),
    at: z.number().positive(),
    warn: z.number().positive(),
    line: z.string(),
    calmLine: z.string(),
    /** Shown instead of a knock when this person already knows about the dragon. */
    knownLine: z.string(),
    noisyLine: z.string(),
    choices: z.array(ChoiceSchema).min(2),
  })
  // Child-safety rule (spec §5.4): a player can always tell family. The first choice
  // for every family visitor must be to show them the dragon.
  .refine((v) => v.choices[0]?.joins === v.member, {
    message: 'Every family visitor must offer "show them the dragon" as the first choice',
  });

const WindowThingSchema = z.object({
  id: z.string(),
  art: z.enum(['moth', 'blink', 'cat', 'surveyor']),
  at: z.number().positive(),
  stay: z.number().positive(),
  suspicious: z.boolean(),
  tapLine: z.string(),
  missLine: z.string().optional(),
});

const EveningTuningSchema = z.object({
  startCalm: z.number(),
  calmBase: z.number(),
  calmLampDim: z.number(),
  calmBlanket: z.number(),
  calmDriftPerSec: z.number().positive(),
  calmEnough: z.number(),
  knockCalm: z.object({ normal: z.number(), blanket: z.number() }),
  friendlyCalm: z.number(),
  lullabyHumCalm: z.number().default(25),
  attention: z.object({ missed: z.number(), missedBright: z.number(), spotted: z.number(), share: z.number() }),
});

export const SPECIALS = ['crane-door', 'hill-flight', 'choice'] as const;
export type SpecialKind = (typeof SPECIALS)[number];

/** One evening: shared tuning plus that day's schedule, with family details filled in. */
const EveningSchema = EveningTuningSchema.extend({
  endAt: z.number().positive(),
  /** Day 3: the moment three problems happen at once (spec §5.6). */
  steppingStonesAt: z.number().positive().optional(),
  /** Chapters 2–3: a story moment that pauses the evening (Crane at the door, the hill flight, the choice). */
  special: z.enum(SPECIALS).optional(),
  specialAt: z.number().nonnegative().optional(),
  visitors: z.array(VisitorSchema),
  windowThings: z.array(WindowThingSchema),
});

const ScheduleVisitorSchema = z.object({
  id: z.string(),
  at: z.number().positive(),
  line: z.string(),
  calmLine: z.string().optional(),
  knownLine: z.string().optional(),
  noisyLine: z.string().optional(),
});

const EveningFileSchema = EveningTuningSchema.extend({
  family: z.record(z.string(), VisitorSchema.innerType().omit({ id: true, at: true, line: true })),
  schedules: z.record(
    z.string(),
    z.object({
      endAt: z.number().positive(),
      steppingStonesAt: z.number().positive().optional(),
      special: z.enum(SPECIALS).optional(),
      specialAt: z.number().nonnegative().optional(),
      visitors: z.array(ScheduleVisitorSchema),
      windowThings: z.array(WindowThingSchema),
    }),
  ),
});

const StoreItemSchema = z.object({
  id: z.string(),
  food: z.string(),
  name: z.string(),
  servings: z.number().int().positive(),
  price: z.number().int().positive(), // cents
  art: z.string(),
  tag: z.string().optional(),
});

const StoreSchema = z.object({
  shopkeeper: z.string(),
  allowance: z.number().int().positive(),
  wallet: z.array(z.number().int().positive()).min(1),
  list: z.array(z.object({ food: z.string(), servings: z.number().int().positive(), label: z.string() })).min(1),
  items: z.array(StoreItemSchema).min(2),
  changeMistake: z.number().int().positive(),
  intro: z.string(),
});

/** Story characters' names, which a dragon can't share (it would muddle the story). */
const STORY_NAMES = ['Cinder', 'Kit', 'June', 'Crane', 'Silas', 'Blink', 'Pickles', 'Patel', 'Ortiz'];

/**
 * Dragon names are picked from this list only: there is no free-text entry anywhere in
 * the game, so nothing a player types can appear on screen (spec §10.4).
 */
const NamesSchema = z
  .object({
    perPage: z.number().int().min(2).max(8),
    default: z.string(),
    names: z.array(z.string().regex(/^[A-Z][a-z]{1,11}$/, { message: 'Names are one simple word, 2–12 letters' })).min(12),
  })
  .refine((n) => new Set(n.names).size === n.names.length, { message: 'Duplicate dragon name' })
  .refine((n) => n.names.includes(n.default), { message: 'The default name must be in the list' })
  .refine((n) => !n.names.some((x) => STORY_NAMES.includes(x)), { message: "A dragon name can't be a story character's name" });

export const ACTIVITIES = ['insulation', 'flight', 'fire', 'letter', 'favorites'] as const;
export type ActivityKind = (typeof ACTIVITIES)[number];
export const AFTERNOONS = ['research', 'store', 'clues', 'board', 'map', 'farewell'] as const;
export type AfternoonKind = (typeof AFTERNOONS)[number];

const DaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  morning: z.object({
    start: z.object({ hunger: z.number(), spark: z.number(), calm: z.number() }),
    recipeScale: z.number().positive(),
    stage: z.enum(['hatchling', 'fledgling']).default('hatchling'),
    chewedSlipper: z.boolean().optional(),
    /** A short morning lesson before care (Chapters 2–3). */
    activity: z.enum(ACTIVITIES).optional(),
    /** Day 4: the family meeting about the treehouse. */
    opening: z.literal('family').optional(),
    intro: z.string(),
  }),
  afternoon: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('research'), set: z.string(), june: z.boolean().optional(), intro: z.string() }),
    z.object({ kind: z.literal('store') }),
    z.object({ kind: z.literal('clues'), set: z.string() }),
    z.object({ kind: z.literal('board') }),
    z.object({ kind: z.literal('map') }),
    z.object({ kind: z.literal('farewell') }),
  ]),
  evening: z.object({ schedule: z.string(), cliffhanger: z.boolean().optional(), intro: z.array(z.string()).optional() }),
});

const CliffhangerSchema = z.object({
  title: z.string(),
  paragraphs: z.array(z.string()).min(1),
  toldParents: z.string(),
  notToldParents: z.string(),
});

const DaysSchema = z.object({
  days: z.array(DaySchema).min(1),
  chapters: z
    .array(z.object({ n: z.number().int().positive(), title: z.string(), lastDay: z.number().int().positive(), cliffhanger: CliffhangerSchema.optional() }))
    .min(1),
});

const QuizSchema = z.object({
  id: z.string(),
  question: z.string(),
  choices: z.array(z.string()).min(2),
  answer: z.string(),
  why: z.string(),
});

const ClueSetSchema = z.object({
  title: z.string(),
  intro: z.string(),
  picture: z.string(),
  items: z.array(z.object({ id: z.string(), label: z.string(), real: z.boolean(), why: z.string() })).min(3),
  evidence: z.string(),
  done: z.string(),
});

const ActivitiesSchema = z.object({
  family: z.object({
    title: z.string(),
    told: z.array(z.string()).min(1),
    notTold: z.array(z.string()).min(1),
    rules: z.array(z.string()).min(1),
    toldButton: z.string(),
    // Child-safety rule (spec §5.4): telling the family is always "show them the dragon".
    notToldButton: z.string().regex(/^Show /, { message: 'The family meeting button must be "Show ... the dragon"' }),
  }),
  insulation: z.object({
    title: z.string(),
    intro: z.string(),
    pick: z.number().int().positive(),
    materials: z.array(z.object({ id: z.string(), label: z.string(), emoji: z.string(), warmth: z.number(), dry: z.boolean(), note: z.string() })).min(3),
    best: z.array(z.string()),
    success: z.string(),
  }),
  flight: z.object({
    title: z.string(),
    intro: z.string(),
    tries: z.number().int().positive(),
    zone: z.tuple([z.number(), z.number()]),
    maxDistance: z.number().positive(),
    question: z.string(),
    after: z.string(),
  }),
  fire: z.object({
    title: z.string(),
    intro: z.string(),
    abilities: z.array(z.object({ id: z.string(), label: z.string(), emoji: z.string(), about: z.string() })).min(2),
    scenarios: z.array(z.object({ id: z.string(), job: z.string(), answer: z.string(), why: z.string() })).min(1),
    after: z.string(),
  }),
  letter: z.object({ title: z.string(), paragraphs: z.array(z.string()).min(1) }),
  favorites: z.object({
    title: z.string(),
    intro: z.string(),
    groups: z.array(z.object({ id: z.string(), label: z.string(), options: z.array(z.string()).min(2) })).min(1),
  }),
  clues: z.record(z.string(), ClueSetSchema),
  evidence: z.object({
    items: z.array(z.object({ id: z.string(), label: z.string(), strong: z.boolean(), why: z.string().optional() })).min(4),
    pick: z.number().int().positive(),
    boardIntro: z.string(),
    juneFills: z.string(),
    meeting: z.array(z.string()).min(1),
    exit: z.string(),
  }),
  map: z.object({
    title: z.string(),
    intro: z.string(),
    rows: z.number().int().positive(),
    cols: z.number().int().positive(),
    home: z.tuple([z.number().int(), z.number().int()]),
    lakes: z.tuple([z.number().int(), z.number().int()]),
    questions: z.array(QuizSchema).min(1),
    after: z.string(),
  }),
  farewell: z.object({ title: z.string(), visits: z.array(z.object({ who: z.string(), emoji: z.string(), line: z.string() })).min(1) }),
  ending: z.object({
    title: z.string(),
    intro: z.array(z.string()).min(1),
    parentsLine: z.string(),
    choices: z.array(z.object({ id: z.enum(['stay', 'fly']), label: z.string(), result: z.string(), epilogue: z.string() })).length(2),
    bondExtras: z.array(z.object({ min: z.number().int().nonnegative(), line: z.string() })).min(1),
  }),
});

const StorySchema = z.object({
  juneIntro: z.object({
    title: z.string(),
    emoji: z.string(),
    paragraphs: z.array(z.string()).min(1),
    closing: z.string(),
    button: z.string(),
  }),
  eveningIntro: z.object({
    title: z.string(),
    emoji: z.string(),
    paragraphs: z.array(z.string()).min(1),
    button: z.string(),
  }),
  steppingStones: z.object({
    title: z.string(),
    intro: z.string(),
    problems: z.array(z.object({ id: z.enum(['hungry', 'kit', 'blink']), emoji: z.string(), label: z.string() })).length(3),
    reasons: z.array(z.object({ id: z.string(), label: z.string() })).min(2),
    firstFeedback: z.object({ hungry: z.string(), kit: z.string(), blink: z.string() }),
    after: z.string(),
  }),
  kitDiscovers: z.string(),
});

const ReadingSchema = z.object({
  starsForSticker: z.number().int().positive(),
  readToCalm: z.number().positive(),
  readsForSticker: z.number().int().positive(),
  questions: z.array(
    z.object({
      id: z.string(),
      /** Which story panel this question follows: june, library-N, evening-N or store. */
      panel: z.string(),
      question: z.string(),
      choices: z
        .array(z.object({ id: z.string(), label: z.string(), correct: z.boolean() }))
        .min(2)
        .refine((c) => c.filter((x) => x.correct).length === 1, { message: 'Exactly one correct answer' }),
      /** The words in the panel that hold the answer; highlighted after a wrong answer. */
      answerText: z.string(),
    }),
  ),
});

export type StoryDef = z.infer<typeof StorySchema>;
export type ReadingDef = z.infer<typeof ReadingSchema>;
export type FoodDef = z.infer<typeof FoodSchema>;
export type PageDef = z.infer<typeof PageSchema>;
export type ArchiveDef = z.infer<typeof ArchiveSchema>;
export type EveningDef = z.infer<typeof EveningSchema>;
export type StoreDef = z.infer<typeof StoreSchema>;
export type StoreItemDef = z.infer<typeof StoreItemSchema>;
export type DayDef = z.infer<typeof DaySchema>;
export type DaysDef = z.infer<typeof DaysSchema>;
export type ActivitiesDef = z.infer<typeof ActivitiesSchema>;
export type ChapterDef = DaysDef['chapters'][number];
export type VisitorDef = z.infer<typeof VisitorSchema>;
export type WindowThingDef = z.infer<typeof WindowThingSchema>;
export type SpiceDef = z.infer<typeof SpiceSchema>;
export type SpiceRecipe = z.infer<typeof RecipeSchema>;
export type Plate = z.infer<typeof PlateSchema>;
export type ThoughtDef = z.infer<typeof ThoughtSchema>;

export interface Content {
  foods: FoodDef[];
  spices: SpiceDef[];
  plateTargets: Record<string, Plate>;
  spiceRecipes: SpiceRecipe[];
  thoughts: ThoughtDef[];
  /** Day 1's research set and evening (kept for convenience; use archiveFor/eveningFor for other days). */
  archive: ArchiveDef;
  evening: EveningDef;
  archiveSets: Record<string, ArchiveDef>;
  eveningSchedules: Record<string, EveningDef>;
  store: StoreDef;
  days: DaysDef;
  story: StoryDef;
  reading: ReadingDef;
  activities: ActivitiesDef;
  names: z.infer<typeof NamesSchema>;
}

/** The text of a story panel, as written in the content files ({name} not filled in). */
export function panelText(c: Content, panel: string): string[] {
  const [kind, n] = panel.split('-');
  const day = c.days.days.find((d) => d.day === Number(n));
  if (panel === 'june') return c.story.juneIntro.paragraphs;
  if (panel === 'store') return [c.store.intro];
  if (panel === 'letter') return c.activities.letter.paragraphs;
  if (kind === 'library' && day?.afternoon.kind === 'research') return [day.afternoon.intro];
  if (kind === 'evening' && day) return day.evening.intro ?? c.story.eveningIntro.paragraphs;
  return [];
}

export function dayDef(c: Content, day: number): DayDef {
  return c.days.days.find((d) => d.day === day) ?? c.days.days[0];
}

/** The research set for a day (falls back to Day 1's). */
export function archiveFor(c: Content, day: number): ArchiveDef {
  const a = dayDef(c, day).afternoon;
  return a.kind === 'research' ? (c.archiveSets[a.set] ?? c.archive) : c.archive;
}

/** The chapter a day belongs to. */
export function chapterFor(c: Content, day: number): ChapterDef {
  return c.days.chapters.find((ch) => day <= ch.lastDay) ?? c.days.chapters[c.days.chapters.length - 1];
}

/** The last day of the game. */
export function lastDay(c: Content): number {
  return Math.min(c.days.days.length, c.days.chapters[c.days.chapters.length - 1].lastDay);
}

export function eveningFor(c: Content, day: number): EveningDef {
  return c.eveningSchedules[dayDef(c, day).evening.schedule] ?? c.evening;
}

function checkArchive(name: string, archive: ArchiveDef) {
  const answer = archive.pages.find((p) => p.id === archive.answerPageId);
  if (!answer || answer.credibility !== 'trusted' || !answer.tip) throw new Error(`[${name}] The answer page must exist, be trusted and have a tip`);
  for (const p of archive.pages) {
    const unknown = p.keywords.find((k) => !archive.chips.includes(k));
    if (unknown) throw new Error(`[${name}] Page ${p.id} uses keyword "${unknown}" that has no chip`);
  }
}

/** Accepts the evening file (family + schedules) or, for tests, a single ready-made evening. */
function parseEvenings(raw: unknown): Record<string, EveningDef> {
  if (raw && typeof raw === 'object' && 'visitors' in raw) return { day1: EveningSchema.parse(raw) };
  const f = EveningFileSchema.parse(raw);
  const { family, schedules, ...tuning } = f;
  const out: Record<string, EveningDef> = {};
  for (const [id, sch] of Object.entries(schedules)) {
    const visitors = sch.visitors.map((v) => {
      const base = family[v.id];
      if (!base) throw new Error(`[${id}] Unknown family visitor "${v.id}"`);
      return { ...base, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)) };
    });
    out[id] = EveningSchema.parse({ ...tuning, ...sch, visitors });
  }
  return out;
}

/** Validates raw content and checks cross-references. Throws with a readable message on failure. */
export function parseContent(raw: { items: unknown; recipes: unknown; thoughts: unknown; archive?: unknown; evening?: unknown }): Content {
  const items = ItemsSchema.parse(raw.items);
  const recipes = RecipesSchema.parse(raw.recipes);
  const thoughts = ThoughtsSchema.parse(raw.thoughts);
  const rawArchive = (raw.archive ?? archiveJson) as { sets?: unknown };
  const archiveSets = rawArchive.sets
    ? z.record(z.string(), ArchiveSchema).parse(rawArchive.sets)
    : { 'calm-knock': ArchiveSchema.parse(rawArchive) };
  for (const [name, a] of Object.entries(archiveSets)) checkArchive(name, a);
  const archive = archiveSets['calm-knock'] ?? Object.values(archiveSets)[0];
  const eveningSchedules = parseEvenings(raw.evening ?? eveningJson);
  const evening = eveningSchedules['day1'] ?? Object.values(eveningSchedules)[0];
  const days = DaysSchema.parse(daysJson);
  const store = StoreSchema.parse(storeJson);
  for (const d of days.days) {
    if (d.afternoon.kind === 'research' && !archiveSets[d.afternoon.set] && rawArchive.sets) throw new Error(`Day ${d.day}: unknown research set "${d.afternoon.set}"`);
    if (!eveningSchedules[d.evening.schedule] && !(raw.evening && 'visitors' in (raw.evening as object))) throw new Error(`Day ${d.day}: unknown evening schedule "${d.evening.schedule}"`);
  }
  const activities = ActivitiesSchema.parse(activitiesJson);
  checkActivities(activities, archiveSets, days);
  for (const item of store.items) if (!items.foods.some((f) => f.id === item.food)) throw new Error(`Store item ${item.id} sells unknown food "${item.food}"`);

  const spiceIds = new Set(items.spices.map((s) => s.id));
  for (const r of recipes.spiceRecipes) {
    for (const id of Object.keys(r.parts)) {
      if (!spiceIds.has(id)) throw new Error(`Recipe ${r.id} uses unknown spice "${id}"`);
    }
  }
  const ids = [...items.foods.map((f) => f.id), ...items.spices.map((s) => s.id), ...thoughts.thoughts.map((t) => t.id)];
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Duplicate content id "${dup}"`);

  return {
    ...items,
    ...recipes,
    thoughts: thoughts.thoughts,
    archive,
    evening,
    archiveSets,
    eveningSchedules,
    store,
    days,
    story: StorySchema.parse(storyJson),
    reading: ReadingSchema.parse(readingJson),
    activities,
    names: NamesSchema.parse(namesJson),
  };
}

/** Cross-references for Chapters 2–3, so every puzzle can be finished (spec §6.5). */
function checkActivities(a: ActivitiesDef, sets: Record<string, ArchiveDef>, days: DaysDef) {
  const evidence = new Set(a.evidence.items.map((e) => e.id));
  const strong = a.evidence.items.filter((e) => e.strong);
  if (strong.length < a.evidence.pick) throw new Error('The Evidence Board needs at least as many strong pieces as the player picks');
  for (const e of a.evidence.items) if (!e.strong && !e.why) throw new Error(`Weak evidence ${e.id} must explain why it doesn't count`);
  for (const [id, set] of Object.entries(a.clues)) {
    if (!evidence.has(set.evidence)) throw new Error(`Clue set ${id} gives unknown evidence "${set.evidence}"`);
    if (set.items.filter((i) => i.real).length < 1) throw new Error(`Clue set ${id} needs real clues`);
  }
  for (const [name, set] of Object.entries(sets)) for (const p of set.pages) if (p.evidence && !evidence.has(p.evidence)) throw new Error(`[${name}] Page ${p.id} gives unknown evidence "${p.evidence}"`);
  const mats = a.insulation.materials.map((m) => m.id);
  if (a.insulation.best.length !== a.insulation.pick || a.insulation.best.some((b) => !mats.includes(b))) throw new Error('Insulation: "best" must name exactly `pick` materials');
  const top = [...a.insulation.materials].filter((m) => m.dry).sort((x, y) => y.warmth - x.warmth).slice(0, a.insulation.pick).map((m) => m.id);
  if (top.some((t) => !a.insulation.best.includes(t))) throw new Error('Insulation: the best materials must be the warmest dry ones, so testing gives the answer');
  const ab = a.fire.abilities.map((x) => x.id);
  for (const sc of a.fire.scenarios) if (!ab.includes(sc.answer)) throw new Error(`Fire scenario ${sc.id} has unknown answer`);
  for (const q of a.map.questions) if (!q.choices.includes(q.answer)) throw new Error(`Map question ${q.id}: the answer must be one of the choices`);
  const [lo, hi] = a.flight.zone;
  if (!(lo < hi && hi <= 100)) throw new Error('Flight zone must be inside 0–100');
  for (const d of days.days) if (d.afternoon.kind === 'clues' && !a.clues[d.afternoon.set]) throw new Error(`Day ${d.day}: unknown clue set "${d.afternoon.set}"`);
  const ch = days.chapters;
  for (let i = 1; i < ch.length; i++) if (ch[i].lastDay <= ch[i - 1].lastDay) throw new Error('Chapters must end on increasing days');
}

function checkReading(c: Content) {
  for (const q of c.reading.questions) {
    const text = panelText(c, q.panel).join(' ');
    if (!text) throw new Error(`Reading question ${q.id}: unknown panel "${q.panel}"`);
    // The answer must really be in the panel, so a reader can always find it.
    if (!text.toLowerCase().includes(q.answerText.toLowerCase())) throw new Error(`Reading question ${q.id}: "${q.answerText}" is not in the ${q.panel} panel`);
  }
}

export const content: Content = parseContent({ items: itemsJson, recipes: recipesJson, thoughts: thoughtsJson, archive: archiveJson, evening: eveningJson });
checkReading(content);
