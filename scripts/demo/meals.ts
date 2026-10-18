import { addDays, at, item, rng, subtractMonths, totals, type Food, type MealItem } from './util'

type Slot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface DemoMeal {
  slot: Slot
  eatenAt: string
  items: MealItem[]
  favourite?: boolean
}

const OATS: Food = ['Overnight oats with berries', 300, 340, 12, 9, 50]
const LENTIL_SOUP: Food = ['Lentil soup', 350, 280, 18, 4, 40]
const BREAD_ROLL: Food = ['Bread roll', 50, 140, 4, 1, 27]
const APPLE: Food = ['Apple', 180, 95, 0.5, 0.3, 23]
const ALMONDS: Food = ['Almonds', 30, 180, 6, 15, 2]

const POOL: Record<Slot, Food[][]> = {
  breakfast: [
    [OATS],
    [['Porridge with banana', 300, 310, 10, 6, 54]],
    [['Scrambled eggs on toast', 200, 310, 18, 16, 28]],
    [['Yoghurt with muesli', 250, 290, 12, 8, 42]],
    [['Wholegrain bread with cheese', 150, 330, 15, 14, 32]],
    [['Quark with berries', 250, 240, 24, 4, 26]],
    [['Avocado toast', 180, 320, 8, 18, 30]],
  ],
  lunch: [
    [LENTIL_SOUP, BREAD_ROLL],
    [['Falafel wrap', 300, 480, 15, 20, 55]],
    [['Greek salad', 250, 220, 8, 16, 8], ['Bread', 50, 140, 4, 1, 27]],
    [['Chicken döner', 350, 560, 32, 22, 52], ['Mixed salad', 80, 15, 1, 0, 3]],
    [['Tomato soup', 300, 180, 4, 6, 24], BREAD_ROLL],
    [['Couscous salad with chickpeas', 300, 420, 13, 14, 58]],
    [['Hummus veggie wrap', 280, 430, 14, 16, 56]],
  ],
  dinner: [
    [['Spaghetti bolognese', 400, 520, 28, 18, 55]],
    [['Chicken curry with rice', 450, 580, 35, 16, 65]],
    [['Bean chilli with rice', 400, 450, 22, 8, 68]],
    [['Egg fried rice with vegetables', 400, 420, 16, 14, 55]],
    [['Oven veg with feta', 400, 380, 14, 20, 32]],
    [['Potato soup', 400, 320, 8, 12, 42]],
    [['Käsespätzle with salad', 400, 620, 24, 26, 70]],
    [['Salmon with potatoes and broccoli', 420, 540, 34, 22, 46]],
    [['Tofu stir-fry', 400, 430, 22, 16, 48]],
    [['Shakshuka with bread', 350, 460, 20, 22, 40]],
  ],
  snack: [
    [APPLE, ALMONDS],
    [['Banana', 120, 105, 1.3, 0.4, 27]],
    [['Carrot sticks with hummus', 150, 160, 5, 9, 15]],
    [['Dark chocolate', 20, 110, 2, 8, 9]],
    [['Greek yoghurt', 150, 145, 15, 7, 6]],
  ],
}

const HOURS: Record<Slot, number> = { breakfast: 6, lunch: 11, dinner: 17, snack: 14 }

