import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@truffle/db'
import { getCurrentPeriod, computeStreak } from '@/lib/habits'
import { sendHabitStreakNudge, sendHabitCheckInNudge } from '@/lib/proactive-nudge'
import { requireUser } from '@/lib/supabase-server'
import { recomputeSnapshot } from '@/lib/server-db'
import { sanitizeForLog } from '@/lib/log'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const db = createServerClient()

    const { data: habits, error } = await db
      .from('savings_habits')
      .select('id, user_id, name, amount, frequency, emoji, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) throw error

    if (!habits || habits.length === 0) {
      return NextResponse.json({ habits: [] })
    }

    // Fetch all contributions for these habits
    const habitIds = habits.map((h) => h.id)
    const { data: contributions } = await db
      .from('habit_contributions')
      .select('habit_id, period, amount')
      .in('habit_id', habitIds)
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(500)

    const contribMap: Record<string, string[]> = {}
    const totalMap: Record<string, number> = {}
    for (const c of contributions ?? []) {
      if (!contribMap[c.habit_id]) contribMap[c.habit_id] = []
      contribMap[c.habit_id]!.push(c.period)
      totalMap[c.habit_id] = (totalMap[c.habit_id] ?? 0) + Number(c.amount)
    }

    const habitsWithStats = habits.map((h) => {
      const frequency = h.frequency as 'weekly' | 'monthly'
      const periods = contribMap[h.id] ?? []
      const currentPeriod = getCurrentPeriod(frequency)
      return {
        id: h.id,
        userId: h.user_id,
        name: h.name,
        amount: Number(h.amount),
        frequency,
        emoji: h.emoji,
        isActive: h.is_active,
        createdAt: h.created_at,
        streak: computeStreak(frequency, periods),
        currentPeriodLogged: periods.includes(currentPeriod),
        totalSaved: totalMap[h.id] ?? 0,
      }
    })

    // Send check-in reminders for habits not logged past the period midpoint
    const today = new Date()
    const dayOfWeek = today.getDay() || 7 // ISO: Mon=1 … Sun=7
    const dayOfMonth = today.getDate()
    for (const h of habitsWithStats) {
      if (h.currentPeriodLogged) continue
      const pastMidpoint = h.frequency === 'weekly' ? dayOfWeek >= 4 : dayOfMonth >= 15
      if (!pastMidpoint) continue
      void sendHabitCheckInNudge({
        userId,
        habitId: h.id,
        habitName: h.name,
        habitEmoji: h.emoji,
        frequency: h.frequency,
        amount: h.amount,
        period: getCurrentPeriod(h.frequency),
        lastStreak: h.streak,
      }).catch((e) => console.error(`Habit check-in nudge failed for "${h.name}":`, e))
    }

    return NextResponse.json({ habits: habitsWithStats })
  } catch (error) {
    console.error('GET habits error:', error)
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const { name, amount, frequency, emoji } = await request.json()
    if (!name || !amount || !frequency) {
      return NextResponse.json({ error: 'name, amount, frequency required' }, { status: 400 })
    }
    if (typeof name !== 'string' || name.length > 200) {
      return NextResponse.json(
        { error: 'name must be a string under 200 characters' },
        { status: 400 }
      )
    }
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount) || amount > 1_000_000) {
      return NextResponse.json(
        { error: 'amount must be a positive finite number up to 1,000,000' },
        { status: 400 }
      )
    }
    if (!['weekly', 'monthly'].includes(frequency)) {
      return NextResponse.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
    }
    if (emoji !== undefined && (typeof emoji !== 'string' || emoji.length > 20)) {
      return NextResponse.json(
        { error: 'emoji must be a string under 20 characters' },
        { status: 400 }
      )
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('savings_habits')
      .insert({
        user_id: userId,
        name,
        amount,
        frequency,
        emoji: emoji ?? '💰',
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ habit: data })
  } catch (error) {
    console.error('POST habits error:', error)
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const { habitId, period, amount, currency = 'EUR' } = await request.json()
    if (
      typeof habitId !== 'string' ||
      !habitId ||
      typeof period !== 'string' ||
      !period ||
      amount === undefined
    ) {
      return NextResponse.json({ error: 'habitId, period, amount required' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount) || amount > 1_000_000) {
      return NextResponse.json(
        { error: 'amount must be a positive finite number up to 1,000,000' },
        { status: 400 }
      )
    }

    const VALID_CURRENCIES = ['EUR', 'GBP', 'USD'] as const
    type ValidCurrency = (typeof VALID_CURRENCIES)[number]
    if (!VALID_CURRENCIES.includes(currency as ValidCurrency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    const PERIOD_RE = /^[1-9]\d{3}-(0[1-9]|1[0-2])$|^[1-9]\d{3}-W(0[1-9]|[1-4]\d|5[0-3])$/
    if (typeof period !== 'string' || !PERIOD_RE.test(period)) {
      return NextResponse.json({ error: 'Invalid period format' }, { status: 400 })
    }
    // W53 is only valid in ISO years where Jan 1 falls on Thursday,
    // or on Wednesday in a leap year.
    const w53Match = period.match(/^(\d{4})-W53$/)
    if (w53Match && w53Match[1]) {
      const y = parseInt(w53Match[1], 10)
      const jan1Day = new Date(Date.UTC(y, 0, 1)).getUTCDay()
      const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
      if (jan1Day !== 4 && !(isLeap && jan1Day === 3)) {
        return NextResponse.json(
          { error: 'Invalid period: W53 does not exist in this year' },
          { status: 400 }
        )
      }
    }

    const db = createServerClient()
    // Verify the habit belongs to this user before mutating (service-role
    // client bypasses RLS, so we must enforce ownership explicitly).
    // Fetch name/emoji/frequency here too to avoid a second round-trip later.
    const { data: habit, error: habitFetchError } = await db
      .from('savings_habits')
      .select('id, name, emoji, frequency')
      .eq('id', habitId)
      .eq('user_id', userId)
      .maybeSingle()

    if (habitFetchError) throw habitFetchError
    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }

    // ignoreDuplicates: true maps to ON CONFLICT DO NOTHING.
    // data will be null when this period was already logged — a safe idempotent no-op.
    // data will also be null (with error === null) on a genuine duplicate conflict,
    // which is the only non-error path that produces null — so null === alreadyLogged is correct.
    const { data, error } = await db
      .from('habit_contributions')
      .upsert(
        { habit_id: habitId, user_id: userId, period, amount },
        { onConflict: 'habit_id,period', ignoreDuplicates: true }
      )
      .select()
      .maybeSingle()

    if (error) throw error

    const isNewContribution = data !== null
    // Already logged this period — return success without inserting a duplicate transaction
    if (!isNewContribution) {
      return NextResponse.json({ contribution: null, alreadyLogged: true })
    }

    const STREAK_MILESTONES = [3, 5, 7, 10, 15, 20, 30, 50, 100]
    const today = new Date().toISOString().slice(0, 10)

    // Insert savings transaction — must be outside the streak try/catch so a
    // failure propagates as a 500 rather than being silently swallowed.
    const { error: txError } = await db.from('transactions').insert({
      user_id: userId,
      amount: -amount,
      currency,
      description: `Savings — ${habit.name}`,
      category: 'savings',
      date: today,
      is_recurring: true,
    })
    if (txError) {
      // Roll back the contribution so the user can retry cleanly.
      // Limit 1 to ensure we touch exactly one row (unique constraint on habit_id+period).
      const { error: rollbackError } = await db
        .from('habit_contributions')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('period', period)
        .limit(1)
      if (rollbackError) {
        console.error('Critical: habit contribution rollback failed:', rollbackError)
      }
      throw txError
    }

    // Recompute monthly snapshot so balance reflects the deduction (non-fatal)
    try {
      await recomputeSnapshot(userId, db)
    } catch (e) {
      console.error('Snapshot recompute failed (non-fatal):', e)
    }

    // Streak milestone check — non-fatal; errors must not block the response
    try {
      const { data: allContribs } = await db
        .from('habit_contributions')
        .select('period')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .order('logged_at', { ascending: false })
        .limit(500)

      if (allContribs) {
        const frequency = habit.frequency as 'weekly' | 'monthly'
        const periods = allContribs.map((c) => c.period as string)
        const streak = computeStreak(frequency, periods)
        if (STREAK_MILESTONES.includes(streak)) {
          void sendHabitStreakNudge({
            userId,
            habitId,
            habitName: habit.name,
            habitEmoji: habit.emoji,
            streak,
          }).catch((e) =>
            console.error(`Habit streak nudge failed for habit ${sanitizeForLog(habitId)}:`, e)
          )
        }
      }
    } catch (e) {
      console.error(`Habit streak calculation failed for habit ${sanitizeForLog(habitId)}:`, e)
    }

    return NextResponse.json({ contribution: data })
  } catch (error) {
    console.error('PATCH habits error:', error)
    return NextResponse.json({ error: 'Failed to log contribution' }, { status: 500 })
  }
}
