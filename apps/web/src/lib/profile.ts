import { supabase } from './supabase'

/** The profile fields the client UI needs. RLS limits reads to the signed-in user. */
export interface ClientProfile {
  displayName: string
  locale: string
  voiceId: string
  safetyMode: boolean
  timezone: string
  waterGoalMl: number
  waterGlassMl: number
  kcalGoal: number | null
  proteinGoalG: number | null
  carbsGoalG: number | null
  fatGoalG: number | null
}

/** The browser's IANA time zone, or Berlin if it can't tell. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'
  } catch {
    return 'Europe/Berlin'
  }
}

export async function fetchOwnProfile(userId: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, locale, voice_id, safety_mode, timezone, water_goal_ml, water_glass_ml, kcal_goal, protein_goal_g, carbs_goal_g, fat_goal_g')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    displayName: data.display_name as string,
    locale: data.locale as string,
    voiceId: data.voice_id as string,
    safetyMode: Boolean(data.safety_mode),
    timezone: (data.timezone as string) ?? 'Europe/Berlin',
    waterGoalMl: (data.water_goal_ml as number) ?? 2000,
    waterGlassMl: (data.water_glass_ml as number) ?? 250,
    kcalGoal: (data.kcal_goal as number | null) ?? null,
    proteinGoalG: (data.protein_goal_g as number | null) ?? null,
    carbsGoalG: (data.carbs_goal_g as number | null) ?? null,
    fatGoalG: (data.fat_goal_g as number | null) ?? null,
  }
}
