import { supabase } from './supabase'

/** The profile fields the client UI needs. RLS limits reads to the signed-in user. */
export interface ClientProfile {
  displayName: string
  locale: string
  voiceId: string
  safetyMode: boolean
}

export async function fetchOwnProfile(userId: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, locale, voice_id, safety_mode')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    displayName: data.display_name as string,
    locale: data.locale as string,
    voiceId: data.voice_id as string,
    safetyMode: Boolean(data.safety_mode),
  }
}
