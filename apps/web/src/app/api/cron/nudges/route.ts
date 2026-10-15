import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, writeNudge, listHabits } from '@sproutine/db'
import { dueNudges, localTime, computeStreak, mondayOf, addDays, type NudgeContext } from '@sproutine/nudges'
import { pushToUser } from '@/lib/pushServer'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Hourly nudge scheduler. Call via Vercel cron or an external scheduler with
 * `Authorization: Bearer <CRON_SECRET>`. For each active user whose local time
 * is not in quiet hours, it checks which nudges are due, writes them to chat
 * (idempotent via nudge_key), and sends a push notification.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 })

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const now = new Date()

  // Fetch all active profiles (onboarded users with a timezone).
  const { data: profiles, error } = await db
    .from('profiles')
    .select('user_id, display_name, timezone, safety_mode')
    .not('display_name', 'is', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  for (const profile of profiles) {
    try {
      const userId = profile.user_id as string
      const tz = (profile.timezone as string) || 'Europe/Berlin'
      const name = (profile.display_name as string) || ''
      const safetyMode = profile.safety_mode as boolean

      const t = localTime(now, tz)

      // Gather context for this person.
      const [logsResult, plansResult, habits, sentResult] = await Promise.all([
        db
          .from('meal_logs')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', `${addDays(t.date, -7)}T00:00:00`)
          .limit(100),
        db
          .from('meal_plans')
          .select('id')
          .eq('user_id', userId)
          .eq('week_start', mondayOf(addDays(t.date, 7)))
          .eq('status', 'active')
          .limit(1),
        listHabits(db, userId),
        db
          .from('chat_messages')
          .select('nudge_key')
          .eq('user_id', userId)
          .not('nudge_key', 'is', null)
          .limit(200),
      ])

      const logs = logsResult.data ?? []
      const logDates = new Set(logs.map((l) => (l.created_at as string).slice(0, 10)))
      const loggedToday = logDates.has(t.date)
      const daysLoggedThisWeek = logDates.size
      const mealsLoggedThisWeek = logs.length
      const hasPlanNextWeek = !!(plansResult.data?.length)
      const sentKeys = new Set((sentResult.data ?? []).map((r) => r.nudge_key as string))

      const checkedThisWeek = habits
        .filter((h) => {
          const streak = computeStreak(h.period, h.checkins, t.date)
          return streak > 0
        })
        .map((h) => h.title)

      const ctx: NudgeContext = {
        now,
        timeZone: tz,
        safetyMode,
        name,
        loggedToday,
        daysLoggedThisWeek,
        mealsLoggedThisWeek,
        hasPlanNextWeek,
        habitsKeptThisWeek: checkedThisWeek,
        sentKeys,
      }

      const nudges = dueNudges(ctx)
      for (const nudge of nudges) {
        const isNew = await writeNudge(db, userId, nudge)
        if (isNew) {
          totalSent++
          await pushToUser(db, userId, t.date, {
            title: 'Rosie',
            body: nudge.text,
            url: '/chat',
          })
        }
      }
    } catch (e) {
      console.warn('[cron/nudges] user error:', (e as Error).message)
    }
  }

  return NextResponse.json({ sent: totalSent })
}
