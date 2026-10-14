import type { Allergen, Diet } from '@sproutine/types'
import { INGREDIENTS, type AnimalProduct } from './ingredients'

// Seed recipes the planner selects and adapts from, so plans are built from
// known dishes with known ingredients rather than invented by a model.
// Amounts are grams (or ml) for one serving. Diet and allergens are derived
// from the ingredients, never written by hand, so they can't drift.

export type RecipeSlot = 'breakfast' | 'main'

export interface Recipe {
  id: string
  name: string
  nameDe: string
  slot: RecipeSlot
  minutes: number
  ingredients: { id: string; grams: number }[]
  /** One line on how to make it. */
  how: string
}

const r = (
  id: string,
  name: string,
  nameDe: string,
  slot: RecipeSlot,
  minutes: number,
  ingredients: [string, number][],
  how: string
): Recipe => ({
  id,
  name,
  nameDe,
  slot,
  minutes,
  ingredients: ingredients.map(([ingredientId, grams]) => ({ id: ingredientId, grams })),
  how,
})

export const RECIPES: Recipe[] = [
  // ── Breakfast ──
  r(
    'overnight-oats',
    'Overnight oats with berries',
    'Overnight Oats mit Beeren',
    'breakfast',
    5,
    [
      ['oats', 50],
      ['milk', 150],
      ['frozen-berries', 60],
    ],
    'Stir oats into milk, top with berries, leave in the fridge overnight.'
  ),
  r(
    'vegan-overnight-oats',
    'Overnight oats with peanut butter',
    'Overnight Oats mit Erdnussbutter',
    'breakfast',
    5,
    [
      ['oats', 50],
      ['oat-drink', 150],
      ['banana', 60],
      ['peanut-butter', 15],
    ],
    'Stir oats into oat drink, add sliced banana and peanut butter, chill overnight.'
  ),
  r(
    'apple-porridge',
    'Apple cinnamon porridge',
    'Apfel-Zimt-Porridge',
    'breakfast',
    10,
    [
      ['oats', 50],
      ['milk', 200],
      ['apple', 90],
      ['spices', 1],
    ],
    'Simmer oats in milk for 5 minutes, stir in grated apple and cinnamon.'
  ),
  r(
    'quark-berries',
    'Quark with berries and honey',
    'Quark mit Beeren und Honig',
    'breakfast',
    5,
    [
      ['quark', 150],
      ['frozen-berries', 80],
      ['honey', 10],
    ],
    'Stir quark smooth, top with thawed berries and a little honey.'
  ),
  r(
    'yoghurt-muesli',
    'Yoghurt with oats, apple and walnuts',
    'Joghurt mit Haferflocken, Apfel und Walnüssen',
    'breakfast',
    5,
    [
      ['yoghurt', 150],
      ['oats', 40],
      ['apple', 90],
      ['walnuts', 10],
    ],
    'Layer yoghurt, oats, diced apple and chopped walnuts.'
  ),
  r(
    'soy-yoghurt-bowl',
    'Soy yoghurt with berries and seeds',
    'Sojajoghurt mit Beeren und Kernen',
    'breakfast',
    5,
    [
      ['soy-yoghurt', 150],
      ['frozen-berries', 80],
      ['sunflower-seeds', 15],
    ],
    'Top soy yoghurt with thawed berries and sunflower seeds.'
  ),
  r(
    'fruit-salad-seeds',
    'Fruit salad with seeds',
    'Obstsalat mit Kernen',
    'breakfast',
    10,
    [
      ['apple', 120],
      ['banana', 100],
      ['frozen-berries', 60],
      ['sunflower-seeds', 15],
      ['lemon', 10],
    ],
    'Dice the fruit, add lemon juice, scatter toasted seeds on top.'
  ),
  r(
    'coconut-rice-pudding',
    'Coconut rice pudding with berries',
    'Kokos-Milchreis mit Beeren',
    'breakfast',
    25,
    [
      ['rice', 50],
      ['coconut-milk', 120],
      ['frozen-berries', 60],
      ['spices', 1],
    ],
    'Simmer rice in coconut milk and a splash of water until creamy, top with berries.'
  ),
  r(
    'bread-cheese',
    'Wholegrain bread with cheese and cucumber',
    'Vollkornbrot mit Käse und Gurke',
    'breakfast',
    5,
    [
      ['wholegrain-bread', 90],
      ['butter', 10],
      ['gouda', 30],
      ['cucumber', 60],
    ],
    'Butter two slices, add cheese and cucumber.'
  ),
  r(
    'bread-egg',
    'Wholegrain bread with boiled egg and tomato',
    'Vollkornbrot mit Ei und Tomate',
    'breakfast',
    10,
    [
      ['wholegrain-bread', 90],
      ['eggs', 60],
      ['tomato', 60],
    ],
    'Boil an egg for 8 minutes, slice onto bread with tomato.'
  ),
  r(
    'scrambled-eggs',
    'Scrambled eggs on toast',
    'Rührei auf Toast',
    'breakfast',
    10,
    [
      ['eggs', 120],
      ['wholegrain-bread', 45],
      ['butter', 5],
      ['spring-onion', 10],
    ],
    'Scramble eggs gently in butter, add spring onion, serve on toast.'
  ),
  r(
    'tomato-eggs',
    'Scrambled eggs with tomatoes',
    'Rührei mit Tomaten',
    'breakfast',
    10,
    [
      ['eggs', 120],
      ['tomato', 100],
      ['spring-onion', 10],
      ['rapeseed-oil', 5],
    ],
    'Soften diced tomato in a pan, stir in beaten eggs until just set.'
  ),
  r(
    'rolls-jam',
    'Bread rolls with butter and jam',
    'Brötchen mit Butter und Marmelade',
    'breakfast',
    15,
    [
      ['bread-rolls', 120],
      ['butter', 10],
      ['jam', 25],
    ],
    'Bake the rolls, serve with butter and jam.'
  ),
  r(
    'ham-roll',
    'Ham and cucumber roll',
    'Schinkenbrötchen mit Gurke',
    'breakfast',
    15,
    [
      ['bread-rolls', 60],
      ['butter', 10],
      ['ham', 30],
      ['cucumber', 40],
    ],
    'Bake a roll, fill with butter, ham and cucumber.'
  ),
  r(
    'hummus-bread',
    'Wholegrain bread with hummus and cucumber',
    'Vollkornbrot mit Hummus und Gurke',
    'breakfast',
    5,
    [
      ['wholegrain-bread', 90],
      ['hummus', 40],
      ['cucumber', 60],
    ],
    'Spread hummus on two slices and top with cucumber.'
  ),
  r(
    'peanut-banana-toast',
    'Peanut butter and banana toast',
    'Toast mit Erdnussbutter und Banane',
    'breakfast',
    5,
    [
      ['wholegrain-bread', 90],
      ['peanut-butter', 20],
      ['banana', 100],
    ],
    'Toast the bread, spread peanut butter, top with banana slices.'
  ),
  r(
    'avocado-toast',
    'Avocado toast with tomato',
    'Avocado-Toast mit Tomate',
    'breakfast',
    10,
    [
      ['wholegrain-bread', 90],
      ['avocado', 70],
      ['tomato', 50],
      ['lemon', 10],
    ],
    'Mash avocado with lemon and salt, spread on toast, top with tomato.'
  ),
  r(
    'cream-cheese-bread',
    'Bread with cream cheese and cucumber',
    'Brot mit Frischkäse und Gurke',
    'breakfast',
    5,
    [
      ['wholegrain-bread', 90],
      ['cream-cheese', 30],
      ['cucumber', 60],
    ],
    'Spread cream cheese on two slices, top with cucumber and pepper.'
  ),
  r(
    'pancakes',
    'Pancakes with berries',
    'Pfannkuchen mit Beeren',
    'breakfast',
    20,
    [
      ['flour', 50],
      ['milk', 100],
      ['eggs', 30],
      ['frozen-berries', 60],
      ['rapeseed-oil', 5],
    ],
    'Whisk flour, milk and egg, fry thin pancakes, serve with warm berries.'
  ),

  // ── Lunch and dinner ──
  r(
    'spaghetti-bolognese',
    'Spaghetti bolognese',
    'Spaghetti Bolognese',
    'main',
    30,
    [
      ['pasta', 125],
      ['beef-mince', 100],
      ['chopped-tomatoes', 200],
      ['onion', 50],
      ['carrot', 50],
      ['garlic', 5],
      ['tomato-paste', 15],
      ['olive-oil', 5],
    ],
    'Brown mince with onion, carrot and garlic, add tomato paste and tomatoes, simmer 20 minutes, serve on pasta.'
  ),
  r(
    'lentil-bolognese',
    'Lentil bolognese',
    'Linsen-Bolognese',
    'main',
    30,
    [
      ['pasta', 125],
      ['red-lentils', 50],
      ['chopped-tomatoes', 200],
      ['onion', 50],
      ['carrot', 50],
      ['garlic', 5],
      ['tomato-paste', 15],
      ['olive-oil', 5],
    ],
    'Soften onion, carrot and garlic, add lentils, tomato paste, tomatoes and water, simmer 20 minutes, serve on pasta.'
  ),
  r(
    'red-lentil-dal',
    'Red lentil dal with rice',
    'Rote-Linsen-Dal mit Reis',
    'main',
    30,
    [
      ['red-lentils', 80],
      ['coconut-milk', 100],
      ['chopped-tomatoes', 100],
      ['onion', 50],
      ['garlic', 5],
      ['ginger', 5],
      ['curry-powder', 3],
      ['rice', 75],
    ],
    'Fry onion, garlic, ginger and curry powder, add lentils, tomatoes, coconut milk and water, simmer 20 minutes, serve with rice.'
  ),
  r(
    'chickpea-curry',
    'Chickpea and spinach curry',
    'Kichererbsen-Spinat-Curry',
    'main',
    25,
    [
      ['chickpeas', 120],
      ['coconut-milk', 100],
      ['frozen-spinach', 100],
      ['onion', 50],
      ['curry-powder', 3],
      ['rice', 75],
    ],
    'Fry onion and curry powder, add chickpeas, spinach and coconut milk, simmer 10 minutes, serve with rice.'
  ),
  r(
    'veg-curry',
    'Vegetable coconut curry',
    'Gemüse-Kokos-Curry',
    'main',
    25,
    [
      ['frozen-veg', 200],
      ['coconut-milk', 100],
      ['onion', 40],
      ['curry-powder', 3],
      ['rice', 75],
    ],
    'Fry onion and curry powder, add vegetables and coconut milk, simmer 10 minutes, serve with rice.'
  ),
  r(
    'chicken-curry',
    'Chicken curry with spinach',
    'Hähnchen-Curry mit Spinat',
    'main',
    30,
    [
      ['chicken-breast', 125],
      ['coconut-milk', 100],
      ['frozen-spinach', 80],
      ['onion', 50],
      ['curry-powder', 3],
      ['rice', 75],
    ],
    'Brown diced chicken with onion and curry powder, add spinach and coconut milk, simmer 10 minutes, serve with rice.'
  ),
  r(
    'chicken-rice-broccoli',
    'Chicken, rice and broccoli',
    'Hähnchen mit Reis und Brokkoli',
    'main',
    25,
    [
      ['chicken-breast', 125],
      ['rice', 75],
      ['broccoli', 150],
      ['rapeseed-oil', 5],
    ],
    'Pan-fry chicken, steam broccoli, serve with rice.'
  ),
  r(
    'chicken-wrap',
    'Chicken wraps with yoghurt sauce',
    'Hähnchen-Wraps mit Joghurtsoße',
    'main',
    20,
    [
      ['wraps', 125],
      ['chicken-breast', 100],
      ['lettuce', 30],
      ['tomato', 60],
      ['yoghurt', 50],
    ],
    'Fry sliced chicken, fill wraps with salad, tomato, chicken and seasoned yoghurt.'
  ),
  r(
    'hummus-wrap',
    'Hummus and veg wraps',
    'Hummus-Gemüse-Wraps',
    'main',
    15,
    [
      ['wraps', 125],
      ['hummus', 50],
      ['lettuce', 30],
      ['bell-pepper', 80],
      ['cucumber', 60],
    ],
    'Spread hummus on wraps, fill with sliced pepper, cucumber and salad.'
  ),
  r(
    'bean-chili',
    'Bean chili with rice',
    'Bohnen-Chili mit Reis',
    'main',
    30,
    [
      ['kidney-beans', 200],
      ['chopped-tomatoes', 200],
      ['bell-pepper', 80],
      ['onion', 50],
      ['sweetcorn', 70],
      ['spices', 2],
      ['rice', 75],
    ],
    'Fry onion and pepper with spices, add beans, corn and tomatoes, simmer 15 minutes, serve with rice.'
  ),
  r(
    'chili-con-carne',
    'Chili con carne',
    'Chili con Carne',
    'main',
    35,
    [
      ['beef-mince', 100],
      ['kidney-beans', 120],
      ['chopped-tomatoes', 200],
      ['bell-pepper', 80],
      ['onion', 50],
      ['spices', 2],
      ['rice', 75],
    ],
    'Brown mince with onion and pepper, add spices, beans and tomatoes, simmer 20 minutes, serve with rice.'
  ),
  r(
    'oven-veg-feta',
    'Roast vegetables with feta',
    'Ofengemüse mit Feta',
    'main',
    40,
    [
      ['potato', 250],
      ['zucchini', 100],
      ['bell-pepper', 80],
      ['onion', 50],
      ['feta', 50],
      ['olive-oil', 10],
    ],
    'Roast potatoes and vegetables with oil at 200 °C for 30 minutes, crumble feta over for the last 5.'
  ),
  r(
    'potatoes-herb-quark',
    'Jacket potatoes with herb quark',
    'Pellkartoffeln mit Kräuterquark',
    'main',
    30,
    [
      ['potato', 300],
      ['quark', 150],
      ['spring-onion', 15],
      ['cucumber', 60],
    ],
    'Boil potatoes in their skins, stir quark with spring onion, salt and a splash of water, serve with cucumber.'
  ),
  r(
    'fried-potatoes-egg',
    'Fried potatoes with fried eggs',
    'Bratkartoffeln mit Spiegelei',
    'main',
    30,
    [
      ['potato', 300],
      ['eggs', 120],
      ['onion', 50],
      ['lettuce', 50],
      ['rapeseed-oil', 10],
    ],
    'Fry sliced boiled potatoes and onion until golden, add fried eggs, serve with salad.'
  ),
  r(
    'kaesespaetzle',
    'Cheese spätzle with salad',
    'Käsespätzle mit Salat',
    'main',
    25,
    [
      ['spaetzle', 125],
      ['gouda', 50],
      ['onion', 50],
      ['butter', 10],
      ['lettuce', 50],
    ],
    'Cook spätzle, layer with cheese, top with onions fried in butter, serve with salad.'
  ),
  r(
    'mushroom-spaetzle',
    'Creamy mushroom spätzle',
    'Pilz-Spätzle',
    'main',
    25,
    [
      ['spaetzle', 125],
      ['mushrooms', 150],
      ['cream-cheese', 40],
      ['onion', 50],
      ['parsley', 5],
    ],
    'Fry mushrooms and onion, stir in cream cheese and water to a sauce, toss with spätzle and parsley.'
  ),
  r(
    'bratwurst-sauerkraut',
    'Bratwurst with sauerkraut and mash',
    'Bratwurst mit Sauerkraut und Püree',
    'main',
    35,
    [
      ['bratwurst', 100],
      ['sauerkraut', 150],
      ['potato', 250],
      ['milk', 50],
      ['butter', 10],
    ],
    'Fry the sausage, warm the sauerkraut, mash boiled potatoes with milk and butter.'
  ),
  r(
    'salmon-potatoes',
    'Salmon with potatoes and broccoli',
    'Lachs mit Kartoffeln und Brokkoli',
    'main',
    30,
    [
      ['salmon', 125],
      ['potato', 250],
      ['broccoli', 150],
      ['lemon', 10],
    ],
    'Bake salmon at 200 °C for 15 minutes, serve with boiled potatoes, broccoli and lemon.'
  ),
  r(
    'fish-rice-peas',
    'Pollock with rice and peas',
    'Seelachs mit Reis und Erbsen',
    'main',
    25,
    [
      ['pollock', 150],
      ['rice', 75],
      ['frozen-peas', 100],
      ['lemon', 10],
      ['rapeseed-oil', 5],
    ],
    'Pan-fry the fish, serve with rice, peas and lemon.'
  ),
  r(
    'tuna-pasta',
    'Tuna tomato pasta',
    'Thunfisch-Tomaten-Pasta',
    'main',
    20,
    [
      ['pasta', 125],
      ['tuna', 65],
      ['chopped-tomatoes', 150],
      ['onion', 40],
      ['olive-oil', 5],
    ],
    'Soften onion, add tomatoes and simmer 10 minutes, stir in tuna, toss with pasta.'
  ),
  r(
    'broccoli-feta-pasta',
    'Pasta with broccoli and feta',
    'Pasta mit Brokkoli und Feta',
    'main',
    20,
    [
      ['pasta', 125],
      ['broccoli', 150],
      ['feta', 50],
      ['garlic', 5],
      ['lemon', 10],
      ['olive-oil', 10],
    ],
    'Cook broccoli with the pasta, toss with garlic oil, lemon and crumbled feta.'
  ),
  r(
    'tomato-mozzarella-pasta',
    'Cherry tomato and mozzarella pasta',
    'Pasta mit Kirschtomaten und Mozzarella',
    'main',
    20,
    [
      ['pasta', 125],
      ['cherry-tomato', 150],
      ['mozzarella', 60],
      ['garlic', 5],
      ['olive-oil', 10],
    ],
    'Blister tomatoes with garlic in oil, toss with pasta and torn mozzarella.'
  ),
  r(
    'spinach-pasta',
    'Creamy spinach pasta with hard cheese',
    'Spinat-Pasta mit Hartkäse',
    'main',
    20,
    [
      ['pasta', 125],
      ['frozen-spinach', 150],
      ['cream-cheese', 40],
      ['hard-cheese', 15],
      ['garlic', 5],
    ],
    'Melt spinach with garlic, stir in cream cheese and pasta water, toss with pasta and grated cheese.'
  ),
  r(
    'tofu-stir-fry',
    'Tofu and vegetable stir-fry',
    'Tofu-Gemüse-Pfanne',
    'main',
    25,
    [
      ['tofu', 150],
      ['rice', 75],
      ['bell-pepper', 80],
      ['broccoli', 100],
      ['ginger', 5],
      ['soy-sauce', 15],
      ['rapeseed-oil', 10],
    ],
    'Fry cubed tofu until golden, add vegetables and ginger, finish with soy sauce, serve with rice.'
  ),
  r(
    'peanut-tofu-bowl',
    'Tofu rice bowl with peanut sauce',
    'Tofu-Reis-Bowl mit Erdnusssoße',
    'main',
    25,
    [
      ['tofu', 120],
      ['rice', 75],
      ['cucumber', 80],
      ['carrot', 60],
      ['peanut-butter', 20],
      ['soy-sauce', 10],
    ],
    'Fry tofu, whisk peanut butter with soy sauce and warm water, serve over rice with raw veg.'
  ),
  r(
    'egg-noodles-veg',
    'Egg noodles with vegetables',
    'Mie-Nudeln mit Gemüse',
    'main',
    20,
    [
      ['egg-noodles', 80],
      ['frozen-veg', 200],
      ['eggs', 60],
      ['soy-sauce', 15],
      ['rapeseed-oil', 5],
    ],
    'Stir-fry vegetables, add cooked noodles and a beaten egg, season with soy sauce.'
  ),
  r(
    'egg-fried-rice',
    'Egg fried rice with peas',
    'Gebratener Reis mit Ei und Erbsen',
    'main',
    20,
    [
      ['rice', 75],
      ['eggs', 120],
      ['frozen-peas', 80],
      ['carrot', 60],
      ['spring-onion', 15],
      ['soy-sauce', 10],
      ['rapeseed-oil', 10],
    ],
    'Fry cold cooked rice with carrot and peas, push aside, scramble eggs, mix with soy sauce and spring onion.'
  ),
  r(
    'couscous-salad',
    'Couscous salad with chickpeas',
    'Couscous-Salat mit Kichererbsen',
    'main',
    15,
    [
      ['couscous', 70],
      ['chickpeas', 100],
      ['cucumber', 80],
      ['tomato', 100],
      ['lemon', 15],
      ['parsley', 5],
      ['olive-oil', 10],
    ],
    'Soak couscous in boiling water, mix with chickpeas, diced veg, lemon, oil and parsley.'
  ),
  r(
    'bulgur-salad',
    'Bulgur salad with feta',
    'Bulgursalat mit Feta',
    'main',
    20,
    [
      ['bulgur', 70],
      ['tomato', 100],
      ['cucumber', 80],
      ['parsley', 10],
      ['lemon', 15],
      ['feta', 40],
      ['olive-oil', 10],
    ],
    'Soak bulgur, mix with diced tomato and cucumber, lemon, oil, parsley and feta.'
  ),
  r(
    'greek-salad',
    'Greek salad with bread',
    'Griechischer Salat mit Brot',
    'main',
    15,
    [
      ['lettuce', 50],
      ['tomato', 100],
      ['cucumber', 100],
      ['feta', 60],
      ['onion', 20],
      ['wholegrain-bread', 60],
      ['olive-oil', 10],
    ],
    'Chop the vegetables, top with feta and oil, serve with bread.'
  ),
  r(
    'lentil-soup',
    'Red lentil and vegetable soup',
    'Linsensuppe mit Gemüse',
    'main',
    35,
    [
      ['red-lentils', 70],
      ['potato', 150],
      ['carrot', 80],
      ['leek', 80],
      ['onion', 40],
      ['vegetable-stock', 5],
      ['wholegrain-bread', 45],
    ],
    'Soften onion and leek, add lentils, diced potato, carrot and stock, simmer 20 minutes, serve with bread.'
  ),
  r(
    'potato-soup',
    'Potato and leek soup',
    'Kartoffelsuppe mit Lauch',
    'main',
    35,
    [
      ['potato', 250],
      ['carrot', 80],
      ['leek', 80],
      ['onion', 40],
      ['vegetable-stock', 5],
      ['wholegrain-bread', 45],
    ],
    'Simmer potatoes, carrot, leek and onion in stock for 20 minutes, blend half, serve with bread.'
  ),
  r(
    'tomato-soup',
    'Tomato soup with cheese toast',
    'Tomatensuppe mit Käsebrot',
    'main',
    20,
    [
      ['passata', 300],
      ['onion', 40],
      ['garlic', 5],
      ['wholegrain-bread', 90],
      ['gouda', 30],
      ['olive-oil', 5],
    ],
    'Simmer passata with softened onion and garlic, serve with bread toasted under cheese.'
  ),
  r(
    'sprouts-potatoes-egg',
    'Brussels sprouts, potatoes and fried egg',
    'Rosenkohl mit Kartoffeln und Spiegelei',
    'main',
    30,
    [
      ['brussels-sprouts', 200],
      ['potato', 250],
      ['eggs', 120],
      ['butter', 10],
    ],
    'Boil potatoes and halved sprouts, toss in butter, top with fried eggs.'
  ),
  r(
    'roast-sprouts-sweet-potato',
    'Roast Brussels sprouts, sweet potato and chickpeas',
    'Ofen-Rosenkohl mit Süßkartoffel und Kichererbsen',
    'main',
    40,
    [
      ['brussels-sprouts', 200],
      ['sweet-potato', 250],
      ['chickpeas', 100],
      ['olive-oil', 10],
      ['spices', 2],
    ],
    'Roast halved sprouts, sweet potato cubes and chickpeas with oil and paprika at 200 °C for 30 minutes.'
  ),
  r(
    'shakshuka',
    'Shakshuka with bread',
    'Shakshuka mit Brot',
    'main',
    25,
    [
      ['eggs', 120],
      ['chopped-tomatoes', 200],
      ['bell-pepper', 80],
      ['onion', 50],
      ['spices', 2],
      ['wholegrain-bread', 60],
    ],
    'Simmer pepper, onion, spices and tomatoes, make wells and poach the eggs, serve with bread.'
  ),
  r(
    'veg-omelette',
    'Mushroom and spinach omelette',
    'Omelett mit Pilzen und Spinat',
    'main',
    15,
    [
      ['eggs', 180],
      ['mushrooms', 80],
      ['spinach', 50],
      ['wholegrain-bread', 45],
      ['rapeseed-oil', 5],
    ],
    'Fry mushrooms, wilt spinach, pour over beaten eggs and cook until set, serve with bread.'
  ),
  r(
    'sweet-potato-beans',
    'Baked sweet potato with beans and avocado',
    'Süßkartoffel mit Bohnen und Avocado',
    'main',
    45,
    [
      ['sweet-potato', 300],
      ['kidney-beans', 100],
      ['sweetcorn', 50],
      ['avocado', 50],
      ['lemon', 10],
    ],
    'Bake the sweet potato at 200 °C for 40 minutes, fill with warmed beans, corn and avocado.'
  ),
  r(
    'cabbage-mince',
    'Pointed cabbage and mince pan',
    'Spitzkohl-Hack-Pfanne',
    'main',
    30,
    [
      ['beef-mince', 100],
      ['pointed-cabbage', 250],
      ['potato', 200],
      ['onion', 40],
      ['spices', 2],
    ],
    'Brown mince and onion, add sliced cabbage and cooked potato cubes, fry until tender.'
  ),
  r(
    'cabbage-lentils',
    'Pointed cabbage with lentils and potatoes',
    'Spitzkohl mit Linsen und Kartoffeln',
    'main',
    30,
    [
      ['pointed-cabbage', 250],
      ['red-lentils', 50],
      ['potato', 200],
      ['onion', 40],
      ['vegetable-stock', 5],
    ],
    'Soften onion, add cabbage, lentils, potato and a little stock, simmer covered for 20 minutes.'
  ),
  r(
    'potato-pancakes',
    'Potato pancakes with apple',
    'Kartoffelpuffer mit Apfel',
    'main',
    35,
    [
      ['potato', 250],
      ['eggs', 30],
      ['flour', 15],
      ['apple', 150],
      ['rapeseed-oil', 15],
    ],
    'Grate potatoes, squeeze dry, mix with egg and flour, fry flat cakes, serve with stewed apple.'
  ),
  r(
    'rice-veg-pan',
    'Rice and vegetable pan',
    'Reis-Gemüse-Pfanne',
    'main',
    25,
    [
      ['rice', 75],
      ['zucchini', 100],
      ['bell-pepper', 80],
      ['frozen-peas', 60],
      ['onion', 40],
      ['spices', 2],
      ['olive-oil', 10],
    ],
    'Fry onion, courgette and pepper with paprika, add peas and cooked rice, fry until hot.'
  ),
  r(
    'potato-veg-curry',
    'Potato and pea curry',
    'Kartoffel-Erbsen-Curry',
    'main',
    30,
    [
      ['potato', 250],
      ['frozen-peas', 100],
      ['chopped-tomatoes', 150],
      ['onion', 50],
      ['curry-powder', 3],
      ['rapeseed-oil', 10],
    ],
    'Fry onion and curry powder, add diced potato and tomatoes, simmer 20 minutes, stir in peas.'
  ),
]

