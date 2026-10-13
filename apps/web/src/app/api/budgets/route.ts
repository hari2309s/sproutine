import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@truffle/db'
import type { CategoryBudget } from '@truffle/types'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function mapBudget(row: Record<string, unknown>): CategoryBudget {
  return {
    id: row.id as string,
    userId: (row.user_id ?? row.userId) as string,
    category: row.category as CategoryBudget['category'],
    amount: Number(row.amount),
    createdAt: (row.created_at ?? row.createdAt) as string,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const db = createServerClient()
    const { data, error } = await db
      .from('monthly_budgets')
      .select('id, user_id, category, amount, created_at')
      .eq('user_id', userId)
      .order('category', { ascending: true })

    if (error) throw error
    return NextResponse.json({ budgets: (data ?? []).map(mapBudget) })
  } catch (error) {
    console.error('GET budgets error:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const body = await request.json()
    const { category, amount } = body as { category: string; amount: number }

    if (!category || !amount || amount <= 0) {
      return NextResponse.json({ error: 'category and amount (>0) required' }, { status: 400 })
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('monthly_budgets')
      .upsert({ user_id: userId, category, amount }, { onConflict: 'user_id,category' })
      .select('id, user_id, category, amount, created_at')
      .single()

    if (error) throw error
    return NextResponse.json({ budget: mapBudget(data as Record<string, unknown>) })
  } catch (error) {
    console.error('POST budgets error:', error)
    return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const budgetId = request.nextUrl.searchParams.get('budgetId')

    if (!budgetId) {
      return NextResponse.json({ error: 'budgetId required' }, { status: 400 })
    }

    const db = createServerClient()
    const { error } = await db
      .from('monthly_budgets')
      .delete()
      .eq('id', budgetId)
      .eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE budgets error:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
