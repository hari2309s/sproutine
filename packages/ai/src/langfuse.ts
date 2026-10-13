import { registerTelemetry } from 'ai'
import type { Context } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { LangfuseClient } from '@langfuse/client'
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk'
import { maskContactDetails } from './mask'

export { maskContactDetails } from './mask'

// Langfuse tracing setup, shared by the web app and the eval/script runners.
//
// - The AI SDK 7 integration records every generateText/streamText call as a
//   Langfuse generation (model, tokens, cost, reasoning) automatically.
// - Users are identified only by their llm_pseudonym (set via
//   propagateAttributes at the call site). Contact details users type are
//   masked (./mask.ts) in everything exported — see PrepareGenAiSpans.
// - Environment comes from LANGFUSE_TRACING_ENVIRONMENT (development /
//   preview / production) so test traffic stays out of production views.

// The AI SDK integration records prompts and replies as gen_ai.* attributes,
// which the Langfuse processor's own `mask` option doesn't cover (it masks
// langfuse.* input/output/metadata only).
const GEN_AI_CONTENT_KEYS = [
  'gen_ai.input.messages',
  'gen_ai.output.messages',
  'gen_ai.system_instructions',
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
]

/**
 * Runs before the Langfuse processor on every span:
 * - onStart: the AI SDK names spans after the model ("invoke_agent
 *   openai/gpt-oss-120b"). Langfuse best practice is stable, verb-first names
 *   with the model kept as a field, so the agent span takes the call's
 *   telemetry functionId (e.g. "generate-response") and its model call becomes
 *   "call-model". The model stays on the generation.
 * - onEnd: masks contact details in the gen_ai.* message attributes.
 */
class PrepareGenAiSpans implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    const attrs = span.attributes
    const op = attrs['gen_ai.operation.name']
    if (op === 'invoke_agent' && typeof attrs['gen_ai.agent.name'] === 'string') {
      span.updateName(attrs['gen_ai.agent.name'])
    } else if (op === 'chat' || op === 'generate_content' || op === 'text_completion') {
      span.updateName('call-model')
    }
  }

  onEnd(span: ReadableSpan): void {
    // Ended spans reject setAttribute, but processors run in order on the same
    // attributes object, so the Langfuse processor after this one exports the
    // masked values.
    const attrs = span.attributes as Record<string, unknown>
    for (const key of GEN_AI_CONTENT_KEYS) {
      const value = attrs[key]
      if (typeof value === 'string') attrs[key] = maskContactDetails(value)
    }
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }
  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}

type LangfuseGlobals = {
  processor: LangfuseSpanProcessor
  sdk: NodeSDK
  client: LangfuseClient
}

// Next.js dev re-evaluates modules on hot reload; registering a second
// NodeSDK or telemetry integration would duplicate every span.
const globalKey = Symbol.for('sproutine.langfuse')
const globals = globalThis as typeof globalThis & { [globalKey]?: LangfuseGlobals }

function init(): LangfuseGlobals {
  const processor = new LangfuseSpanProcessor({
    mask: ({ data }) => (typeof data === 'string' ? maskContactDetails(data) : data),
  })
  const sdk = new NodeSDK({
    serviceName: 'sproutine',
    // Must run before the Langfuse processor reads the span.
    spanProcessors: [new PrepareGenAiSpans(), processor],
  })
  sdk.start()
  registerTelemetry(new LangfuseVercelAiSdkIntegration())
  return { processor, sdk, client: new LangfuseClient() }
}

const langfuse = (globals[globalKey] ??= init())

export const langfuseSpanProcessor = langfuse.processor
// Exported so short-lived processes (evals, scripts) can shutdown() to flush.
export const otelSdk = langfuse.sdk
export const langfuseClient = langfuse.client
