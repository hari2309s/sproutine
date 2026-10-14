// Typical portion weights, German-context, used to turn "two slices of rye
// bread" into grams. Portion size is the main accuracy bottleneck in meal
// logging (dev plan §12), so every estimate says how it was derived and the
// confirm card always lets the user edit grams.
//
// Values are typical edible weights (raw where usually weighed raw) drawn
// from common label serving sizes and household measures; they are defaults
// for an editable field, not reference data.

export type PortionUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'glass'
  | 'mug'
  | 'bowl'
  | 'plate'
  | 'slice'
  | 'piece'
  | 'handful'
  | 'bar'
  | 'portion'

export interface PortionEstimate {
  grams: number
  /** How the number was derived — shown to the user and traced. */
  basis: 'exact' | 'food-unit' | 'food-default' | 'generic-unit'
  confidence: 'high' | 'medium' | 'low'
}

// Units that are exact (mass) or near-exact (volume, assuming ~1 g/ml).
const EXACT_UNITS: Partial<Record<PortionUnit, number>> = { g: 1, kg: 1000, ml: 1, l: 1000 }

// Household measures when nothing food-specific is known.
const GENERIC_UNITS: Partial<Record<PortionUnit, number>> = {
  tsp: 5,
  tbsp: 15,
  cup: 240,
  glass: 200,
  mug: 250,
  bowl: 250,
  plate: 350,
  handful: 30,
  bar: 50,
  slice: 30,
  piece: 100,
  portion: 150,
}

export interface FoodPortion {
  /** Lowercase words (English and German) that identify the food. */
  match: string[]
  /** Grams for one of each unit. */
  units: Partial<Record<PortionUnit, number>>
  /** Grams for one unspecified portion. */
  default: number
  /** A bare count means servings, not pieces ("2 Schokolade" is two bars' worth, not two squares). */
  countsServings?: true
}

