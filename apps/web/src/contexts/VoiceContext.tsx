'use client'

import { createContext, useContext, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { usePersistedPreference } from '@/hooks/usePersistedPreference'
import { DEFAULT_VOICE_ID, normalizeVoiceId, type VoiceId } from '@/lib/voices'

const STORAGE_KEY = 'truffle-voice'

interface VoiceContextValue {
  voiceId: VoiceId
  setVoiceId: (v: VoiceId) => void
}

const VoiceContext = createContext<VoiceContextValue>({
  voiceId: DEFAULT_VOICE_ID,
  setVoiceId: () => {},
})

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [voiceId, setVoiceId] = usePersistedPreference<VoiceId>({
    storageKey: STORAGE_KEY,
    defaultValue: DEFAULT_VOICE_ID,
    metadataField: 'voice',
    normalize: (raw) => normalizeVoiceId(raw),
    // Self-heal a retired persona id (e.g. a voice that was later removed)
    // so future sessions don't need to remap it again.
    onRemoteNormalize: (normalized) => {
      supabase.auth.updateUser({ data: { voice: normalized } }).catch(() => {})
    },
  })

  const value = useMemo(() => ({ voiceId, setVoiceId }), [voiceId, setVoiceId])

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoicePreference() {
  return useContext(VoiceContext)
}
