import { NextRequest, NextResponse } from 'next/server'
import { consumeUserQuota, parseMealPhoto } from '@sproutine/ai'
import {
  createFoodCache,
  createServerClient,
  getProfile,
} from '@sproutine/db'
import { mealSlotAt, proposeMealLog, proposalWithoutNutrients } from '@sproutine/food'
import { requireUser } from '@/lib/supabase-server'
import { foodExternalLimiter, foodRequestLimiter } from '@/lib/foodLimits'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
/** Vision calls are the priciest per request, so photos get the tightest cap. */
const PHOTO_DAILY_LIMIT = 30
const MEAL_LOOKUP_BUDGET_MS = 10_000

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    if (!foodRequestLimiter.tryAcquire(user.id)) {
      return NextResponse.json({ error: 'too many requests, slow down' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    if (!body?.image || typeof body.image !== 'string') {
      return NextResponse.json({ error: 'image required' }, { status: 400 })
    }
    if (body.image.length > MAX_IMAGE_SIZE * 1.37) {
      // base64 is ~37% larger than binary
      return NextResponse.json({ error: 'image too large' }, { status: 413 })
    }

    const note = typeof body.note === 'string' ? body.note.slice(0, 200) : undefined

    const db = createServerClient()
    const profile = await getProfile(db, user.id)
    if (!profile?.consentHealthAt) {
      return NextResponse.json({ error: 'onboarding required' }, { status: 409 })
    }
    if (!(await consumeUserQuota(user.id, 'photo', PHOTO_DAILY_LIMIT))) {
      return NextResponse.json(
        { error: "You've reached today's photo limit. Try searching for the food instead." },
        { status: 429 }
      )
    }

    const parsed = await parseMealPhoto(body.image, note)
    if (!parsed?.items.length) {
      return NextResponse.json(
        { error: "I couldn't identify any food in the photo. Try describing what you ate instead." },
        { status: 422 }
      )
    }

    const deadline = Date.now() + MEAL_LOOKUP_BUDGET_MS
    const proposal = await proposeMealLog(
      {
        slot: parsed.slot ?? mealSlotAt(new Date()),
        source: 'photo',
        items: parsed.items,
      },
      createFoodCache(db, user.id),
      {
        canCallExternal: () =>
          Date.now() < deadline && foodExternalLimiter.tryAcquire(user.id),
      }
    )

    if (!proposal.items.some((i) => i.match)) {
      return NextResponse.json(
        { error: "I couldn't match the foods I see to our database. Try describing them instead." },
        { status: 422 }
      )
    }

    const result = profile.safetyMode ? proposalWithoutNutrients(proposal) : proposal
    return NextResponse.json({ proposal: result })
  } catch (error) {
    console.error('[meals/photo]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Photo analysis failed' }, { status: 500 })
  }
}
