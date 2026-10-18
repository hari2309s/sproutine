import { isoWeek } from '../../packages/nudges/src/time'
import { addDays, at, mondayOf } from './util'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

/** A week of conversation that walks through logging, Q&A, planning and habits. */
export function buildMessages(today: string): Message[] {
  const t = (daysBack: number, hour: number) => at(addDays(today, -daysBack), hour)
  const pair = (daysBack: number, hour: number, user: string, rosie: string): Message[] => [
    { role: 'user', content: user, created_at: t(daysBack, hour) },
    { role: 'assistant', content: rosie, created_at: t(daysBack, hour) },
  ]

  return [
    ...pair(
      7,
      8,
      'Hey Rosie!',
      "Hi Hari! Welcome to Sproutine. I'm Rosie, your food companion. Tell me what you ate, ask me anything about nutrition, or say \"plan my week\" and I'll sort your meals and shopping list. What sounds good?"
    ),
    ...pair(
      6,
      7,
      'I had scrambled eggs on toast with a coffee for breakfast',
      "Great start to the day. Scrambled eggs on toast gives you a solid hit of protein and slow-release carbs. I've logged it as breakfast."
    ),
    ...pair(
      6,
      12,
      'For lunch I had a chicken döner with salad from the place around the corner',
      'Logged as lunch. A döner with salad is a decent mix of protein, carbs and veg. The salad is a nice addition — a lot of people skip it!'
    ),
    ...pair(
      5,
      11,
      'How much protein should I actually be eating?',
      "According to EFSA, adults need about 0.83 g of protein per kilogram of body weight per day. If you're fairly active, 1.0–1.2 g/kg is a good range. Good everyday sources: eggs, Greek yoghurt, chicken, fish, lentils, and tofu. You're getting a decent amount from what you've been eating."
    ),
    ...pair(
      5,
      13,
      'Is it true I should drink 8 glasses of water a day?',
      'The EFSA recommendation is about 2.5 litres per day for men from all beverages and food combined. That includes tea and coffee too. Dark urine, headaches and fatigue can be signs you need more. The "8 glasses" thing is a rough guideline — listen to your thirst and check your urine colour.'
    ),
    ...pair(
      4,
      17,
      "Plan my week please, quick meals, I'm on a budget",
      `I planned your week of ${mondayOf(today)}. Dinners: lentil soup, spaghetti bolognese, chicken curry, bean chilli, egg fried rice, oven veg with feta, potato soup. Your shopping list is in the Week tab, sorted by aisle.`
    ),
    ...pair(
      3,
      19,
      'Lentil soup was great, I also had an apple and some almonds as a snack',
      'Nice one. Apple and almonds is a solid snack — fibre from the apple and healthy fats from the almonds keep you going. Logged the snack.'
    ),
    ...pair(
      2,
      9,
      'I want to build a habit of eating more vegetables',
      "That's a great goal. You can track it on the Today screen — tap the + next to Habits and add a daily habit like \"Eat 5 portions of veg\". You'll see your streak build up over time. Small and consistent beats big and sporadic."
    ),
    ...pair(
      1,
      10,
      'Should I take vitamin D in winter? I live in Berlin',
      'In Northern Europe, skin synthesis of vitamin D is limited from October to March, so EFSA recommends a supplement of 10–20 µg per day during winter. Oily fish, egg yolks and fortified foods help too, but a supplement is the most reliable way to cover it in Berlin winters.'
    ),
    ...pair(
      1,
      13,
      "What about omega-3? I don't eat much fish",
      "EFSA recommends 250 mg of EPA+DHA per day. Since you don't eat much fish, flaxseed, chia seeds and walnuts give you ALA (a plant omega-3), but ALA converts poorly to EPA/DHA. An algae-based supplement is the most effective plant option — it gives you DHA/EPA directly, same as fish oil but without the fish."
    ),
    ...pair(
      1,
      18,
      'Can I see how my month went?',
      'Open the Week tab and switch to Month. Each day you logged gets a green dot, a blue dot when you hit your water goal, and an amber one when you hit your nutrient goals. Tap any day to see what you ate and copy it to today.'
    ),
    ...pair(
      0,
      6,
      'Morning! I had overnight oats with berries and a green tea',
      'Good morning Hari! Overnight oats with berries is a brilliant start — oats keep your energy steady and berries are packed with antioxidants. Green tea is a nice touch too. Logged as breakfast.'
    ),
  ]
}

export function weeklyNudge(today: string, meals: number, days: number) {
  return {
    role: 'assistant',
    content: `Hi Hari! Your week in a sentence: you logged ${meals} meals on ${days} days and kept up "Drink 2L water". Nice work. Anything you'd like to do differently next week?`,
    is_proactive: true,
    nudge_key: `weekly:${isoWeek(today)}`,
    created_at: at(today, 17),
  }
}
