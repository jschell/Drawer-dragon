import { z } from 'zod';
import itemsJson from '../../content/items.json';
import recipesJson from '../../content/recipes.json';
import thoughtsJson from '../../content/thoughts.json';

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

export type FoodDef = z.infer<typeof FoodSchema>;
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
}

/** Validates raw content and checks cross-references. Throws with a readable message on failure. */
export function parseContent(raw: { items: unknown; recipes: unknown; thoughts: unknown }): Content {
  const items = ItemsSchema.parse(raw.items);
  const recipes = RecipesSchema.parse(raw.recipes);
  const thoughts = ThoughtsSchema.parse(raw.thoughts);

  const spiceIds = new Set(items.spices.map((s) => s.id));
  for (const r of recipes.spiceRecipes) {
    for (const id of Object.keys(r.parts)) {
      if (!spiceIds.has(id)) throw new Error(`Recipe ${r.id} uses unknown spice "${id}"`);
    }
  }
  const ids = [...items.foods.map((f) => f.id), ...items.spices.map((s) => s.id), ...thoughts.thoughts.map((t) => t.id)];
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Duplicate content id "${dup}"`);

  return { ...items, ...recipes, thoughts: thoughts.thoughts };
}

export const content: Content = parseContent({ items: itemsJson, recipes: recipesJson, thoughts: thoughtsJson });