export const RECIPES_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((x) => [x.id, x])
)

/** Allergens the recipe contains, from its ingredients. */
export function recipeAllergens(recipe: Recipe): Allergen[] {
  const found = new Set<Allergen>()
  for (const { id } of recipe.ingredients) {
    for (const a of INGREDIENTS[id]?.allergens ?? []) found.add(a)
  }
  return [...found]
}

const NOT_ALLOWED: Record<Diet, AnimalProduct[]> = {
  omnivore: [],
  pescatarian: ['meat'],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'egg', 'honey'],
}

/** Whether every ingredient fits the diet. */
export function fitsDiet(recipe: Recipe, diet: Diet): boolean {
  const banned = NOT_ALLOWED[diet]
  return recipe.ingredients.every(({ id }) => {
    const animal = INGREDIENTS[id]?.animal
    return !animal || !banned.includes(animal)
  })
}

/** Ingredient names (EN and DE) a free-text dislike matches against. */
export function recipeMentions(recipe: Recipe, word: string): boolean {
  const w = word.trim().toLowerCase()
  if (w.length < 3) return false
  const haystack = [
    recipe.name,
    recipe.nameDe,
    ...recipe.ingredients.flatMap(({ id }) => {
      const ing = INGREDIENTS[id]
      return ing ? [ing.name, ing.nameDe] : []
    }),
  ]
  return haystack.some((h) => h.toLowerCase().includes(w))
}
