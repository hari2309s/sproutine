export type Provider = 'groq' | 'gemini' | 'cerebras' | 'openrouter' | 'mistral'

export type TaskType =
  | 'fast-chat' // frequent, simple replies
  | 'classify' // intent labels — tiny prompts, every message
  | 'safety' // safety gate classifier — every message
  | 'reasoning' // meal planning, multi-step answers
  | 'structured' // schema-validated JSON output (plans, logs)
  | 'tool-calling' // food lookup + logging tools
  | 'vision' // meal photos

export interface EvalLogEntry {
  provider: Provider
  task: TaskType
  input: string
  output: string
  latencyMs: number
  tokensUsed: number
  traceId?: string
}
