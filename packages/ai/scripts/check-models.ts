/**
 * Verifies every model id in src/models.ts is still listed by its provider's
 * live /models endpoint. Free-tier rosters rotate without notice — run this
 * before changing model constants, and on a schedule (see CI).
 *
 * Run with: pnpm --filter @sproutine/ai models:check
 * Exits non-zero if any id is missing. Providers without a key are skipped.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(import.meta.dirname, '../../../.env.local') })

import { MODELS } from '../src/models'

type Lister = () => Promise<string[]>

async function openAiStyle(url: string, key: string | undefined): Promise<string[]> {
  const res = await fetch(url, { headers: key ? { Authorization: `Bearer ${key}` } : {} })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  const json = (await res.json()) as { data: { id: string }[] }
  return json.data.map((m) => m.id)
}

const LISTERS: Record<keyof typeof MODELS, { key?: string; list: Lister }> = {
  groq: {
    key: process.env.GROQ_API_KEY,
    list: () => openAiStyle('https://api.groq.com/openai/v1/models', process.env.GROQ_API_KEY),
  },
  gemini: {
    key: process.env.GEMINI_API_KEY,
    list: async () => {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',
        { headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY ?? '' } }
      )
      if (!res.ok) throw new Error(`gemini → HTTP ${res.status}`)
      const json = (await res.json()) as { models: { name: string }[] }
      return json.models.map((m) => m.name.replace(/^models\//, ''))
    },
  },
  cerebras: {
    key: process.env.CEREBRAS_API_KEY,
    list: () => openAiStyle('https://api.cerebras.ai/v1/models', process.env.CEREBRAS_API_KEY),
  },
  // Public endpoint, no key needed.
  openrouter: { key: 'public', list: () => openAiStyle('https://openrouter.ai/api/v1/models', undefined) },
  mistral: {
    key: process.env.MISTRAL_API_KEY,
    list: () => openAiStyle('https://api.mistral.ai/v1/models', process.env.MISTRAL_API_KEY),
  },
}

async function run() {
  let missing = 0
  for (const [provider, ids] of Object.entries(MODELS) as [keyof typeof MODELS, Record<string, string>][]) {
    const { key, list } = LISTERS[provider]
    if (!key) {
      console.log(`- ${provider}: skipped (no API key)`)
      continue
    }
    try {
      const available = new Set(await list())
      for (const [role, id] of Object.entries(ids)) {
        const ok = available.has(id)
        if (!ok) missing++
        console.log(`${ok ? '✓' : '✗'} ${provider}.${role} = ${id}`)
      }
    } catch (e) {
      missing++
      console.log(`✗ ${provider}: ${(e as Error).message}`)
    }
  }
  if (missing > 0) {
    console.error(`\n${missing} model id(s) unavailable — update src/models.ts`)
    process.exitCode = 1
  }
}

run()
