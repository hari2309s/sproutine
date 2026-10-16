import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient, getProfile } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import type { Nutrients } from '@sproutine/food'

export const runtime = 'nodejs'

const Query = z.object({
  range: z.enum(['week', 'month']),
  format: z.enum(['csv']),
})

interface MealLogRow {
  id: string
  meal_slot: string
  items: { name: string; grams: number }[]
  totals: Nutrients
  eaten_at: string
}

/** Generate a CSV nutrition report for the last week or month. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const params = Query.safeParse({
      range: request.nextUrl.searchParams.get('range'),
      format: request.nextUrl.searchParams.get('format') ?? 'csv',
    })
    if (!params.success)
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })

    const db = createServerClient()
    const profile = await getProfile(db, user.id)

    const days = params.data.range === 'week' ? 7 : 30
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const { data, error } = await db
      .from('meal_logs')
      .select('id, meal_slot, items, totals, eaten_at')
      .eq('user_id', user.id)
      .gte('eaten_at', since)
      .order('eaten_at', { ascending: true })
      .limit(1000)

    if (error) throw new Error(error.message)

    const meals = (data ?? []) as MealLogRow[]

    // Build CSV
    const rows = [['Date', 'Meal', 'Foods', 'kcal', 'Protein (g)', 'Carbs (g)', 'Fat (g)']]
    for (const m of meals) {
      const date = new Date(m.eaten_at).toLocaleDateString(
        profile?.locale === 'en' ? 'en-GB' : (profile?.locale ?? 'en-GB')
      )
      const foods = m.items.map((i) => `${i.name} (${Math.round(i.grams)}g)`).join('; ')
      rows.push([
        date,
        m.meal_slot,
        foods,
        String(Math.round(m.totals?.kcal ?? 0)),
        String(Math.round(m.totals?.protein ?? 0)),
        String(Math.round(m.totals?.carbs ?? 0)),
        String(Math.round(m.totals?.fat ?? 0)),
      ])
    }

    // Daily averages
    const byDay = new Map<string, { kcal: number; protein: number; carbs: number; fat: number }>()
    for (const m of meals) {
      const day = m.eaten_at.slice(0, 10)
      const prev = byDay.get(day) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
      byDay.set(day, {
        kcal: prev.kcal + (m.totals?.kcal ?? 0),
        protein: prev.protein + (m.totals?.protein ?? 0),
        carbs: prev.carbs + (m.totals?.carbs ?? 0),
        fat: prev.fat + (m.totals?.fat ?? 0),
      })
    }
    const daysCount = Math.max(byDay.size, 1)
    const totals = [...byDay.values()].reduce(
      (a, b) => ({
        kcal: a.kcal + b.kcal,
        protein: a.protein + b.protein,
        carbs: a.carbs + b.carbs,
        fat: a.fat + b.fat,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    )
    rows.push([])
    rows.push([
      'Daily Average',
      '',
      '',
      String(Math.round(totals.kcal / daysCount)),
      String(Math.round(totals.protein / daysCount)),
      String(Math.round(totals.carbs / daysCount)),
      String(Math.round(totals.fat / daysCount)),
    ])

    const sanitize = (c: string) => {
      const s = c.replace(/"/g, '""')
      return /^[=+\-@\t\r]/.test(s) ? `"'${s}"` : `"${s}"`
    }
    const csv = rows.map((r) => r.map(sanitize).join(',')).join('\n')
    const filename = `sproutine-report-${params.data.range}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[reports:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Generating report failed' }, { status: 500 })
  }
}
