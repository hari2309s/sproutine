import type { Allergen, Diet, Profile } from '@sproutine/types'
import { DIETS, EU_ALLERGENS } from '@sproutine/types'
import type { Database } from './schema'
import type { createServerClient } from './client'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export function rowToProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    diet: (DIETS as readonly string[]).includes(row.diet) ? (row.diet as Diet) : 'omnivore',
    allergies: (row.allergies ?? []).filter((a): a is Allergen =>
      (EU_ALLERGENS as readonly string[]).includes(a)
    ),
    dislikes: row.dislikes ?? [],
    budgetWeeklyCents: row.budget_weekly_cents,
    goals: row.goals ?? [],
    quitDate: row.quit_date,
    locale: row.locale,
    voiceId: row.voice_id,
    safetyMode: row.safety_mode,
    consentHealthAt: row.consent_health_at,
    llmPseudonym: row.llm_pseudonym,
  }
}

export async function getProfile(
  db: ReturnType<typeof createServerClient>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await db.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? rowToProfile(data as ProfileRow) : null
}
