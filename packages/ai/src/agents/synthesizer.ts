import { streamText } from 'ai'
import { selectModel } from '../router'
import { groqProviderOptions } from '../llm'
import { SYNTHESIZER_PROMPT } from '../prompts/synthesizer.prompt'

export async function synthesizeResponse(analysis: string, question: string) {
  const { model } = await selectModel('fast-chat')
  const prompt = SYNTHESIZER_PROMPT.replace('{analysis}', analysis).replace('{question}', question)

  return streamText({
    model,
    prompt,
    // Was 200 — GPT-OSS reasoning tokens share this budget and were truncating
    // the spoken answer. `providerOptions` keeps the reasoning out of `text`.
    maxOutputTokens: 600,
    providerOptions: groqProviderOptions,
  })
}
