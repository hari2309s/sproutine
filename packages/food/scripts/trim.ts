// Fields of raw API responses that normalisation and the fixture tests use.
// Shared by the recorder; keeps fixtures small and reviewable.

const OFF_NUTRIENTS = [
  'energy-kcal',
  'energy-kj',
  'proteins',
  'fat',
  'carbohydrates',
  'fiber',
  'sugars',
  'salt',
  'sodium',
]

export function trimOffProduct(p: Record<string, unknown>) {
  const nutrients =
    (p.nutrition as { aggregated_set?: { nutrients?: Record<string, unknown> } })?.aggregated_set
      ?.nutrients ?? {}
  return {
    code: p.code,
    product_name: p.product_name,
    product_name_de: p.product_name_de,
    brands: p.brands,
    allergens_tags: p.allergens_tags,
    traces_tags: p.traces_tags,
    serving_quantity: p.serving_quantity,
    nutrition: {
      aggregated_set: {
        nutrients: Object.fromEntries(
          OFF_NUTRIENTS.filter((k) => k in nutrients).map((k) => [k, nutrients[k]])
        ),
      },
    },
  }
}

const USDA_IDS = new Set([1008, 2047, 2048, 1062, 1003, 1004, 1005, 1079, 2000, 1063, 1093])

export function trimUsdaFood(f: {
  fdcId: number
  description: string
  dataType?: string
  foodNutrients?: { nutrientId: number; nutrientName?: string; value: number; unitName?: string }[]
}) {
  return {
    fdcId: f.fdcId,
    description: f.description,
    dataType: f.dataType,
    foodNutrients: (f.foodNutrients ?? [])
      .filter((n) => USDA_IDS.has(n.nutrientId))
      .map(({ nutrientId, nutrientName, value, unitName }) => ({
        nutrientId,
        nutrientName,
        value,
        unitName,
      })),
  }
}
