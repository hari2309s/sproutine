import { generateText, Output } from 'ai'
import type { LanguageModel, ModelMessage } from 'ai'
import type { z } from 'zod'
import type { Provider, TaskType } from './types'
import { groqProviderOptions } from './llm'
import { logEval, incrementUsage, getGlobalUsage } from './eval'
import { buildModel } from './providers'
import { getModelId } from './models'

export { getModelId } from './models'

// Conservative buffers — stay ~10% under actual free tier limits
export const DAILY_LIMITS: Record<Provider, number> = {
  groq: 900,
  gemini: 1300,
  cerebras: 1500,
  openrouter: 250,
  mistral: 600,
}

// Priority order per task type. First provider under its daily budget wins.
export const PRIORITY_ORDER: Record<TaskType, Provider[]> = {
  'fast-chat': ['groq', 'cerebras', 'openrouter', 'mistral'],
  classify: ['groq', 'cerebras', 'mistral'],
  // Groq serves gpt-oss-safeguard here; the fallbacks are general models
  // following the same written policy.
  safety: ['groq', 'cerebras', 'mistral'],
  reasoning: ['gemini', 'groq', 'cerebras', 'openrouter'],
  structured: ['gemini', 'groq', 'cerebras'],
  'tool-calling': ['groq', 'gemini', 'cerebras'],
  // Only genuinely multimodal models.
  vision: ['gemini', 'groq'],
}

export interface ModelCandidate {
  model: LanguageModel
  provider: Provider
  modelId: string
}

async function usageOrEmpty(): Promise<Record<string, number>> {
  try {
    return await getGlobalUsage()
  } catch {
    // Usage check is best-effort — proceed rather than block the user.
    return {}
  }
}

function candidate(provider: Provider, task: TaskType): ModelCandidate {
  return { model: buildModel(provider, task), provider, modelId: getModelId(provider, task) }
}

/**
 * All candidate providers for a task, in priority order, skipping any over
 * their daily budget. Streaming callers iterate these to retry on per-minute
 * rate limits. If every provider is over budget the primary is still returned
 * so the caller can try (and surface the real error).
 */
export async function selectModelCandidates(task: TaskType): Promise<ModelCandidate[]> {
  const usage = await usageOrEmpty()
  const priority = PRIORITY_ORDER[task]
  const available = priority.filter((p) => (usage[`${p}_requests`] ?? 0) < DAILY_LIMITS[p])
  if (available.length === 0) {
    console.warn('[LLMRouter] All providers over budget for task:', task)
    return [candidate(priority[0]!, task)]
  }
  return available.map((p) => candidate(p, task))
}

export async function selectModel(task: TaskType): Promise<ModelCandidate> {
  return (await selectModelCandidates(task))[0]!
}

export interface RouterGenerateOptions {
  prompt?: string
  instructions?: string
  messages?: ModelMessage[]
  maxOutputTokens?: number
  temperature?: number
  /**
   * Names the generation in Langfuse (verb-first, stable: e.g. 'classify-intent').
   * Each provider attempt is its own generation, so fallbacks are visible.
   */
  functionId?: string
}

function track(
  provider: Provider,
  task: TaskType,
  latencyMs: number,
  tokensUsed: number,
  traceId?: string
) {
  Promise.all([
    incrementUsage(provider),
    logEval({ provider, task, latencyMs, tokensUsed, traceId }),
  ]).catch((e) => console.error('[LLMRouter] eval log error:', e))
}

export async function routedGenerateText(
  task: TaskType,
  options: RouterGenerateOptions,
  meta?: { traceId?: string }
): Promise<{ text: string; provider: Provider | null }> {
  for (const { model, provider } of await selectModelCandidates(task)) {
    const start = Date.now()
    try {
      const result = await generateText({
        model,
        instructions: options.instructions,
        ...(options.messages ? { messages: options.messages } : { prompt: options.prompt ?? '' }),
        maxOutputTokens: options.maxOutputTokens,
        temperature: options.temperature,
        providerOptions: groqProviderOptions,
        telemetry: { functionId: options.functionId ?? task },
      })
      const tokens = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
      track(provider, task, Date.now() - start, tokens, meta?.traceId)
      return { text: result.text, provider }
    } catch (e) {
      console.warn(`[LLMRouter] ${provider} failed for ${task}, trying next:`, (e as Error).message)
    }
  }

  console.error('[LLMRouter] All providers failed for task:', task)
  return { text: '', provider: null }
}

/**
 * Structured output with schema validation. Each provider gets one retry with
 * the validation error fed back before falling through to the next provider.
 * Returns null if nothing produced a valid object — callers decide the fallback.
 */
export async function routedGenerateObject<T>(
  task: TaskType,
  schema: z.ZodType<T>,
  options: RouterGenerateOptions,
  meta?: { traceId?: string }
): Promise<{ object: T; provider: Provider } | null> {
  for (const { model, provider } of await selectModelCandidates(task)) {
    let feedback: string | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      const start = Date.now()
      try {
        const prompt = feedback
          ? `${options.prompt ?? ''}\n\nYour previous answer was invalid: ${feedback}\nReturn only valid output.`
          : (options.prompt ?? '')
        const result = await generateText({
          model,
          instructions: options.instructions,
          prompt,
          maxOutputTokens: options.maxOutputTokens,
          temperature: options.temperature ?? 0,
          providerOptions: groqProviderOptions,
          output: Output.object({ schema }),
          telemetry: { functionId: options.functionId ?? task },
        })
        const tokens = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0)
        track(provider, task, Date.now() - start, tokens, meta?.traceId)
        return { object: result.output as T, provider }
      } catch (e) {
        feedback = (e as Error).message.slice(0, 500)
        console.warn(`[LLMRouter] ${provider} structured attempt ${attempt + 1} failed:`, feedback)
      }
    }
  }
  return null
}
