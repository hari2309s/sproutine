// Selectable TTS "voices" for Truffle's spoken replies.
//
// The browser Web Speech API exposes a wildly different voice list per
// OS/browser, so we don't let the user pick a raw SpeechSynthesisVoice.
// Instead each option is a *persona* — an ordered list of platform voice
// names we'd like for that character, plus rate/pitch — and we resolve it
// to whatever the current device actually has.
//
// Ordering rule (learned the hard way, see git history): list Google/
// Microsoft voices first. Chrome exposes macOS system voices (Samantha,
// Daniel…) in getVoices() but often can't synthesise with them and fails
// silently. Safari has no Google voices and falls through to the macOS
// names naturally.

export type VoiceId = 'sophie' | 'niamh' | 'isla'

export type VoiceGender = 'female' | 'male'

export interface VoicePersona {
  id: VoiceId
  /** Human name shown in the picker. */
  name: string
  /** Accent / region label, e.g. "British English". */
  accent: string
  /** Flag emoji for the accent. */
  flag: string
  gender: VoiceGender
  description: string
  /**
   * Preferred platform voice names, best first, matched with String.includes.
   * Google/Microsoft names lead — Chrome lists macOS system voices but often
   * can't synthesise with them. `langHints` narrows the fallback search.
   */
  voiceNames: string[]
  /** BCP-47 prefixes to prefer when no named voice matches (e.g. "en-GB"). */
  langHints: string[]
  rate: number
  pitch: number
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'sophie',
    name: 'Sophie',
    accent: 'British English',
    flag: '🇬🇧',
    gender: 'female',
    description: 'Warm and clear — the default Truffle voice',
    voiceNames: [
      'Google UK English Female',
      'Microsoft Sonia',
      'Microsoft Libby',
      'Microsoft Hazel',
      'Kate',
      'Serena',
      'Stephanie',
      'Martha',
    ],
    langHints: ['en-GB'],
    // Baseline delivery. The other two personas lean on `rate` (speed) to
    // stay distinct when the device only has one real English voice to
    // offer — `pitch` is kept close to 1.0 for all three. The Web Speech
    // API pitch-shifts by naive resampling rather than anything
    // formant-aware, so pushing it far from 1.0 is what actually sounds
    // "robotic" — a mistake made and reverted here (was pitch 0.82–1.18).
    rate: 1.0,
    pitch: 1.0,
  },
  {
    id: 'niamh',
    name: 'Niamh',
    accent: 'Irish English',
    flag: '🇮🇪',
    gender: 'female',
    description: 'Quick and bright, lively and lilting',
    // Chrome desktop has no en-IE voice — falls back to the British female.
    // Real Irish accent renders on Safari (Moira) and Edge (Microsoft Emily).
    voiceNames: ['Microsoft Emily', 'Moira', 'Google UK English Female', 'Microsoft Sonia'],
    langHints: ['en-IE', 'en-GB'],
    rate: 1.08,
    pitch: 1.04,
  },
  {
    id: 'isla',
    name: 'Isla',
    accent: 'Scottish English',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    gender: 'female',
    description: 'Slow and low, soft with a Scottish lilt',
    // Fiona is the only Scottish voice, and only on older macOS. Elsewhere she
    // resolves to the British female.
    voiceNames: ['Fiona', 'Google UK English Female', 'Microsoft Sonia', 'Microsoft Libby', 'Kate'],
    langHints: ['en-GB'],
    rate: 0.9,
    pitch: 0.96,
  },
]

export const DEFAULT_VOICE_ID: VoiceId = 'sophie'

// Identical for every persona so the user compares voices on the same words.
export const VOICE_SAMPLE_TEXT =
  "Hi, I'm Truffle. You're doing well this month — you've spent a little under half of what came in, so there's room to breathe."

export function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === 'string' && VOICE_PERSONAS.some((p) => p.id === value)
}

// Ids that used to be valid personas. A saved preference of 'oliver' (from
// before the male persona was dropped — it turned out to render as female on
// most devices anyway) should quietly land on its nearest replacement rather
// than silently disappearing.
const LEGACY_VOICE_IDS: Record<string, VoiceId> = {
  oliver: 'sophie',
}

/** Resolve a stored voice preference to a current persona id, migrating retired ones. */
export function normalizeVoiceId(value: unknown): VoiceId | null {
  if (isVoiceId(value)) return value
  if (typeof value === 'string' && value in LEGACY_VOICE_IDS) return LEGACY_VOICE_IDS[value]!
  return null
}

export function getPersona(id: VoiceId): VoicePersona {
  return VOICE_PERSONAS.find((p) => p.id === id) ?? VOICE_PERSONAS[0]!
}

function englishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
}

export interface ResolvedVoice {
  voice: SpeechSynthesisVoice | null
  rate: number
  pitch: number
}

// Name hints for guessing a voice's gender when the API doesn't tell us.
const MALE_NAME_HINTS = [
  'male',
  ' man',
  'daniel',
  'arthur',
  'oliver',
  'george',
  'ryan',
  'guy',
  'william',
  'james',
  'thomas',
  'rishi',
  'aaron',
  'fred',
  'rocko',
  'reed',
  'eddy',
]
const FEMALE_NAME_HINTS = [
  'female',
  'woman',
  'sonia',
  'libby',
  'hazel',
  'kate',
  'serena',
  'stephanie',
  'martha',
  'fiona',
  'moira',
  'emily',
  'samantha',
  'aria',
  'jenny',
  'zira',
  'eva',
]

