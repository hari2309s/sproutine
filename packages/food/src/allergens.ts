import type { Allergen } from '@sproutine/types'

// Open Food Facts allergen taxonomy ids → the EU-14 codes used in profiles.
// Only the 14 regulated allergens are mapped; anything else is ignored.
const OFF_TO_EU: Record<string, Allergen> = {
  'en:gluten': 'gluten',
  'en:crustaceans': 'crustaceans',
  'en:eggs': 'eggs',
  'en:fish': 'fish',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soybeans',
  'en:milk': 'milk',
  'en:nuts': 'nuts',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:lupin': 'lupin',
  'en:molluscs': 'molluscs',
}

/** Maps OFF allergen (and traces) tags to unique EU-14 codes, in a stable order. */
export function allergensFromOffTags(tags: readonly string[] | undefined): Allergen[] {
  const found = new Set<Allergen>()
  for (const tag of tags ?? []) {
    const code = OFF_TO_EU[tag]
    if (code) found.add(code)
  }
  return [...found].sort()
}
