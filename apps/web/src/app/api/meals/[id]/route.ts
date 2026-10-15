import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { MEAL_SLOTS } from '@sproutine/food'
import { createServerClient } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

const PatchBody = z.object({
  slot: z.enum(MEAL_SLOTS),
})

/** Move a meal to a different slot. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { id } = await params
    const parsed = PatchBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

    const db = createServerClient()
    const { data, error } = await db
      .from('meal_logs')
      .update({ meal_slot: parsed.data.slot })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, meal_slot')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'meal not found' }, { status: 404 })
    }
    return NextResponse.json({ id: data.id, slot: data.meal_slot })
  } catch (error) {
    console.error('[meals/patch]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

/** Delete a meal log. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const { id } = await params
    const db = createServerClient()
    const { error } = await db
      .from('meal_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'delete failed' }, { status: 500 })
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[meals/delete]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
