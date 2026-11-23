import { z } from 'zod';
import itemsJson from '../../content/items.json';
import recipesJson from '../../content/recipes.json';
import thoughtsJson from '../../content/thoughts.json';
import archiveJson from '../../content/archive.json';
import eveningJson from '../../content/evening.json';
import storyJson from '../../content/story.json';
import storeJson from '../../content/store.json';
import daysJson from '../../content/days.json';

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
    tip: z.object({ text: z.string(), unlocks: z.enum(['blanket', 'lullaby']) }).optional(),
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

/** One evening: shared tuning plus that day's schedule, with family details filled in. */
const EveningSchema = EveningTuningSchema.extend({
  endAt: z.number().positive(),
  /** Day 3: the moment three problems happen at once (spec §5.6). */
  steppingStonesAt: z.number().positive().optional(),
  visitors: z.array(VisitorSchema).min(1),
  windowThings: z.array(WindowThingSchema).min(1),
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
      visitors: z.array(ScheduleVisitorSchema),
      windowThings: z.array(WindowThingSchema).min(1),
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

const DaySchema = z.object({
  day: z.number().int().positive(),
  title: z.string(),
  morning: z.object({
    start: z.object({ hunger: z.number(), spark: z.number(), calm: z.number() }),
    recipeScale: z.number().positive(),
    chewedSlipper: z.boolean().optional(),
    intro: z.string(),
  }),
  afternoon: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('research'), set: z.string(), june: z.boolean().optional(), intro: z.string() }),
    z.object({ kind: z.literal('store') }),
  ]),
  evening: z.object({ schedule: z.string(), cliffhanger: z.boolean().optional(), intro: z.array(z.string()).optional() }),
});

const DaysSchema = z.object({
  days: z.array(DaySchema).min(1),
  cliffhanger: z.object({ title: z.string(), paragraphs: z.array(z.string()), toldParents: z.string(), notToldParents: z.string() }),
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

export type StoryDef = z.infer<typeof StorySchema>;
export type FoodDef = z.infer<typeof FoodSchema>;
export type PageDef = z.infer<typeof PageSchema>;
export type ArchiveDef = z.infer<typeof ArchiveSchema>;
export type EveningDef = z.infer<typeof EveningSchema>;
export type StoreDef = z.infer<typeof StoreSchema>;
export type StoreItemDef = z.infer<typeof StoreItemSchema>;
export type DayDef = z.infer<typeof DaySchema>;
export type DaysDef = z.infer<typeof DaysSchema>;
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
}

export function dayDef(c: Content, day: number): DayDef {
  return c.days.days.find((d) => d.day === day) ?? c.days.days[0];
}

/** The research set for a day (falls back to Day 1's). */
export function archiveFor(c: Content, day: number): ArchiveDef {
  const a = dayDef(c, day).afternoon;
  return a.kind === 'research' ? (c.archiveSets[a.set] ?? c.archive) : c.archive;
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
  };
}

export const content: Content = parseContent({ items: itemsJson, recipes: recipesJson, thoughts: thoughtsJson, archive: archiveJson, evening: eveningJson });
