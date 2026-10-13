import { TRANSACTION_CATEGORIES } from '@truffle/types'

// Optimized via `weco run` against packages/ai/evals/categorize-eval.ts.
// This is the only guidance the LLM gets for picking a transaction's category,
// in both production (chatSystemPrompt.ts) and the eval harness — keep it as
// a single exported string so the two stay in sync.
export const CATEGORY_GUIDANCE = `Choose the most appropriate category from: ${TRANSACTION_CATEGORIES.join(', ')}.
Rules:
- 'health': Gyms, fitness memberships (e.g., Urban Sports Club), and medical costs.
- 'utilities': Electricity, water, and mandatory public service fees (e.g., Rundfunkbeitrag).
- 'food_delivery': Takeout, delivery apps, street food, and coffee shop/café orders (e.g., Döner, flat white, coffee and a croissant) — regardless of who it's with.
- 'entertainment': A planned sit-down meal out (e.g., dinner, brunch) or a leisure venue (e.g., cinema, theater, concert). A quick coffee/café stop is always 'food_delivery', never 'entertainment'.
- 'food_groceries': Supermarkets, grocery stores, and bakeries (bread, pastries — even for breakfast).
- 'subscriptions': Recurring digital/media services; do not use for gyms or mandatory public fees.`
