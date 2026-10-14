import { z } from 'zod'
import { MAX_MEAL_ITEMS, MEAL_SLOTS, type MealSlot, type ParsedMealItem } from '@sproutine/food'
import { routedGenerateObject } from './router'

// The model only transcribes what the user said into a structure. Grams and
// nutrients are worked out in code (packages/food), so this schema has no
// field the model could put an invented number into: quantity is the count
// the user said, and only when they said one.
const UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'glass',
  'mug',
  'bowl',
  'plate',
  'slice',
  'piece',
  'handful',
  'portion',
] as const satisfies readonly NonNullable<ParsedMealItem['unit']>[]

export const ParsedMealSchema = z.object({
  slot: z.enum(MEAL_SLOTS).nullable(),
  items: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().nullable(),
        unit: z.enum(UNITS).nullable(),
      })
    )
    .max(20),
})
export type ParsedMealOutput = z.infer<typeof ParsedMealSchema>

const MEAL_PARSE_PROMPT = `You turn a message to a food-logging app into a list of the foods and drinks the person says they consumed.

Rules:
- One item per distinct food or drink. Split combinations: "Brot mit Käse" is bread and cheese; "muesli with milk" is muesli and milk. Keep a dish whole when it is one dish ("Spaghetti Bolognese", "Döner", "Caesar salad").
- name: the food as the person named it, in their language, singular, without the amount ("zwei Scheiben Vollkornbrot" → "Vollkornbrot"). Keep a brand if they said one.
- quantity: the number they said ("zwei" → 2, "half" → 0.5, "a"/"ein" → 1). null if they gave no amount. Never guess a weight.
- unit: only a unit they said, mapped to: g, kg, ml, l, tsp, tbsp, cup, glass, mug, bowl, plate, slice, piece, handful, portion ("Scheibe" → slice, "Stück" → piece, "Glas" → glass, "Tasse" → mug, "Schüssel"/"Schale" → bowl, "EL" → tbsp, "TL" → tsp). null if none.
- slot: breakfast, lunch, dinner or snack if they said which meal ("Frühstück" → breakfast, "Mittagessen" → lunch, "Abendessen" → dinner). null if they didn't.
- Leave out foods they only plan to eat, didn't eat, or mention for another reason.
- If they mention no food they consumed, return an empty items list.`

/** Cleans model output: trims names, drops blanks and impossible numbers, caps the count. */
export function normalizeParsedMeal(output: ParsedMealOutput): {
  slot: MealSlot | null
  items: ParsedMealItem[]
} {
  const items: ParsedMealItem[] = []
  for (const raw of output.items) {
    const name = raw.name.trim().replace(/\s+/g, ' ').slice(0, 80)
    if (!name) continue
    const quantity =
      raw.quantity != null && Number.isFinite(raw.quantity) && raw.quantity > 0
        ? Math.min(raw.quantity, 5000)
        : undefined
    items.push({ name, ...(quantity ? { quantity } : {}), ...(raw.unit ? { unit: raw.unit } : {}) })
    if (items.length >= MAX_MEAL_ITEMS) break
  }
  return { slot: output.slot, items }
}

/**
 * Extracts the foods from a meal-logging message. Returns null when every
 * provider failed, so the caller can fall back to a normal reply.
 */
export async function parseMeal(
  message: string,
  meta?: { traceId?: string }
): Promise<{ slot: MealSlot | null; items: ParsedMealItem[] } | null> {
  const result = await routedGenerateObject(
    'structured',
    ParsedMealSchema,
    {
      instructions: MEAL_PARSE_PROMPT,
      prompt: message.slice(0, 1000),
      maxOutputTokens: 800,
      temperature: 0,
      functionId: 'parse-meal',
    },
    meta
  )
  return result ? normalizeParsedMeal(result.object) : null
}
