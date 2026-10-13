import { createOpenAI } from '@ai-sdk/openai'

export function getModel() {
  const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': 'https://truffle.app',
    },
  })
  return openrouter('meta-llama/llama-3.3-70b-instruct:free')
}
