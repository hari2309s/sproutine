import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { isSafePlan, PLAN_SLOTS, swapMeal, validatePlan } from '@sproutine/food'
import {
  createServerClient,
  getPlanById,
  getProfile,
  PlanConflictError,
  updatePlanMeals,
} from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'
import { toPlanProfile } from '@/lib/planProfile'

export const runtime = 'nodejs'

const Body = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(PLAN_SLOTS),
  /** The version the client last saw, so a stale swap is refused. */
  updatedAt: z.string().max(64),
})

/** Swaps one meal for another that fits the profile. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }
    const { id } = await params
    const body = Body.safeParse(await request.json().catch(() => null))
    if (!body.success || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'invalid request' }, { status: 400 })
    }

    const db = createServerClient()
    const [profile, stored] = await Promise.all([
      getProfile(db, user.id),
      getPlanById(db, user.id, id),
    ])
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }
    if (!stored) return NextResponse.json({ error: 'plan not found' }, { status: 404 })
    if (stored.updatedAt !== body.data.updatedAt) {
      return NextResponse.json({ error: 'plan changed', plan: stored }, { status: 409 })
    }

    const planProfile = toPlanProfile(profile)
    const { date, slot } = body.data
    const next = swapMeal(stored.plan, planProfile, { date, slot }, stored.prefs)
    if (!next) return NextResponse.json({ error: 'nothing else fits' }, { status: 422 })
    if (!isSafePlan(validatePlan(next, planProfile))) {
      console.error('[plans] swapped plan failed validation')
      return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
    }

    const from = stored.plan.days.find((d) => d.date === date)?.meals[slot] ?? null
    const to = next.days.find((d) => d.date === date)!.meals[slot]!
    await updatePlanMeals(db, user.id, id, next, { date, slot, from, to }, stored.updatedAt)
    return NextResponse.json({ plan: await getPlanById(db, user.id, id) })
  } catch (error) {
    if (error instanceof PlanConflictError) {
      return NextResponse.json({ error: 'plan changed' }, { status: 409 })
    }
    console.error('[plans:patch]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
  }
}
