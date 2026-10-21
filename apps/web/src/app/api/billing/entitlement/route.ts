import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getEntitlement } from '@sproutine/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

/** The signed-in user's plan, for showing gates, the trial banner and Settings. */
export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const entitlement = await getEntitlement(createServerClient(), user.id)
    return NextResponse.json(entitlement, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[billing/entitlement]', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Loading your plan failed' }, { status: 500 })
  }
}
