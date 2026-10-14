import { addDays, isoWeek, isQuietHour, localTime } from './time'

// Time-driven nudges, decided in code with fixed wording. The scheduler runs
// hourly; each nudge has a key that is unique per person (chat_messages
// nudge_key), so a nudge is sent at most once however often the run repeats.
// In gentle mode nothing mentions amounts, calories or missed meals.

export interface NudgeContext {
  now: Date
  timeZone: string
  safetyMode: boolean
  /** First name, for a warmer line; may be empty. */
  name: string
  /** At least one meal logged today (local date). */
  loggedToday: boolean
  /** Distinct days with a meal log in the last seven days, today included. */
  daysLoggedThisWeek: number
  /** Meals logged in the last seven days. */
  mealsLoggedThisWeek: number
  /** An active plan exists for next week (Monday after this one). */
  hasPlanNextWeek: boolean
  /** Habits checked off at least once this week, by title. */
  habitsKeptThisWeek: string[]
  /** Nudge keys already sent to this person. */
  sentKeys: ReadonlySet<string>
}

export type NudgeKind = 'nolog' | 'weekly' | 'plan-reminder' | 'streak' | 'first'

export interface Nudge {
  key: string
  kind: NudgeKind
  text: string
}

const hi = (name: string) => (name ? `Hi ${name}! ` : 'Hi! ')

/** The time-driven nudges due right now, in send order. */
export function dueNudges(ctx: NudgeContext): Nudge[] {
  const t = localTime(ctx.now, ctx.timeZone)
  if (isQuietHour(t.hour)) return []
  const out: Nudge[] = []
  const add = (n: Nudge) => {
    if (!ctx.sentKeys.has(n.key)) out.push(n)
  }

  // No log by 14:00. Never in gentle mode: it would point at a missed meal.
  if (!ctx.safetyMode && t.hour >= 14 && !ctx.loggedToday) {
    add({
      key: `nolog:${t.date}`,
      kind: 'nolog',
      text: `${hi(ctx.name)}What's been on your plate today? A quick note or a voice message is plenty, and I'll log it.`,
    })
  }

  // Weekly review: Sunday from 18:00. Stats are counted in code; gentle mode
  // gets a check-in without any numbers.
  if (t.weekday === 6 && t.hour >= 18) {
    add({
      key: `weekly:${isoWeek(t.date)}`,
      kind: 'weekly',
      text: ctx.safetyMode ? gentleWeekly(ctx) : weeklyReview(ctx),
    })
  }

  // Saturday: next week has no plan yet.
  if (t.weekday === 5 && t.hour >= 10 && !ctx.hasPlanNextWeek) {
    add({
      key: `plan-reminder:${isoWeek(addDays(t.date, 2))}`,
      kind: 'plan-reminder',
      text: `${hi(ctx.name)}Shall I plan next week for you? Say "plan my week", or tap Week, and I'll put together meals and a shopping list.`,
    })
  }
  return out
}

function weeklyReview(ctx: NudgeContext): string {
  const parts: string[] = []
  if (ctx.mealsLoggedThisWeek > 0) {
    parts.push(
      `you logged ${ctx.mealsLoggedThisWeek} ${ctx.mealsLoggedThisWeek === 1 ? 'meal' : 'meals'} on ${ctx.daysLoggedThisWeek} ${ctx.daysLoggedThisWeek === 1 ? 'day' : 'days'}`
    )
  }
  if (ctx.habitsKeptThisWeek.length) parts.push(`kept up ${listOf(ctx.habitsKeptThisWeek)}`)
  if (!parts.length) {
    return `${hi(ctx.name)}A new week starts tomorrow. Want to plan it together, or start with one small habit?`
  }
  return `${hi(ctx.name)}Your week in a sentence: ${parts.join(' and ')}. Nice work. Anything you'd like to do differently next week?`
}

function gentleWeekly(ctx: NudgeContext): string {
  return `${hi(ctx.name)}Another week done. What did you enjoy eating this week? I'm here whenever you want to chat.`
}

function listOf(items: string[]): string {
  const xs = items.slice(0, 3).map((x) => `"${x}"`)
  return xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`
}

// ─── Event-driven nudges (sent where the event happens) ──────────────────────

export function streakNudge(
  habit: { id: string; title: string; period: 'daily' | 'weekly' },
  milestone: number,
  safetyMode: boolean
): Nudge {
  const unit = habit.period === 'daily' ? 'days' : 'weeks'
  return {
    key: `habit-streak:${habit.id}:${milestone}`,
    kind: 'streak',
    // Gentle mode: a streak of a non-food habit is fine, but no counting.
    text: safetyMode
      ? `You've been keeping up "${habit.title}". That's lovely to see.`
      : `${milestone} ${unit} in a row of "${habit.title}"! Small routines add up.`,
  }
}

export function firstBarcodeNudge(): Nudge {
  return {
    key: 'first:barcode',
    kind: 'first',
    text: 'Your first scan! Packaged food is quickest that way: point, check the amount, save.',
  }
}