// More specific entries first — the first match wins.
/** @internal Exported for tests. */
export const FOOD_PORTIONS: FoodPortion[] = [
  // Bread & bakery
  { match: ['toast', 'toastbrot'], units: { slice: 25 }, default: 50 },
  { match: ['knäckebrot', 'crispbread'], units: { slice: 10, piece: 10 }, default: 20 },
  { match: ['pumpernickel'], units: { slice: 40 }, default: 80 },
  {
    match: ['brötchen', 'semmel', 'schrippe', 'bread roll', 'roll', 'bun'],
    units: { piece: 60 },
    default: 60,
  },
  {
    match: ['brezel', 'brezeln', 'breze', 'pretzel', 'pretzels'],
    units: { piece: 85 },
    default: 85,
  },
  { match: ['croissant'], units: { piece: 60 }, default: 60 },
  { match: ['bagel'], units: { piece: 90 }, default: 90 },
  { match: ['baguette'], units: { slice: 30, piece: 250 }, default: 60 },
  {
    match: [
      'vollkornbrot',
      'roggenbrot',
      'mischbrot',
      'sauerteigbrot',
      'brot',
      'bread',
      'rye bread',
      'sourdough',
    ],
    units: { slice: 45 },
    default: 90,
  },
  { match: ['kuchen', 'cake', 'torte'], units: { slice: 100, piece: 100 }, default: 100 },
  { match: ['muffin'], units: { piece: 80 }, default: 80 },
  {
    match: ['riegel', 'müsliriegel', 'granola bar', 'cereal bar', 'protein bar', 'energy bar'],
    units: { piece: 30, bar: 30 },
    default: 30,
  },
  { match: ['keks', 'kekse', 'cookie', 'biscuit'], units: { piece: 12 }, default: 25 },

  // Breakfast
  {
    match: [
      'müsli',
      'muesli',
      'granola',
      'haferflocken',
      'oats',
      'porridge',
      'cornflakes',
      'cereal',
    ],
    units: { bowl: 50, cup: 80, tbsp: 10, portion: 50 },
    default: 50,
  },
  { match: ['ei', 'eier', 'egg', 'eggs'], units: { piece: 55 }, default: 55 },
  {
    match: ['marmelade', 'konfitüre', 'jam', 'honig', 'honey', 'nutella'],
    units: { tsp: 7, tbsp: 20, portion: 20 },
    default: 20,
  },
  { match: ['butter', 'margarine'], units: { tsp: 5, tbsp: 14, portion: 10 }, default: 10 },
  {
    match: ['erdnussbutter', 'peanut butter', 'nussbutter', 'nut butter', 'mandelmus', 'tahini'],
    units: { tsp: 7, tbsp: 16 },
    default: 20,
  },
  { match: ['pesto'], units: { tsp: 5, tbsp: 15 }, default: 30 },
  {
    match: [
      'soße',
      'sosse',
      'sauce',
      'dressing',
      'ketchup',
      'mayo',
      'mayonnaise',
      'senf',
      'mustard',
    ],
    units: { tsp: 5, tbsp: 15 },
    default: 30,
  },

  // Dairy
  {
    match: ['quark', 'magerquark', 'skyr'],
    units: { tbsp: 30, bowl: 250, portion: 150 },
    default: 150,
  },
  {
    match: ['joghurt', 'jogurt', 'yoghurt', 'yogurt'],
    units: { tbsp: 20, bowl: 150, cup: 150, portion: 150 },
    default: 150,
  },
  {
    match: ['käse', 'kaese', 'cheese', 'gouda', 'emmentaler', 'cheddar'],
    units: { slice: 20, piece: 30 },
    default: 30,
  },
  { match: ['frischkäse', 'cream cheese'], units: { tsp: 10, tbsp: 20 }, default: 30 },
  { match: ['feta', 'hirtenkäse', 'mozzarella'], units: { slice: 25, piece: 125 }, default: 50 },
  { match: ['milch', 'milk'], units: { glass: 200, cup: 240, mug: 250, tbsp: 15 }, default: 200 },

  // Fruit
  { match: ['banane', 'bananen', 'banana', 'bananas'], units: { piece: 120 }, default: 120 },
  { match: ['apfel', 'äpfel', 'apple', 'apples'], units: { piece: 180 }, default: 180 },
  { match: ['birne', 'birnen', 'pear', 'pears'], units: { piece: 180 }, default: 180 },
  { match: ['orange', 'orangen', 'apfelsine', 'oranges'], units: { piece: 150 }, default: 150 },
  {
    match: ['mandarine', 'mandarinen', 'clementine', 'clementinen'],
    units: { piece: 70 },
    default: 70,
  },
  { match: ['kiwi'], units: { piece: 75 }, default: 75 },
  {
    match: [
      'beeren',
      'berries',
      'erdbeeren',
      'strawberries',
      'heidelbeeren',
      'blueberries',
      'himbeeren',
    ],
    units: { handful: 60, cup: 145, bowl: 150 },
    // A topping-sized serving; a whole punnet is 250 g.
    default: 100,
  },
  { match: ['trauben', 'grapes'], units: { handful: 80 }, default: 100 },

  // Vegetables
  { match: ['tomate', 'tomaten', 'tomato', 'tomatoes'], units: { piece: 100 }, default: 100 },
  {
    match: ['cherrytomate', 'cherrytomaten', 'cherry tomato', 'cherry tomatoes'],
    units: { piece: 15, handful: 80 },
    default: 80,
  },
  { match: ['gurke', 'cucumber'], units: { slice: 10, piece: 300 }, default: 100 },
  {
    match: ['karotte', 'karotten', 'möhre', 'möhren', 'mohrrübe', 'carrot', 'carrots'],
    units: { piece: 70 },
    default: 70,
  },
  { match: ['paprika', 'bell pepper'], units: { piece: 160 }, default: 160 },
  { match: ['kartoffel', 'kartoffeln', 'potato', 'potatoes'], units: { piece: 100 }, default: 200 },
  { match: ['salat', 'salad'], units: { bowl: 150, plate: 200, portion: 150 }, default: 150 },
  {
    match: ['rosenkohl', 'brussels sprouts', 'brokkoli', 'broccoli', 'gemüse', 'vegetables'],
    units: { handful: 60, cup: 90, portion: 150 },
    default: 150,
  },

  // Mains & sides
  {
    match: ['nudeln', 'pasta', 'spaghetti', 'penne', 'noodles'],
    units: { plate: 250, portion: 250, bowl: 250 },
    default: 250,
  },
  { match: ['reis', 'rice'], units: { cup: 185, bowl: 200, portion: 180 }, default: 180 },
  {
    match: ['linsen', 'lentils', 'kichererbsen', 'chickpeas', 'bohnen', 'beans'],
    units: { cup: 200, tbsp: 15, portion: 150 },
    default: 150,
  },
  {
    match: ['suppe', 'soup', 'eintopf', 'stew'],
    units: { bowl: 300, plate: 300, portion: 300 },
    default: 300,
  },
  { match: ['döner', 'doner', 'kebab'], units: { piece: 350 }, default: 350 },
  // A bare count means whole pizzas; slices have their own unit.
  { match: ['pizza'], units: { slice: 110, piece: 330 }, default: 330 },
  { match: ['bratwurst', 'wurst', 'currywurst', 'sausage'], units: { piece: 100 }, default: 100 },
  { match: ['schnitzel'], units: { piece: 150 }, default: 150 },
  {
    match: ['hähnchen', 'chicken', 'hühnchen', 'pute', 'turkey'],
    units: { piece: 150, portion: 150 },
    default: 150,
  },
  {
    match: ['lachs', 'salmon', 'fisch', 'fish'],
    units: { piece: 125, portion: 125 },
    default: 125,
  },
  { match: ['tofu', 'tempeh'], units: { slice: 50, portion: 100 }, default: 100 },
  { match: ['schinken', 'ham', 'salami', 'aufschnitt'], units: { slice: 15 }, default: 30 },

  // Snacks & drinks
  {
    match: ['nüsse', 'nuts', 'mandeln', 'almonds', 'walnüsse', 'walnuts', 'erdnüsse', 'peanuts'],
    units: { handful: 30, piece: 1.2 },
    default: 30,
  },
  {
    match: ['schokolade', 'chocolate'],
    units: { piece: 6, slice: 6, bar: 100, portion: 25 },
    default: 25,
    countsServings: true,
  },
  { match: ['chips', 'crisps'], units: { handful: 20, bowl: 50 }, default: 30 },
  {
    match: ['kaffee', 'coffee', 'espresso', 'cappuccino', 'latte'],
    units: { cup: 150, mug: 250, glass: 250 },
    default: 200,
  },
  { match: ['tee', 'tea'], units: { cup: 200, mug: 250, glass: 250 }, default: 250 },
  {
    match: ['saft', 'juice', 'schorle', 'limonade', 'cola', 'soda'],
    units: { glass: 200, cup: 240 },
    default: 250,
  },
  { match: ['bier', 'beer'], units: { glass: 330, piece: 500 }, default: 500 },
  { match: ['wein', 'wine'], units: { glass: 150 }, default: 150 },
]

