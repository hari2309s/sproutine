import type { Allergen } from '@sproutine/types'

// Ingredients the seed recipes use. Allergens are categorical facts about the
// ingredient (EU-14 codes), conservative where products vary: hard Italian
// cheese is usually Grana Padano, which contains egg lysozyme; vegetable stock
// usually contains celery. Prices are hand-kept estimates for a German
// discounter (Aldi, Lidl) in 2026, per typical pack, and are always shown as
// estimates. There is no free price API for German supermarkets.

export const AISLES = [
  'produce',
  'bakery',
  'chilled',
  'meat',
  'fish',
  'dry',
  'tins',
  'frozen',
  'spreads',
  'pantry',
] as const
export type Aisle = (typeof AISLES)[number]

/** Animal products, for diet checks. */
export type AnimalProduct = 'meat' | 'fish' | 'dairy' | 'egg' | 'honey'

export interface Ingredient {
  id: string
  name: string
  nameDe: string
  aisle: Aisle
  allergens: Allergen[]
  animal?: AnimalProduct
  /** Typical pack: grams (or ml) and estimated price in euro cents. */
  pack: { grams: number; cents: number }
  /** Kept at home (oil, salt, spices): listed to check, not bought weekly. */
  pantry?: boolean
}

const i = (
  id: string,
  name: string,
  nameDe: string,
  aisle: Aisle,
  pack: [grams: number, cents: number],
  allergens: Allergen[] = [],
  animal?: AnimalProduct
): Ingredient => ({
  id,
  name,
  nameDe,
  aisle,
  allergens,
  ...(animal ? { animal } : {}),
  pack: { grams: pack[0], cents: pack[1] },
})

const pantry = (
  id: string,
  name: string,
  nameDe: string,
  allergens: Allergen[] = []
): Ingredient => ({
  id,
  name,
  nameDe,
  aisle: 'pantry',
  allergens,
  pack: { grams: 0, cents: 0 },
  pantry: true,
})