// IMPORTANT: check female hints before male ones. "female".includes("male")
// is true — checking the male list first meant any voice literally named
// "...Female..." (the single most common voice-naming convention out there,
// e.g. "Google UK English Female") was misdetected as male, which then
// happily satisfied a `guessGender(v) === 'male'` check for a male persona,
// or got treated as "not female" and passed over. This was the actual cause
// of the demo account resolving to an audibly male voice.
function guessGender(voice: SpeechSynthesisVoice): VoiceGender | null {
  const n = voice.name.toLowerCase()
  if (FEMALE_NAME_HINTS.some((h) => n.includes(h))) return 'female'
  if (MALE_NAME_HINTS.some((h) => n.includes(h))) return 'male'
  return null
}

// Resolves every persona to a platform voice in one pass, so two personas
// never silently end up sharing the exact same underlying voice when the
// device actually has more than one to offer. Most desktops/phones expose
// very few distinct English voices, and looking each persona up in
// isolation happily hands everybody the same "Google UK English Female" —
// which is exactly why every voice sounded the same in practice.
//
// Gender correctness is a hard constraint (every persona here is a woman)
// and is NEVER traded away for variety — `pick` only relaxes the "give each
// persona its own distinct voice" preference, tier by tier, and only picks a
// voice confidently identified as the wrong gender as an absolute last
// resort, when literally nothing else is available on the device.
function assignVoices(): Map<VoiceId, ResolvedVoice> {
  const voices = englishVoices()
  const used = new Set<SpeechSynthesisVoice>()

  const isRightGender = (persona: VoicePersona, v: SpeechSynthesisVoice) =>
    guessGender(v) === persona.gender
  const isUnknownGender = (v: SpeechSynthesisVoice) => guessGender(v) === null

  const pick = (persona: VoicePersona): SpeechSynthesisVoice | null => {
    // 1. Exact curated name match, unclaimed — these names were chosen for
    // this persona's gender specifically, so this tier is inherently safe.
    for (const name of persona.voiceNames) {
      const found = voices.find((v) => v.name.includes(name) && !used.has(v))
      if (found) return found
    }
    // 2. Unclaimed voice in the persona's accent region, correct gender.
    for (const hint of persona.langHints) {
      const found = voices.find(
        (v) => v.lang.startsWith(hint) && !used.has(v) && isRightGender(persona, v)
      )
      if (found) return found
    }
    // 3. Any unclaimed voice, correct gender, any region.
    let found = voices.find((v) => !used.has(v) && isRightGender(persona, v))
    if (found) return found
    // 4. Unclaimed voice of undetermined gender — region-preferred. Better
    // than a voice we can positively identify as the wrong gender.
    for (const hint of persona.langHints) {
      found = voices.find((v) => v.lang.startsWith(hint) && !used.has(v) && isUnknownGender(v))
      if (found) return found
    }
    found = voices.find((v) => !used.has(v) && isUnknownGender(v))
    if (found) return found
    // 5. Every voice is already claimed (device has fewer distinct voices
    // than personas) — reuse one, still preferring correct-or-unknown gender
    // over one we know is wrong.
    found = voices.find((v) => isRightGender(persona, v)) ?? voices.find(isUnknownGender)
    if (found) return found
    // 6. Absolute last resort: every English voice on this device is
    // confidently the wrong gender. Nothing better exists to offer.
    return voices.find((v) => v.localService) ?? voices[0] ?? null
  }

  const result = new Map<VoiceId, ResolvedVoice>()
  for (const persona of VOICE_PERSONAS) {
    const voice = pick(persona)
    if (voice) used.add(voice)
    result.set(persona.id, { voice, rate: persona.rate, pitch: persona.pitch })
  }
  return result
}

export function resolveVoice(id: VoiceId): ResolvedVoice {
  const persona = getPersona(id)
  return assignVoices().get(id) ?? { voice: null, rate: persona.rate, pitch: persona.pitch }
}

// Chrome returns [] from getVoices() until `voiceschanged` fires. Run `cb`
// once voices are available (immediately if they already are). Returns a
// disposer that detaches the pending listener if the caller unmounts first.
export function onVoicesReady(cb: () => void): () => void {
  const noop = () => {}
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return noop
  if (window.speechSynthesis.getVoices().length > 0) {
    cb()
    return noop
  }
  const handler = () => {
    window.speechSynthesis.removeEventListener('voiceschanged', handler)
    cb()
  }
  window.speechSynthesis.addEventListener('voiceschanged', handler)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler)
}

let previewUtterance: SpeechSynthesisUtterance | null = null

export function stopVoicePreview(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  previewUtterance = null
  window.speechSynthesis.cancel()
}

interface PreviewCallbacks {
  onStart?: () => void
  onEnd?: () => void
}

/** Speak the shared sample sentence in the given persona's voice. */
export function previewVoice(id: VoiceId, cb?: PreviewCallbacks): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    cb?.onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  onVoicesReady(() => {
    const { voice, rate, pitch } = resolveVoice(id)
    const utterance = new SpeechSynthesisUtterance(VOICE_SAMPLE_TEXT)
    if (voice) utterance.voice = voice
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.volume = 1.0
    const done = () => {
      if (previewUtterance === utterance) previewUtterance = null
      cb?.onEnd?.()
    }
    utterance.onstart = () => cb?.onStart?.()
    utterance.onend = done
    utterance.onerror = done
    previewUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}
