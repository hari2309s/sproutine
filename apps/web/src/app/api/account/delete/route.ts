import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@truffle/db'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse

    const db = createServerClient()

    // Delete the auth user — all tables cascade via ON DELETE CASCADE
    const { error } = await db.auth.admin.deleteUser(user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Account delete error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
