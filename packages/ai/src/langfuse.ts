import { registerTelemetry } from 'ai'
import type { Context } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import type { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { LangfuseClient } from '@langfuse/client'
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk'

// Langfuse tracing setup, shared by the web app and the eval/script runners.
//
// - The AI SDK 7 integration records every generateText/streamText call as a
//   Langfuse generation (model, tokens, cost, reasoning) automatically.
// - Users are identified only by their llm_pseudonym (set via
//   propagateAttributes at the call site). The mask below is a second line of
//   defence for contact details users type into chat.
// - Environment comes from LANGFUSE_TRACING_ENVIRONMENT (development /
//   preview / production) so test traffic stays out of production views.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
// International or German-style phone numbers with at least 8 digits.
const PHONE = /(?:\+|00)?\d[\d\s/()-]{6,}\d/g

/** Replaces emails and phone numbers in any traced input, output or metadata. */
export function maskContactDetails(data: string): string {
  return data.replace(EMAIL, '[email]').replace(PHONE, (match) =>
    match.replace(/\D/g, '').length >= 8 ? '[phone]' : match
  )
}

/**
 * The AI SDK names its spans after the model ("invoke_agent openai/gpt-oss-120b",
 * "chat openai/gpt-oss-120b"). Langfuse best practice is stable, verb-first
 * names with the model kept as a field, so rename them at start: the agent
 * span takes the call's telemetry functionId (e.g. "generate-response") and
 * its model call becomes "call-model". The model is still on the generation.
 */
class NameGenAiSpans implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    const attrs = span.attributes
    const op = attrs['gen_ai.operation.name']
    if (op === 'invoke_agent' && typeof attrs['gen_ai.agent.name'] === 'string') {
      span.updateName(attrs['gen_ai.agent.name'])
    } else if (op === 'chat' || op === 'generate_content' || op === 'text_completion') {
      span.updateName('call-model')
    }
  }

  onEnd(_span: ReadableSpan): void {}
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
    // Renaming must run before the Langfuse processor reads the span.
    spanProcessors: [new NameGenAiSpans(), processor],
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