const LIST: Ingredient[] = [
  // Produce
  i('onion', 'Onions', 'Zwiebeln', 'produce', [1000, 129]),
  i('garlic', 'Garlic', 'Knoblauch', 'produce', [100, 99]),
  i('carrot', 'Carrots', 'Karotten', 'produce', [1000, 99]),
  i('potato', 'Potatoes', 'Kartoffeln', 'produce', [2000, 249]),
  i('sweet-potato', 'Sweet potatoes', 'Süßkartoffeln', 'produce', [1000, 249]),
  i('tomato', 'Tomatoes', 'Tomaten', 'produce', [500, 149]),
  i('cherry-tomato', 'Cherry tomatoes', 'Cherrytomaten', 'produce', [250, 129]),
  i('cucumber', 'Cucumber', 'Salatgurke', 'produce', [400, 69]),
  i('bell-pepper', 'Bell peppers', 'Paprika', 'produce', [500, 199]),
  i('zucchini', 'Courgettes', 'Zucchini', 'produce', [500, 149]),
  i('broccoli', 'Broccoli', 'Brokkoli', 'produce', [500, 149]),
  i('brussels-sprouts', 'Brussels sprouts', 'Rosenkohl', 'produce', [500, 199]),
  i('pointed-cabbage', 'Pointed cabbage', 'Spitzkohl', 'produce', [1000, 149]),
  i('leek', 'Leek', 'Lauch', 'produce', [300, 99]),
  i('mushrooms', 'Mushrooms', 'Champignons', 'produce', [400, 179]),
  i('spinach', 'Baby spinach', 'Babyspinat', 'produce', [200, 149]),
  i('lettuce', 'Salad leaves', 'Blattsalat', 'produce', [200, 129]),
  i('spring-onion', 'Spring onions', 'Frühlingszwiebeln', 'produce', [100, 59]),
  i('parsley', 'Parsley', 'Petersilie', 'produce', [30, 99]),
  i('ginger', 'Ginger', 'Ingwer', 'produce', [100, 69]),
  i('lemon', 'Lemons', 'Zitronen', 'produce', [500, 149]),
  i('apple', 'Apples', 'Äpfel', 'produce', [1000, 199]),
  i('banana', 'Bananas', 'Bananen', 'produce', [1000, 139]),
  i('avocado', 'Avocados', 'Avocados', 'produce', [400, 199]),

  // Bakery
  i('wholegrain-bread', 'Wholegrain bread', 'Vollkornbrot', 'bakery', [500, 129], ['gluten']),
  i('bread-rolls', 'Bread rolls', 'Aufbackbrötchen', 'bakery', [360, 89], ['gluten']),
  i('wraps', 'Tortilla wraps', 'Tortilla-Wraps', 'bakery', [370, 129], ['gluten']),

  // Dairy and eggs
  i('eggs', 'Eggs (10)', 'Eier (10 Stück)', 'chilled', [600, 279], ['eggs'], 'egg'),
  i('milk', 'Milk', 'Milch', 'chilled', [1000, 99], ['milk'], 'dairy'),
  i('oat-drink', 'Oat drink', 'Haferdrink', 'chilled', [1000, 119], ['gluten']),
  i('yoghurt', 'Natural yoghurt', 'Naturjoghurt', 'chilled', [500, 89], ['milk'], 'dairy'),
  i('soy-yoghurt', 'Soy yoghurt', 'Sojajoghurt', 'chilled', [500, 179], ['soybeans']),
  i('quark', 'Low-fat quark', 'Magerquark', 'chilled', [500, 129], ['milk'], 'dairy'),
  i('feta', 'Feta', 'Feta', 'chilled', [200, 179], ['milk'], 'dairy'),
  i('mozzarella', 'Mozzarella', 'Mozzarella', 'chilled', [125, 79], ['milk'], 'dairy'),
  i('gouda', 'Grated Gouda', 'Gouda gerieben', 'chilled', [200, 179], ['milk'], 'dairy'),
  i(
    'hard-cheese',
    'Hard cheese (Grana Padano)',
    'Hartkäse (Grana Padano)',
    'chilled',
    [100, 199],
    ['milk', 'eggs'],
    'dairy'
  ),
  i('butter', 'Butter', 'Butter', 'chilled', [250, 239], ['milk'], 'dairy'),
  i('cream-cheese', 'Cream cheese', 'Frischkäse', 'chilled', [200, 99], ['milk'], 'dairy'),
  i('tofu', 'Tofu', 'Tofu', 'chilled', [400, 199], ['soybeans']),
  i('hummus', 'Hummus', 'Hummus', 'chilled', [200, 149], ['sesame']),

  // Meat and fish
  i('chicken-breast', 'Chicken breast', 'Hähnchenbrustfilet', 'meat', [400, 549], [], 'meat'),
  i('beef-mince', 'Beef mince', 'Rinderhackfleisch', 'meat', [400, 449], [], 'meat'),
  i('ham', 'Cooked ham', 'Kochschinken', 'meat', [200, 199], [], 'meat'),
  i('bratwurst', 'Bratwurst', 'Bratwurst', 'meat', [400, 279], [], 'meat'),
  i('salmon', 'Salmon fillets (frozen)', 'Lachsfilet (TK)', 'fish', [250, 399], ['fish'], 'fish'),
  i(
    'pollock',
    'Pollock fillets (frozen)',
    'Seelachsfilet (TK)',
    'fish',
    [400, 349],
    ['fish'],
    'fish'
  ),
  i(
    'tuna',
    'Tuna in water (tin)',
    'Thunfisch im eigenen Saft',
    'fish',
    [130, 149],
    ['fish'],
    'fish'
  ),

  // Dry goods
  i('pasta', 'Pasta', 'Nudeln', 'dry', [500, 79], ['gluten']),
  i('spaetzle', 'Spätzle', 'Spätzle', 'dry', [500, 149], ['gluten', 'eggs'], 'egg'),
  i('egg-noodles', 'Egg noodles', 'Mie-Nudeln', 'dry', [250, 99], ['gluten', 'eggs'], 'egg'),
  i('rice', 'Rice', 'Reis', 'dry', [1000, 179]),
  i('oats', 'Rolled oats', 'Haferflocken', 'dry', [500, 69], ['gluten']),
  i('bulgur', 'Bulgur', 'Bulgur', 'dry', [500, 129], ['gluten']),
  i('couscous', 'Couscous', 'Couscous', 'dry', [500, 119], ['gluten']),
  i('flour', 'Wheat flour', 'Weizenmehl', 'dry', [1000, 59], ['gluten']),
  i('red-lentils', 'Red lentils', 'Rote Linsen', 'dry', [500, 179]),
  i('sunflower-seeds', 'Sunflower seeds', 'Sonnenblumenkerne', 'dry', [200, 99]),
  i('almonds', 'Almonds', 'Mandeln', 'dry', [200, 249], ['nuts']),
  i('walnuts', 'Walnuts', 'Walnüsse', 'dry', [200, 279], ['nuts']),

  // Tins and jars
  i('chopped-tomatoes', 'Chopped tomatoes', 'Gehackte Tomaten', 'tins', [400, 59]),
  i('passata', 'Passata', 'Passierte Tomaten', 'tins', [500, 79]),
  i('tomato-paste', 'Tomato paste', 'Tomatenmark', 'tins', [200, 69]),
  i('chickpeas', 'Chickpeas (tin, drained)', 'Kichererbsen (Dose)', 'tins', [240, 79]),
  i('kidney-beans', 'Kidney beans (tin, drained)', 'Kidneybohnen (Dose)', 'tins', [250, 79]),
  i('sweetcorn', 'Sweetcorn (tin, drained)', 'Mais (Dose)', 'tins', [140, 79]),
  i('coconut-milk', 'Coconut milk', 'Kokosmilch', 'tins', [400, 129]),
  i('sauerkraut', 'Sauerkraut', 'Sauerkraut', 'tins', [520, 99], ['sulphites']),

  // Frozen
  i('frozen-berries', 'Frozen berries', 'TK-Beeren', 'frozen', [750, 349]),
  i('frozen-spinach', 'Frozen spinach', 'TK-Spinat', 'frozen', [450, 129]),
  i('frozen-peas', 'Frozen peas', 'TK-Erbsen', 'frozen', [450, 129]),
  i('frozen-veg', 'Frozen stir-fry vegetables', 'TK-Pfannengemüse', 'frozen', [750, 179]),

  // Spreads
  i('peanut-butter', 'Peanut butter', 'Erdnussbutter', 'spreads', [350, 249], ['peanuts']),
  i('jam', 'Jam', 'Konfitüre', 'spreads', [450, 149]),
  { ...i('honey', 'Honey', 'Honig', 'spreads', [250, 249]), animal: 'honey' },

  // Pantry: assumed at home
  pantry('olive-oil', 'Olive oil', 'Olivenöl'),
  pantry('rapeseed-oil', 'Rapeseed oil', 'Rapsöl'),
  pantry('salt-pepper', 'Salt and pepper', 'Salz und Pfeffer'),
  pantry('spices', 'Spices (paprika, cumin, cinnamon)', 'Gewürze (Paprika, Kreuzkümmel, Zimt)'),
  pantry('curry-powder', 'Curry powder', 'Currypulver'),
  pantry('dried-herbs', 'Dried herbs', 'Getrocknete Kräuter'),
  pantry('vegetable-stock', 'Vegetable stock', 'Gemüsebrühe', ['celery']),
  pantry('soy-sauce', 'Soy sauce', 'Sojasoße', ['soybeans', 'gluten']),
  pantry('mustard', 'Mustard', 'Senf', ['mustard']),
  pantry('sugar', 'Sugar', 'Zucker'),
]

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries(
  LIST.map((x) => [x.id, x])
)
