import { createGroq } from '@ai-sdk/groq'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })

// Groq retired the Llama 3.x chat models in 2026 — GPT-OSS 120B is the current
// general-purpose / reasoning workhorse on GroqCloud.
export const chatModel = groq('openai/gpt-oss-120b')

// Groq's Llama 4 Scout (the old vision model) was deprecated in 2026. Receipt /
// statement extraction now runs on Gemini 3.7 Flash, which handles both images
// and PDFs natively and is the primary provider for the router's `vision` task.
export const visionModel = google('gemini-3.7-flash')

// GPT-OSS models are reasoning models. `reasoningEffort: 'low'` keeps the
// chain-of-thought short so it barely eats into `maxOutputTokens`, and
// `reasoningFormat: 'parsed'` moves whatever reasoning remains into a separate
// field so `text` is only the answer (callers parse intent labels / judge
// scores out of it). Pass as `providerOptions` on every Groq
// generateText/streamText call — non-Groq providers ignore the `groq` key.
export const groqProviderOptions = {
  groq: { reasoningFormat: 'parsed' as const, reasoningEffort: 'low' as const },
}

// The conversational chat endpoint benefits from a little more deliberation than
// the label/score tasks — `reasoningEffort: 'medium'` yields warmer, less clipped
// replies. It costs more of the output-token budget, so callers using this must
// raise `maxOutputTokens` accordingly (the reasoning is parsed out of `text` but
// still consumes the budget).
export const groqChatProviderOptions = {
  groq: { reasoningFormat: 'parsed' as const, reasoningEffort: 'medium' as const },
}
