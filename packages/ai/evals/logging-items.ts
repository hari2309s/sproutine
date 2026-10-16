import type { MealSlot, ParsedMealItem, PortionUnit } from '@sproutine/food'

/**
 * The "logging-golden" cases (dev plan, Phase 2): what a person said, and the
 * foods and grams they meant. Grams are realistic amounts, not the portion
 * table's numbers, and an estimate passes within ±25 %.
 *
 * `ideal` is how a correct parse looks. A unit test runs the portion
 * estimator on it, so the portion side is checked offline; the LLM eval then
 * measures only how well the model reads the sentence.
 */
export interface ExpectedMealItem {
  /** Any of these, lowercased, must appear in the parsed name. */
  aliases: string[]
  grams: number
  ideal: ParsedMealItem
}

export interface LoggingCase {
  id: string
  query: string
  /** Only set when the sentence names the meal. */
  slot?: MealSlot
  items: ExpectedMealItem[]
}

export const GRAMS_TOLERANCE = 0.25

const it = (
  aliases: string[],
  grams: number,
  name: string,
  quantity?: number,
  unit?: PortionUnit
): ExpectedMealItem => ({
  aliases,
  grams,
  ideal: { name, ...(quantity != null ? { quantity } : {}), ...(unit ? { unit } : {}) },
})

const c = (id: string, query: string, items: ExpectedMealItem[], slot?: MealSlot): LoggingCase => ({
  id: `log-${id}`,
  query,
  items,
  ...(slot ? { slot } : {}),
})

