export { embedText, cosineSimilarity } from './embeddings'
export { routeIntent, classifyIntent, keywordIntent } from './intent'
export type { IntentResult } from './intent'
export { classifySafety, keywordScreen, SAFE_RESPONSES, SAFETY_MAX_CHARS } from './safety'
export { buildSystemPrompt } from './systemPrompt'
export { groqProviderOptions, groqChatProviderOptions } from './llm'
export { langfuseSpanProcessor, langfuseClient, otelSdk, maskContactDetails } from './langfuse'
export { MODELS, getModelId } from './models'
export {
  DAILY_LIMITS,
  dailyLimit,
  disabledProviders,
  PRIORITY_ORDER,
  selectModel,
  selectModelCandidates,
  routedGenerateText,
  routedGenerateObject,
} from './router'
export type { ModelCandidate } from './router'
export { logEval, incrementUsage, getGlobalUsage, consumeUserQuota } from './eval'
export type { Provider, TaskType, EvalLogEntry } from './types'
export { parseMeal, normalizeParsedMeal, ParsedMealSchema } from './mealParse'
export { parseMealPhoto } from './mealVision'
export { parsePlanRequest, keywordPlanPreferences, normalizePlanRequest } from './planRequest'
export { searchKnowledge, formatKnowledgeContext, KNOWLEDGE } from './knowledge'
export type { SearchResult, KnowledgeChunk } from './knowledge'
