import { createGroq } from '@ai-sdk/groq'
import { createGoogle } from '@ai-sdk/google'
import { createCerebras } from '@ai-sdk/cerebras'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { Provider, TaskType } from './types'
import { getModelId } from './models'

// Providers are created per call so env vars are read lazily (scripts load
// dotenv after import) — construction is cheap, no network.
export function buildModel(provider: Provider, task: TaskType): LanguageModel {
  const modelId = getModelId(provider, task)
  switch (provider) {
    case 'groq':
      return createGroq({ apiKey: process.env.GROQ_API_KEY })(modelId)
    case 'gemini':
      return createGoogle({ apiKey: process.env.GEMINI_API_KEY })(modelId)
    case 'cerebras':
      return createCerebras({ apiKey: process.env.CEREBRAS_API_KEY })(modelId)
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000' },
      })(modelId)
    case 'mistral':
      return createMistral({ apiKey: process.env.MISTRAL_API_KEY })(modelId)
  }
}