export const LOGGING_CASES: LoggingCase[] = [
  // ── German ──
  c('de-01', 'Zwei Scheiben Vollkornbrot mit Käse', [
    it(['brot'], 90, 'Vollkornbrot', 2, 'slice'),
    it(['käse', 'kaese'], 35, 'Käse'),
  ]),
  c(
    'de-02',
    'Zum Frühstück hatte ich eine Schüssel Müsli mit Milch',
    [it(['müsli', 'muesli'], 50, 'Müsli', 1, 'bowl'), it(['milch'], 175, 'Milch')],
    'breakfast'
  ),
  c(
    'de-03',
    'Mittags gab es Spaghetti Bolognese',
    [it(['spaghetti'], 250, 'Spaghetti Bolognese')],
    'lunch'
  ),
  c('de-04', 'Ein Apfel und eine Handvoll Mandeln', [
    it(['apfel'], 180, 'Apfel', 1),
    it(['mandel'], 30, 'Mandeln', 1, 'handful'),
  ]),
  c('de-05', 'Abendessen war ein Döner', [it(['döner', 'doner'], 350, 'Döner', 1)], 'dinner'),
  c('de-06', 'Ich hatte 150 g Magerquark mit Beeren', [
    it(['quark'], 150, 'Magerquark', 150, 'g'),
    it(['beere'], 100, 'Beeren'),
  ]),
  c('de-07', 'zwei Brezeln', [it(['brezel'], 170, 'Brezel', 2)]),
  c('de-08', 'Eine Schüssel Linsensuppe', [
    it(['linsensuppe', 'suppe'], 300, 'Linsensuppe', 1, 'bowl'),
  ]),
  c(
    'de-09',
    'Ein Glas Rotwein zum Abendessen',
    [it(['wein'], 150, 'Rotwein', 1, 'glass')],
    'dinner'
  ),
  c('de-10', 'Ein Becher Joghurt mit einem Löffel Honig', [
    it(['joghurt', 'jogurt'], 150, 'Joghurt', 1, 'cup'),
    it(['honig'], 20, 'Honig', 1, 'tbsp'),
  ]),
  c('de-11', 'Schnitzel mit Pommes', [
    it(['schnitzel'], 150, 'Schnitzel'),
    it(['pommes'], 150, 'Pommes'),
  ]),
  c('de-12', 'Ein Becher schwarzer Kaffee', [it(['kaffee'], 250, 'Kaffee', 1, 'mug')]),
  c('de-13', 'Eine Banane und ein Müsliriegel', [
    it(['banane'], 120, 'Banane', 1),
    it(['riegel'], 30, 'Müsliriegel', 1),
  ]),
  c('de-14', '3 Kartoffeln mit Quark', [
    it(['kartoffel'], 300, 'Kartoffeln', 3),
    it(['quark'], 150, 'Quark'),
  ]),
  c('de-15', 'Ein Stück Käsekuchen am Nachmittag', [it(['kuchen'], 110, 'Käsekuchen', 1, 'piece')]),
  c('de-16', 'zwei Spiegeleier auf Toast', [
    it(['ei'], 110, 'Spiegeleier', 2),
    it(['toast'], 45, 'Toast'),
  ]),
  c('de-17', 'Eine Currywurst', [it(['wurst'], 100, 'Currywurst', 1)]),
  c('de-18', 'Ein Glas Orangensaft', [it(['saft'], 200, 'Orangensaft', 1, 'glass')]),
  c('de-19', 'Ich habe eine Tafel Schokolade gegessen', [
    it(['schoko'], 100, 'Schokolade', 1, 'bar'),
  ]),
  c('de-20', 'Zwei Brötchen mit Marmelade und Butter', [
    it(['brötchen'], 120, 'Brötchen', 2),
    it(['marmelade'], 25, 'Marmelade'),
    it(['butter'], 10, 'Butter'),
  ]),
  c('de-21', 'Ein Teller Nudeln mit Tomatensoße', [
    it(['nudel'], 250, 'Nudeln', 1, 'plate'),
    it(['soße', 'sosse', 'sauce'], 100, 'Tomatensoße'),
  ]),
  c(
    'de-22',
    'Abends Lachs mit Reis und Brokkoli',
    [it(['lachs'], 125, 'Lachs'), it(['reis'], 180, 'Reis'), it(['brokkoli'], 150, 'Brokkoli')],
    'dinner'
  ),
  c('de-23', 'Eine Handvoll Chips', [it(['chips'], 20, 'Chips', 1, 'handful')]),
  c('de-24', 'Eine Tasse Tee', [it(['tee'], 200, 'Tee', 1, 'cup')]),
  c('de-25', 'Zwei Scheiben Toastbrot mit Erdnussbutter', [
    it(['toast'], 50, 'Toastbrot', 2, 'slice'),
    it(['erdnussbutter', 'butter'], 20, 'Erdnussbutter'),
  ]),

  // ── English ──
  c(
    'en-01',
    'I had a bowl of porridge with blueberries for breakfast',
    [
      it(['porridge', 'oat'], 50, 'porridge', 1, 'bowl'),
      it(['blueberr', 'berr'], 90, 'blueberries'),
    ],
    'breakfast'
  ),
  c('en-02', 'just ate a banana', [it(['banana'], 120, 'banana', 1)]),
  c('en-03', 'two eggs and a slice of toast', [
    it(['egg'], 110, 'eggs', 2),
    it(['toast'], 25, 'toast', 1, 'slice'),
  ]),
  c('en-04', 'a glass of orange juice', [it(['juice'], 200, 'orange juice', 1, 'glass')]),
  c('en-05', 'had a slice of pizza for lunch', [it(['pizza'], 110, 'pizza', 1, 'slice')], 'lunch'),
  c('en-06', 'a handful of grapes', [it(['grape'], 80, 'grapes', 1, 'handful')]),
  c('en-07', 'two beers at the pub', [it(['beer'], 1000, 'beer', 2)]),
  c('en-08', '3 small potatoes and some broccoli', [
    it(['potato'], 250, 'potatoes', 3),
    it(['broccoli'], 130, 'broccoli'),
  ]),
  c('en-09', 'a bowl of rice with chicken curry', [
    it(['rice'], 180, 'rice', 1, 'bowl'),
    it(['chicken', 'curry'], 175, 'chicken curry'),
  ]),
  c('en-10', 'I snacked on some crisps', [it(['crisps', 'chips'], 30, 'crisps')]),
  c('en-11', 'a cappuccino', [it(['cappuccino'], 170, 'cappuccino', 1)]),
  c('en-12', 'Greek yoghurt with a tablespoon of honey', [
    it(['yoghurt', 'yogurt'], 150, 'Greek yoghurt'),
    it(['honey'], 20, 'honey', 1, 'tbsp'),
  ]),
  c('en-13', 'two slices of rye bread with butter', [
    it(['bread'], 90, 'rye bread', 2, 'slice'),
    it(['butter'], 10, 'butter'),
  ]),
  c(
    'en-14',
    'salmon with potatoes and green beans for dinner',
    [
      it(['salmon'], 125, 'salmon'),
      it(['potato'], 200, 'potatoes'),
      it(['bean'], 150, 'green beans'),
    ],
    'dinner'
  ),
  c('en-15', 'an apple and a handful of walnuts', [
    it(['apple'], 180, 'apple', 1),
    it(['walnut', 'nut'], 30, 'walnuts', 1, 'handful'),
  ]),
  c('en-16', 'a mug of hot chocolate', [
    it(['chocolate', 'cocoa'], 250, 'hot chocolate', 1, 'mug'),
  ]),
  c('en-17', 'two croissants', [it(['croissant'], 120, 'croissant', 2)]),
  c('en-18', '200 ml oat milk', [it(['milk'], 200, 'oat milk', 200, 'ml')]),
  c('en-19', 'a plate of pasta with pesto', [
    it(['pasta'], 250, 'pasta', 1, 'plate'),
    it(['pesto'], 30, 'pesto'),
  ]),
  c(
    'en-20',
    'lentil soup and a bread roll for lunch',
    [it(['soup'], 300, 'lentil soup'), it(['roll', 'bread'], 60, 'bread roll', 1)],
    'lunch'
  ),

  // ── Mixed or tricky ──
  c('mx-01', 'I had Haferflocken with a banana this morning', [
    it(['hafer', 'oat'], 50, 'Haferflocken'),
    it(['banan'], 120, 'banana', 1),
  ]),
  c('mx-02', 'a Brezel and a coffee', [
    it(['brezel', 'pretzel'], 85, 'Brezel', 1),
    it(['coffee', 'kaffee'], 200, 'coffee', 1),
  ]),
  c('mx-03', 'I wanted cake but had an apple instead', [it(['apple'], 180, 'apple', 1)]),
  c('mx-04', '10 Mandeln', [it(['mandel'], 12, 'Mandeln', 10)]),
  c('mx-05', 'half a pizza', [it(['pizza'], 165, 'pizza', 0.5)]),

  // ── BLS-targeted (German generic foods that should resolve to BLS) ──
  c('bls-01', 'Ein Teller Naturreis mit Hähnchenbrust', [
    it(['reis', 'naturreis', 'rice'], 350, 'Naturreis', 1, 'plate'),
    it(['hähnchen', 'chicken'], 150, 'Hähnchenbrust'),
  ]),
  c(
    'bls-02',
    'Zum Frühstück gab es Haferflocken mit Banane und Milch',
    [
      it(['hafer', 'oat'], 50, 'Haferflocken'),
      it(['banan'], 120, 'Banane', 1),
      it(['milch'], 200, 'Milch'),
    ],
    'breakfast'
  ),
  c('bls-03', 'Ein Stück Butter aufs Brot', [
    it(['butter'], 10, 'Butter'),
    it(['brot'], 90, 'Brot'),
  ]),
  c('bls-04', '200 g Magerquark mit einer Karotte', [
    it(['quark'], 200, 'Magerquark', 200, 'g'),
    it(['karotte'], 70, 'Karotte', 1),
  ]),
  c('bls-05', 'Brokkoli mit Olivenöl und Lachs', [
    it(['brokkoli', 'broccoli'], 150, 'Brokkoli'),
    it(['olivenöl', 'olive'], 15, 'Olivenöl', 1, 'tbsp'),
    it(['lachs', 'salmon'], 125, 'Lachs'),
  ]),
]
