import type { Provider, TaskType } from './types'

// Every model id the app calls, in one place. Verified against each
// provider's live /models endpoint on 2026-10-13. Free-tier rosters change
// often — re-check with `pnpm --filter @sproutine/ai models:check` before
// changing these, and pin dated ids where a provider offers them.
export const MODELS = {
  groq: {
    small: 'openai/gpt-oss-20b',
    large: 'openai/gpt-oss-120b',
    // Policy-following safety classifier built on gpt-oss-20b.
    safeguard: 'openai/gpt-oss-safeguard-20b',
    vision: 'qwen/qwen3.8-27b',
    transcription: 'whisper-large-v3-turbo',
  },
  gemini: {
    lite: 'gemini-3.5-flash-lite',
    flash: 'gemini-3.8-flash',
    embedding: 'gemini-embedding-2',
  },
  cerebras: {
    large: 'gpt-oss-120b',
  },
  openrouter: {
    // Free variant; supports tool calling. OpenRouter's :free list rotates.
    free: 'google/gemma-4-31b-it:free',
  },
  mistral: {
    // Dated id rather than -latest so an alias bump can't change behaviour silently.
    small: 'mistral-small-2603',
  },
} as const

export function getModelId(provider: Provider, task: TaskType): string {
  switch (provider) {
    case 'groq':
      if (task === 'vision') return MODELS.groq.vision
      if (task === 'safety') return MODELS.groq.safeguard
      return task === 'fast-chat' || task === 'classify' ? MODELS.groq.small : MODELS.groq.large
    case 'gemini':
      return task === 'fast-chat' || task === 'classify' || task === 'safety'
        ? MODELS.gemini.lite
        : MODELS.gemini.flash
    case 'cerebras':
      return MODELS.cerebras.large
    case 'openrouter':
      return MODELS.openrouter.free
    case 'mistral':
      return MODELS.mistral.small
  }
}
