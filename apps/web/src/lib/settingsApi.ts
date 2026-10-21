import { supabase } from './supabase'

/** GDPR Art. 20 export: download everything stored about the user. */
export async function exportAllData(userId: string): Promise<void> {
  const [
    profileRes,
    messagesRes,
    mealsRes,
    plansRes,
    habitsRes,
    checkinsRes,
    waterRes,
    weightRes,
    feedTokenRes,
    otdDismissRes,
    subscriptionRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('chat_messages')
      .select('role, content, is_proactive, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('meal_logs')
      .select('slot, items, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('meal_plans')
      .select('week_start, plan, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('goals_habits')
      .select('title, period, created_at, archived_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_checkins')
      .select('habit_id, date')
      .eq('user_id', userId)
      .order('date', { ascending: true }),
    supabase
      .from('water_logs')
      .select('ml, logged_at, created_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true }),
    supabase
      .from('weight_logs')
      .select('weight_kg, logged_at, created_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: true }),
    supabase.from('calendar_feed_tokens').select('created_at').eq('user_id', userId),
    supabase
      .from('on_this_day_dismissals')
      .select('shown_at, action, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('subscriptions')
      .select(
        'trial_ends_at, status, price_interval, current_period_end, cancel_at_period_end, created_at'
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  for (const r of [
    profileRes,
    messagesRes,
    mealsRes,
    plansRes,
    habitsRes,
    checkinsRes,
    waterRes,
    weightRes,
    feedTokenRes,
    otdDismissRes,
    subscriptionRes,
  ]) {
    if (r.error) throw r.error
  }
  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: profileRes.data,
    chatMessages: messagesRes.data ?? [],
    mealLogs: mealsRes.data ?? [],
    mealPlans: plansRes.data ?? [],
    habits: habitsRes.data ?? [],
    habitCheckins: checkinsRes.data ?? [],
    waterLogs: waterRes.data ?? [],
    weightLogs: weightRes.data ?? [],
    calendarFeedTokens: feedTokenRes.data ?? [],
    onThisDayDismissals: otdDismissRes.data ?? [],
    subscription: subscriptionRes.data,
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sproutine-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch('/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error('server error')
}

type MutableProfileFields = Partial<{
  locale: string
  voice_id: string
  safety_mode: boolean
  timezone: string
  water_goal_ml: number
  water_glass_ml: number
  kcal_goal: number | null
  protein_goal_g: number | null
  carbs_goal_g: number | null
  fat_goal_g: number | null
}>

export async function updateProfileField(
  userId: string,
  fields: MutableProfileFields
): Promise<{ error: unknown }> {
  const { error } = await supabase.from('profiles').update(fields).eq('user_id', userId)
  return { error }
}
