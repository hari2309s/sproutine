import { NodeSDK } from '@opentelemetry/sdk-node'
import { LangfuseSpanProcessor } from '@langfuse/otel'
import { LangfuseClient } from '@langfuse/client'

export const langfuseSpanProcessor = new LangfuseSpanProcessor()

// Exported (not just started) so short-lived processes — eval/experiment
// scripts — can call otelSdk.shutdown() to flush pending spans before exit.
export const otelSdk = new NodeSDK({
  spanProcessors: [langfuseSpanProcessor],
})
otelSdk.start()

export const langfuseClient = new LangfuseClient()
