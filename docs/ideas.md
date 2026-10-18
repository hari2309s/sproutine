# Feature Ideas

## Meal Intelligence

- **Meal suggestions** — "what should I eat for dinner?" based on what you've logged today (fill nutrient gaps from daily goals)
- **Recipe scaling** — paste a recipe URL or photo, Rosie extracts ingredients and logs them at your portion size
- **Restaurant mode** — search by restaurant name, pull common menu items from Open Food Facts
- **Meal plan execution** — the `meal_plans` table exists but there's no UI to browse/follow a plan day by day
- **Smart portion learning** — Rosie learns your typical portions over time ("you always eat ~150 g rice") and pre-fills your personal default instead of the generic one
- **Grocery list** — generate a shopping list from the week's meal plan or from frequently logged foods, grouped by supermarket aisle
- **Nutrition label scan** — point the camera at a Nährwerttabelle or nutrition facts panel, OCR the macros, and create a food entry on the spot
- **Leftover tracker** — "I ate half of yesterday's Linseneintopf" — Rosie pulls the original log and halves it

## Personalisation & AI

- **Conversation memory** — Rosie remembers long-term preferences ("I'm vegetarian", "I don't like Pilze") across sessions and uses them when suggesting meals or parsing ambiguous input
- **Nutrient insights** — proactive nudges: "you've been under 60 % of your protein goal three days in a row — here are some easy options"
- **Meal timing insights** — visualise when you typically eat; flag long gaps or late-night snacking patterns
- **Rosie personality tuning** — slider from "coach" (direct, numbers-forward) to "friend" (warm, qualitative) — adjusts tone without changing safety rules

## Tracking & Health

- **Micronutrient dashboard** — expand beyond macros: fibre, iron, vitamin C, sodium, etc. sourced from BLS/USDA data that already has them
- **Intermittent fasting timer** — track eating windows, show time since last meal and countdown to next window
- **Sleep & energy log** — lightweight morning check-in ("how'd you sleep? how's your energy?") to correlate with yesterday's food
- **Mood tagging** — optional emoji tag per meal; over time, surface correlations ("you tend to feel better on higher-protein days")
- **Cycle-aware insights** — opt-in menstrual cycle phase tracking; surface iron/magnesium needs and cravings context without being prescriptive
- **Hydration beyond water** — log tea, coffee, juice; apply a hydration coefficient (coffee ≈ 0.8×) toward the daily water goal

## Social & Motivation

- **Buddy system** — invite a friend, see each other's streaks (not food details — privacy first)
- **Challenges** — "5 servings of vegetables this week", "drink 2 L water for 7 days straight"
- **Achievement badges** — first meal logged, 7-day streak, 100 meals, tried 50 different foods
- **Variety score** — track how many distinct foods you eat per week; gamify eating the rainbow
- **Monthly recap** — animated year-in-review style summary: top foods, longest streak, litres of water, Rosie's highlight quote
- **Household mode** — family account where a parent can log meals for kids from the same kitchen

## Quality of Life

- **Multi-meal photo logging** — snap your plate, Rosie identifies foods visually (Gemini vision is already wired)
- **Siri / Shortcuts integration** — "Hey Siri, log my lunch" using App Intents or Shortcuts URL scheme
- **Widget** — iOS/Android home screen widget showing today's kcal and water progress (PWA limitation — may need a thin native wrapper)
- **Recurring meals** — "I eat this every Monday" — auto-suggest or auto-log at the right slot
- **Undo last action** — global undo toast (not just water long-press, but any log/delete)
- **Offline mode** — service worker queues logs when offline, syncs when back; critical for spotty mobile data
- **Meal templates** — save a combination as a named template ("My usual Frühstück") and re-log it in one tap, separate from favourites
- **Multi-language food logging** — log in any language, not just EN/DE; translate to the BLS/OFF lookup language under the hood
- **Dark mode share cards** — match the generated share image to the user's active theme
- **Drag-to-reorder meals** — move a log from Snack to Lunch if you picked the wrong slot
- **Notification reminders** — configurable nudge ("Have you logged lunch?") if no meal is logged by a certain hour; push infra is already wired

## Data & Export

- **PDF report** — styled weekly report with charts, shareable with a nutritionist
- **Apple Health / Google Fit sync** — write nutrition and water data to platform health APIs
- **Nutritionist handoff** — generate a read-only link a professional can view
- **Calendar integration** — export meals as calendar events; plan ahead by adding foods to a future date
- **Import from other apps** — CSV/JSON importer for MyFitnessPal, Yazio, or Lifesum exports so switchers keep their history

## Integrations

- **Telegram / WhatsApp bot** — log meals via messaging app; Rosie responds in the chat
- **Supermarket API** — pull current offers from REWE/Edeka/Lidl, highlight nutritious items on sale, link to the meal plan
- **Lieferdienst pairing** — "order this meal plan from Flink/Gorillas" with a pre-filled cart (affiliate-friendly)