/**
 * Finds the portion entry for a food name. Accompaniments are dropped first
 * ("Müsli mit Milch" is muesli, "bread with butter" is bread). Within what's
 * left, the keyword ending last wins, since the head noun comes last in
 * English and German compounds ("milk chocolate" is chocolate,
 * "Linsensuppe" is soup). Ties go to the longer, more specific keyword
 * ("Toastbrot" is toast, not bread; "Cherrytomate" isn't a whole tomato).
 */
const ACCOMPANIMENT = /\s+(?:mit|with|und|and)\s+|,/

function findFood(name: string): FoodPortion | undefined {
  const text = name.toLowerCase().split(ACCOMPANIMENT)[0]!.trim()
  let best: { entry: FoodPortion; end: number; len: number } | undefined
  for (const entry of FOOD_PORTIONS) {
    for (const word of entry.match) {
      // German compounds put the food last ("Linsensuppe" is a soup,
      // "Orangensaft" a juice), so longer keywords also match a word's end.
      const prefix = word.length >= 4 ? '\\p{L}*' : ''
      const re = new RegExp(`(^|[^\\p{L}])${prefix}${word}(?=[^\\p{L}]|$)`, 'gu')
      for (const m of text.matchAll(re)) {
        const end = m.index + m[0].length
        if (!best || end > best.end || (end === best.end && word.length > best.len)) {
          best = { entry, end, len: word.length }
        }
      }
    }
  }
  return best?.entry
}

/**
 * Estimates the grams for `quantity` × `unit` of a named food. Mass/volume
 * units are exact; food-specific units are medium confidence; anything else
 * falls back to household measures at low confidence.
 *
 * Leave `quantity` out when the user gave no amount ("I had nuts"): that is
 * one typical serving. A bare number without a unit is a count of whole items
 * ("3 Kartoffeln", "10 Mandeln"), so it scales `piece`, which must be one
 * whole item, linearly.
 */
export function estimatePortion(
  foodName: string,
  quantity?: number,
  unit?: PortionUnit
): PortionEstimate {
  if (quantity !== undefined && (!Number.isFinite(quantity) || quantity <= 0)) {
    throw new Error(`Invalid quantity: ${quantity}`)
  }
  const count = quantity ?? 1
  const round = (g: number) => Math.round(g)

  if (unit && EXACT_UNITS[unit] != null) {
    return { grams: round(count * EXACT_UNITS[unit]!), basis: 'exact', confidence: 'high' }
  }
  const food = findFood(foodName)
  // A bare count is a count of pieces.
  const effectiveUnit =
    unit ??
    (quantity !== undefined && food?.units.piece && !food.countsServings ? 'piece' : undefined)
  if (food && effectiveUnit && food.units[effectiveUnit] != null) {
    const grams = round(count * food.units[effectiveUnit]!)
    return { grams, basis: 'food-unit', confidence: 'medium' }
  }
  if (food && (!effectiveUnit || effectiveUnit === 'portion' || effectiveUnit === 'piece')) {
    // One typical serving, not one piece ("nuts" is a handful, not an almond).
    return { grams: round(count * food.default), basis: 'food-default', confidence: 'medium' }
  }
  const generic = (unit && GENERIC_UNITS[unit]) ?? GENERIC_UNITS.portion!
  return { grams: round(count * generic), basis: 'generic-unit', confidence: 'low' }
}
