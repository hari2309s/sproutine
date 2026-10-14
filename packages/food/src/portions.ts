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
  { match: ['brezel', 'breze', 'pretzel'], units: { piece: 85 }, default: 85 },
  { match: ['croissant'], units: { piece: 60 }, default: 60 },
  { match: ['bagel'], units: { piece: 90 }, default: 90 },
  { match: ['baguette'], units: { slice: 30, piece: 60 }, default: 60 },
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
  { match: ['banane', 'banana'], units: { piece: 120 }, default: 120 },
  { match: ['apfel', 'äpfel', 'apple'], units: { piece: 180 }, default: 180 },
  { match: ['birne', 'pear'], units: { piece: 180 }, default: 180 },
  { match: ['orange', 'apfelsine'], units: { piece: 150 }, default: 150 },
  { match: ['mandarine', 'clementine'], units: { piece: 70 }, default: 70 },
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
    default: 125,
  },
  { match: ['trauben', 'grapes'], units: { handful: 80 }, default: 100 },

  // Vegetables
  { match: ['tomate', 'tomato'], units: { piece: 100 }, default: 100 },
  {
    match: ['cherrytomate', 'cherry tomato', 'cherry tomatoes'],
    units: { piece: 15, handful: 80 },
    default: 80,
  },
  { match: ['gurke', 'cucumber'], units: { slice: 10, piece: 300 }, default: 100 },
  { match: ['karotte', 'möhre', 'mohrrübe', 'carrot'], units: { piece: 70 }, default: 70 },
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
  { match: ['schokolade', 'chocolate'], units: { piece: 6, slice: 6, portion: 25 }, default: 25 },
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
 * left, the keyword appearing last wins, since the head noun comes last in
 * English compounds ("milk chocolate" is chocolate); ties go to the longer
 * keyword. German compounds are single words and match whole only.
 */
const ACCOMPANIMENT = /\s+(?:mit|with|und|and)\s+|,/

function findFood(name: string): FoodPortion | undefined {
  const text = name.toLowerCase().split(ACCOMPANIMENT)[0]!.trim()
  let best: { entry: FoodPortion; at: number; len: number } | undefined
  for (const entry of FOOD_PORTIONS) {
    for (const word of entry.match) {
      const re = new RegExp(`(^|[^\\p{L}])${word}(?=[^\\p{L}]|$)`, 'gu')
      for (const m of text.matchAll(re)) {
        const at = m.index + m[1]!.length
        if (!best || at > best.at || (at === best.at && word.length > best.len)) {
          best = { entry, at, len: word.length }
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
 */
export function estimatePortion(
  foodName: string,
  quantity = 1,
  unit?: PortionUnit
): PortionEstimate {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`Invalid quantity: ${quantity}`)
  const round = (g: number) => Math.round(g)

  if (unit && EXACT_UNITS[unit] != null) {
    return { grams: round(quantity * EXACT_UNITS[unit]!), basis: 'exact', confidence: 'high' }
  }
  const food = findFood(foodName)
  if (food && unit && food.units[unit] != null) {
    return { grams: round(quantity * food.units[unit]!), basis: 'food-unit', confidence: 'medium' }
  }
  if (food && unit === 'piece' && food.units.piece == null) {
    return { grams: round(quantity * food.default), basis: 'food-default', confidence: 'medium' }
  }
  if (food && !unit && quantity > 1 && food.units.piece != null) {
    // A count without a unit counts items: "3 Kartoffeln" is three potatoes,
    // "10 Mandeln" ten almonds. `piece` must therefore be one whole item.
    return { grams: round(quantity * food.units.piece), basis: 'food-unit', confidence: 'medium' }
  }
  if (food && (!unit || unit === 'portion')) {
    // One typical serving, not one piece ("nuts" is a handful, not an almond).
    return { grams: round(quantity * food.default), basis: 'food-default', confidence: 'medium' }
  }
  const generic = (unit && GENERIC_UNITS[unit]) ?? GENERIC_UNITS.portion!
  return { grams: round(quantity * generic), basis: 'generic-unit', confidence: 'low' }
}
