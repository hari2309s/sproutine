import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { TaskType } from '../types'

export function getModel(task: TaskType) {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY })
  // Flash 3.7 for demanding tasks (reasoning, vision, tool-calling); Flash-Lite 3.5 for cheap fast tasks
  if (task === 'fast-chat') {
    return google('gemini-3.5-flash-lite')
  }
  return google('gemini-3.7-flash')
}
