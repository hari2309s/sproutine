export type Provider = 'groq' | 'gemini' | 'cerebras' | 'openrouter' | 'mistral'

export type TaskType = 'fast-chat' | 'reasoning' | 'vision' | 'tool-calling'

export interface EvalLogEntry {
  provider: Provider
  task: TaskType
  input: string
  output: string
  latencyMs: number
  tokensUsed: number
  traceId?: string
}
