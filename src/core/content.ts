import { z } from 'zod';
import itemsJson from '../../content/items.json';
import recipesJson from '../../content/recipes.json';
import thoughtsJson from '../../content/thoughts.json';
import archiveJson from '../../content/archive.json';
import eveningJson from '../../content/evening.json';
import storyJson from '../../content/story.json';

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
    tip: z.object({ text: z.string(), unlocks: z.literal('blanket') }).optional(),
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
  joins: z.literal('kit').optional(),
  // Guardrail (spec §5.4): no dialogue option may be a lie.
  deceptive: z.never().optional(),
});

const VisitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  emoji: z.string(),
  at: z.number().positive(),
  warn: z.number().positive(),
  line: z.string(),
  quietLine: z.string(),
  noisyLine: z.string(),
  choices: z.array(ChoiceSchema).min(2),
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

const EveningSchema = z.object({
  startCalm: z.number(),
  calmBase: z.number(),
  calmLampDim: z.number(),
  calmBlanket: z.number(),
  calmDriftPerSec: z.number().positive(),
  quietCalm: z.number(),
  knockCalm: z.object({ normal: z.number(), blanket: z.number() }),
  endAt: z.number().positive(),
  attention: z.object({ missed: z.number(), missedBright: z.number(), spotted: z.number(), share: z.number() }),
  visitors: z.array(VisitorSchema).min(1),
  windowThings: z.array(WindowThingSchema).min(1),
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
});

export type StoryDef = z.infer<typeof StorySchema>;
export type FoodDef = z.infer<typeof FoodSchema>;
export type PageDef = z.infer<typeof PageSchema>;
export type ArchiveDef = z.infer<typeof ArchiveSchema>;
export type EveningDef = z.infer<typeof EveningSchema>;
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
  archive: ArchiveDef;
  evening: EveningDef;
  story: StoryDef;
}

/** Validates raw content and checks cross-references. Throws with a readable message on failure. */
export function parseContent(raw: { items: unknown; recipes: unknown; thoughts: unknown; archive?: unknown; evening?: unknown }): Content {
  const items = ItemsSchema.parse(raw.items);
  const recipes = RecipesSchema.parse(raw.recipes);
  const thoughts = ThoughtsSchema.parse(raw.thoughts);
  const archive = ArchiveSchema.parse(raw.archive ?? archiveJson);
  const evening = EveningSchema.parse(raw.evening ?? eveningJson);

  const answer = archive.pages.find((p) => p.id === archive.answerPageId);
  if (!answer || answer.credibility !== 'trusted' || !answer.tip) throw new Error('The answer page must exist, be trusted and have a tip');
  for (const p of archive.pages) {
    const unknown = p.keywords.find((k) => !archive.chips.includes(k));
    if (unknown) throw new Error(`Page ${p.id} uses keyword "${unknown}" that has no chip`);
  }

  const spiceIds = new Set(items.spices.map((s) => s.id));
  for (const r of recipes.spiceRecipes) {
    for (const id of Object.keys(r.parts)) {
      if (!spiceIds.has(id)) throw new Error(`Recipe ${r.id} uses unknown spice "${id}"`);
    }
  }
  const ids = [...items.foods.map((f) => f.id), ...items.spices.map((s) => s.id), ...thoughts.thoughts.map((t) => t.id)];
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Duplicate content id "${dup}"`);

  return { ...items, ...recipes, thoughts: thoughts.thoughts, archive, evening, story: StorySchema.parse(storyJson) };
}

export const content: Content = parseContent({ items: itemsJson, recipes: recipesJson, thoughts: thoughtsJson, archive: archiveJson, evening: eveningJson });
