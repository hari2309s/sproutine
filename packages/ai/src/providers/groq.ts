import { createGroq } from '@ai-sdk/groq'
import type { TaskType } from '../types'

export function getModel(task: TaskType) {
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
  // Qwen 3.6 27B is Groq's current multimodal model (replaced Llama 4 Scout).
  if (task === 'vision') {
    return groq('qwen/qwen3.6-27b')
  }
  // GPT-OSS 20B for cheap high-volume chat; GPT-OSS 120B for reasoning / tool calls.
  if (task === 'fast-chat') {
    return groq('openai/gpt-oss-20b')
  }
  return groq('openai/gpt-oss-120b')
}
