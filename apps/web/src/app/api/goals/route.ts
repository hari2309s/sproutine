import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@truffle/db'
import type { SavingsGoal } from '@truffle/types'
import { recomputeSnapshot } from '@/lib/server-db'
import { sendGoalMilestoneNudge, sendGoalAtRiskNudge } from '@/lib/proactive-nudge'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const db = createServerClient()
    const { data, error } = await db
      .from('savings_goals')
      .select('id, user_id, name, target_amount, saved_amount, deadline, emoji, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Check for at-risk goals (deadline within 30 days, not yet complete)
    const today = new Date()
    for (const row of data ?? []) {
      if (!row.deadline) continue
      const deadline = new Date(row.deadline)
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
      if (daysRemaining <= 0 || daysRemaining > 30) continue
      const remaining = Number(row.target_amount) - Number(row.saved_amount)
      if (remaining <= 0) continue

      const goal: SavingsGoal = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        savedAmount: Number(row.saved_amount),
        deadline: row.deadline,
        emoji: row.emoji,
        createdAt: row.created_at,
      }
      void sendGoalAtRiskNudge({
        userId,
        goal,
        daysRemaining,
        projectedShortfall: remaining,
      }).catch((e) => console.error(`Goal at-risk nudge failed for "${goal.name}":`, e))
    }

    return NextResponse.json(
      { goals: data },
      { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' } }
    )
  } catch (error) {
    console.error('GET goals error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const { name, targetAmount, deadline, emoji } = await request.json()
    if (!name || typeof name !== 'string' || name.length > 200) {
      return NextResponse.json(
        { error: 'name must be a non-empty string under 200 characters' },
        { status: 400 }
      )
    }
    if (!targetAmount) {
      return NextResponse.json({ error: 'targetAmount required' }, { status: 400 })
    }
    if (
      typeof targetAmount !== 'number' ||
      targetAmount <= 0 ||
      !isFinite(targetAmount) ||
      targetAmount > 1_000_000_000
    ) {
      return NextResponse.json(
        { error: 'targetAmount must be a positive finite number up to 1,000,000,000' },
        { status: 400 }
      )
    }
    const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
    if (deadline && (typeof deadline !== 'string' || !ISO_DATE_RE.test(deadline))) {
      return NextResponse.json(
        { error: 'deadline must be an ISO date (YYYY-MM-DD)' },
        { status: 400 }
      )
    }
    if (emoji !== undefined && (typeof emoji !== 'string' || emoji.length > 20)) {
      return NextResponse.json(
        { error: 'emoji must be a string under 20 characters' },
        { status: 400 }
      )
    }

    const db = createServerClient()
    const { data, error } = await db
      .from('savings_goals')
      .insert({
        user_id: userId,
        name,
        target_amount: targetAmount,
        saved_amount: 0,
        deadline: deadline || null,
        emoji: emoji ?? '🎯',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (error) {
    console.error('POST goals error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const { goalId, savedAmount, currency = 'EUR' } = await request.json()
    if (typeof goalId !== 'string' || !goalId || savedAmount === undefined) {
      return NextResponse.json({ error: 'goalId and savedAmount required' }, { status: 400 })
    }
    if (
      typeof savedAmount !== 'number' ||
      savedAmount < 0 ||
      !isFinite(savedAmount) ||
      savedAmount > 1_000_000_000
    ) {
      return NextResponse.json(
        { error: 'savedAmount must be a non-negative finite number up to 1,000,000,000' },
        { status: 400 }
      )
    }
    const VALID_CURRENCIES = ['EUR', 'GBP', 'USD'] as const
    type ValidCurrency = (typeof VALID_CURRENCIES)[number]
    if (!VALID_CURRENCIES.includes(currency as ValidCurrency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    const db = createServerClient()

    // Fetch current goal to compute deposit delta, milestone detection, and goal name
    const { data: currentGoal, error: fetchError } = await db
      .from('savings_goals')
      .select('id, user_id, name, saved_amount, target_amount, deadline, emoji, created_at')
      .eq('id', goalId)
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!currentGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const currentSaved = Number(currentGoal.saved_amount ?? 0)
    const targetAmount = Number(currentGoal.target_amount)
    if (Math.round(savedAmount * 100) < Math.round(currentSaved * 100)) {
      return NextResponse.json(
        { error: 'savedAmount cannot be less than the current saved amount' },
        { status: 400 }
      )
    }
    if (Math.round(savedAmount * 100) > Math.round(targetAmount * 100)) {
      return NextResponse.json(
        { error: 'savedAmount cannot exceed the goal target amount' },
        { status: 400 }
      )
    }

    const depositAmount = savedAmount - currentSaved
    if (Math.round(depositAmount * 100) === 0) {
      return NextResponse.json({ goal: currentGoal })
    }

    // Update the goal's saved amount using optimistic lock on the current value
    // to prevent a race condition where two concurrent requests both read the
    // same saved_amount and produce diverging totals.
    const { data, error } = await db
      .from('savings_goals')
      .update({ saved_amount: savedAmount })
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('saved_amount', currentSaved)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: 'Concurrent update detected, please retry' },
        { status: 409 }
      )
    }

    // Insert a transaction to deduct the deposit from balance
    if (depositAmount > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const { error: txError } = await db.from('transactions').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        amount: -depositAmount,
        currency,
        description: `Saved to: ${currentGoal.name}`,
        category: 'savings',
        merchant: currentGoal.name,
        date: today,
        is_recurring: false,
        embedding: null,
      })

      if (txError) {
        const { data: rollbackData, error: rollbackError } = await db
          .from('savings_goals')
          .update({ saved_amount: currentSaved })
          .eq('id', goalId)
          .eq('user_id', userId)
          .eq('saved_amount', savedAmount)
          .select('id')
          .maybeSingle()
        if (rollbackError || !rollbackData) {
          console.error(
            'Critical: goal rollback failed (concurrent update or DB error):',
            rollbackError
          )
          return NextResponse.json(
            { error: 'Data inconsistency — please contact support', code: 'ROLLBACK_FAILED' },
            { status: 500 }
          )
        }
        throw txError
      }

      // Recompute monthly snapshot so balance reflects the deduction (non-fatal)
      try {
        await recomputeSnapshot(userId, db)
      } catch (e) {
        console.error('Snapshot recompute failed (non-fatal):', e)
      }
    }

    // Fire proactive nudge if a milestone was crossed
    if (data) {
      if (targetAmount > 0) {
        const prevPct = (Number(currentGoal.saved_amount) / targetAmount) * 100
        const newPct = (savedAmount / targetAmount) * 100
        const MILESTONES = [25, 50, 75, 100] as const
        const crossed = MILESTONES.find((m) => prevPct < m && newPct >= m)
        if (crossed) {
          const goal: SavingsGoal = {
            id: data.id as string,
            userId: data.user_id as string,
            name: data.name as string,
            targetAmount: Number(data.target_amount),
            savedAmount: Number(data.saved_amount),
            deadline: data.deadline as string | undefined,
            emoji: data.emoji as string,
            createdAt: data.created_at as string,
          }
          void sendGoalMilestoneNudge({ userId, goal, milestone: crossed, snapshot: null }).catch(
            (e) => console.error(`Goal milestone nudge failed (${crossed}% of "${goal.name}"):`, e)
          )
        }
      }
    }

    return NextResponse.json({ goal: data })
  } catch (error) {
    console.error('PATCH goals error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireUser(request)
    if (errorResponse) return errorResponse
    const userId = user.id

    const goalId = request.nextUrl.searchParams.get('goalId')
    if (!goalId) {
      return NextResponse.json({ error: 'goalId required' }, { status: 400 })
    }

    const db = createServerClient()
    const { error } = await db.from('savings_goals').delete().eq('id', goalId).eq('user_id', userId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE goals error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
