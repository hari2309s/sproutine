import { createMistral } from '@ai-sdk/mistral'

export function getModel() {
  const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY })
  return mistral('mistral-small-latest')
}
