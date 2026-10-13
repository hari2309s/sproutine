import { createOpenAI } from '@ai-sdk/openai'

export function getModel() {
  const cerebras = createOpenAI({
    apiKey: process.env.CEREBRAS_API_KEY,
    baseURL: 'https://api.cerebras.ai/v1',
  })
  return cerebras('gpt-oss-120b')
}
