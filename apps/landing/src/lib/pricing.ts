// Single place to change prices: the pricing cards and FAQ read from here.
const MONTHLY = 5.99
const YEARLY = 39.99

const euro = (n: number) => `€${n.toFixed(2)}`

export const PRICES = {
  monthly: { price: euro(MONTHLY), per: '/ month', note: 'Billed monthly' },
  yearly: {
    price: euro(YEARLY),
    per: '/ year',
    note: `About ${euro(YEARLY / 12)} a month, billed yearly`,
  },
  yearlySaving: Math.round((1 - YEARLY / (MONTHLY * 12)) * 100),
}

export const PLAN_FREE = [
  'Search and barcode logging',
  'Today, water, streaks and favourites',
  'Nutrient goals, rings and weight',
  'Calendar, meal planner and shopping list',
  'Weekly review, CSV reports, calendar export',
  'Gentle mode and every safety feature',
]

export const PLAN_PRO = [
  'Everything in Free',
  'Chat with Rosie',
  'Voice logging, hold to talk',
  'Photo logging',
  'Plan meals from free text',
]
