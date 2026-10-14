import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generatePlan, isSafePlan, validatePlan } from '@sproutine/food'
import { createServerClient, getActivePlan, getProfile, saveActivePlan } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'
import { foodRequestLimiter } from '@/lib/foodLimits'
import { isPlannableWeek, toPlanProfile } from '@/lib/planProfile'

export const runtime = 'nodejs'

const Prefs = z.object({
  maxMinutes: z.number().int().min(10).max(120).optional(),
  avoid: z.array(z.string().max(40)).max(10).optional(),
  prefer: z.array(z.string().max(40)).max(10).optional(),
})

/** The active plan for a week (?week=YYYY-MM-DD, a Monday), or null. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const week = request.nextUrl.searchParams.get('week') ?? ''
    if (!isPlannableWeek(week)) return NextResponse.json({ error: 'invalid week' }, { status: 400 })
    const plan = await getActivePlan(createServerClient(), user.id, week)
    return NextResponse.json({ plan })
  } catch (error) {
    console.error('[plans:get]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading the plan failed' }, { status: 500 })
  }
}

/**
 * Builds and stores a new plan for the week, replacing any active one. The
 * planner only picks recipes that fit the profile; the result is checked
 * again before it is saved.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }

    const body = z
      .object({
        weekStart: z.string(),
        // The client's today, for a week already under way.
        fromDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        prefs: Prefs.optional(),
      })
      .safeParse(await request.json().catch(() => null))
    if (!body.success || !isPlannableWeek(body.data.weekStart)) {
      return NextResponse.json({ error: 'invalid request' }, { status: 400 })
    }

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    // Diet and allergies are health data: only used with recorded consent.
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }

    const planProfile = toPlanProfile(profile)
    const prefs = body.data.prefs ?? {}
    const { plan, issues } = generatePlan(planProfile, {
      weekStart: body.data.weekStart,
      prefs,
      seed: Math.floor(Math.random() * 2 ** 31),
      fromDate: body.data.fromDate,
    })
    if (!isSafePlan(validatePlan(plan, planProfile))) {
      // Can't happen by construction; never store a plan that fails the check.
      console.error('[plans] generated plan failed validation')
      return NextResponse.json({ error: 'Planning failed' }, { status: 500 })
    }

    const id = await saveActivePlan(db, user.id, plan, prefs)
    const stored = await getActivePlan(db, user.id, plan.weekStart)
    return NextResponse.json(
      { plan: stored ?? { id, plan, prefs, updatedAt: null }, issues },
      { status: 201 }
    )
  } catch (error) {
    console.error('[plans:post]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Planning failed' }, { status: 500 })
  }
}
