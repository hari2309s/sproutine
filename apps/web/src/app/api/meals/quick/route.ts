import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getFavourites } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** Quick-add items: favourites + recent meals for the quick-add section. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const db = createServerClient()

    // Return favourites (limited to 20) and recent unique meals (last 7 days)
    const [favourites, recentsRes] = await Promise.all([
      getFavourites(db, user.id, 20),
      db
        .from('meal_logs')
        .select('id, meal_slot, items, totals, eaten_at, is_favourite')
        .eq('user_id', user.id)
        .eq('is_favourite', false)
        .gte('eaten_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('eaten_at', { ascending: false })
        .limit(30),
    ])

    // Deduplicate recents by item names
    const seen = new Set(
      favourites.map((f) =>
        f.items.map((i) => i.name).sort().join('|')
      )
    )
    const recents = ((recentsRes.data ?? []) as {
      id: string
      meal_slot: string
      items: { name: string; brand: string | null; grams: number; source: string; sourceId: string }[]
      totals: Record<string, number>
      eaten_at: string
      is_favourite: boolean
    }[])
      .filter((r) => {
        const key = r.items.map((i) => i.name).sort().join('|')
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        slot: r.meal_slot,
        items: r.items,
        totals: r.totals,
        eatenAt: r.eaten_at,
        isFavourite: false,
      }))

    return NextResponse.json({
      favourites: favourites.map((f) => ({ ...f, isFavourite: true })),
      recents,
    })
  } catch (error) {
    console.error('[quick:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading quick items failed' }, { status: 500 })
  }
}