/** The last week, hand-written to match the chat history. */
function recentWeek(today: string): DemoMeal[] {
  const m = (daysBack: number, slot: Slot, foods: Food[], favourite = false): DemoMeal => ({
    slot,
    eatenAt: at(addDays(today, -daysBack), HOURS[slot]),
    items: foods.map(item),
    favourite,
  })
  return [
    m(6, 'breakfast', [['Scrambled eggs', 150, 220, 15, 16, 2], ['Toast', 60, 155, 5, 2, 28]]),
    m(6, 'lunch', [['Chicken döner', 350, 560, 32, 22, 52], ['Mixed salad', 80, 15, 1, 0, 3]]),
    m(6, 'dinner', [['Spaghetti bolognese', 400, 520, 28, 18, 55]]),
    m(5, 'breakfast', [['Porridge with banana', 300, 310, 10, 6, 54]]),
    m(5, 'lunch', [LENTIL_SOUP, BREAD_ROLL], true),
    m(5, 'dinner', [['Chicken curry with rice', 450, 580, 35, 16, 65]]),
    m(4, 'breakfast', [['Yoghurt with muesli', 250, 290, 12, 8, 42]]),
    m(4, 'lunch', [['Cheese sandwich', 180, 380, 16, 18, 35]]),
    m(4, 'snack', [APPLE, ALMONDS]),
    m(4, 'dinner', [['Bean chilli with rice', 400, 450, 22, 8, 68]]),
    m(3, 'breakfast', [OATS]),
    m(3, 'lunch', [['Falafel wrap', 300, 480, 15, 20, 55]]),
    m(3, 'snack', [APPLE, ALMONDS], true),
    m(3, 'dinner', [['Egg fried rice with vegetables', 400, 420, 16, 14, 55]]),
    m(2, 'breakfast', [['Bread with cheese and tomato', 200, 340, 14, 16, 30]]),
    m(2, 'lunch', [['Greek salad', 250, 220, 8, 16, 8], ['Bread', 50, 140, 4, 1, 27]]),
    m(2, 'dinner', [['Oven veg with feta', 400, 380, 14, 20, 32]], true),
    m(1, 'breakfast', [['Scrambled eggs on toast', 200, 310, 18, 16, 28]]),
    m(1, 'lunch', [['Tomato soup', 300, 180, 4, 6, 24], BREAD_ROLL]),
    m(1, 'dinner', [['Potato soup', 400, 320, 8, 12, 42]]),
    m(0, 'breakfast', [OATS], true),
  ]
}

/**
 * About six months of history before the hand-written week, plus a meal a year
 * ago. The last five weeks are logged every day (a visible streak); before that
 * roughly one day in eight is skipped so the month view has gaps. The dates
 * "On This Day" looks at (1, 3, 6 and 12 months ago) always get a favourite.
 */
function history(today: string): DemoMeal[] {
  const rand = rng(20261018)
  const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)]!
  const anchors = new Set([1, 3, 6, 12].map((n) => subtractMonths(today, n)))
  const meals: DemoMeal[] = []

  const day = (date: string, forceFull: boolean) => {
    const isAnchor = anchors.has(date)
    const add = (slot: Slot, favourite = false) =>
      meals.push({
        slot,
        eatenAt: at(date, HOURS[slot] + Math.floor(rand() * 2)),
        items: pick(POOL[slot]).map(item),
        favourite,
      })
    add('breakfast')
    if (forceFull || rand() > 0.12) add('lunch')
    if (forceFull || rand() > 0.05) add('dinner', isAnchor)
    if (rand() < 0.45) add('snack')
  }

  for (let d = 7; d <= 190; d++) {
    const date = addDays(today, -d)
    const isAnchor = anchors.has(date)
    if (d > 35 && !isAnchor && rand() < 0.12) continue
    day(date, isAnchor)
  }
  day(subtractMonths(today, 12), true)
  return meals
}

export function buildMealRows(userId: string, today: string) {
  const meals = [...history(today), ...recentWeek(today)]
  const rows = meals.map((m) => ({
    user_id: userId,
    eaten_at: m.eatenAt,
    meal_slot: m.slot,
    items: m.items,
    totals: totals(m.items),
    partial: [],
    source: 'text',
    is_estimate: true,
    is_favourite: m.favourite ?? false,
    created_at: m.eatenAt,
  }))
  const days = new Set(meals.map((m) => m.eatenAt.slice(0, 10))).size
  return { rows, days }
}

export function lastWeekStats(today: string) {
  const week = recentWeek(today)
  return { meals: week.length, days: new Set(week.map((m) => m.eatenAt.slice(0, 10))).size }
}
