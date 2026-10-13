/**
 * Runs the "agent-golden" Langfuse dataset as an experiment against the real
 * intent router and safety gate, and prints per-item + aggregate scores.
 *
 * Requires the dataset to exist — run `pnpm eval:sync-dataset` first (or
 * after editing evals/dataset-items.ts).
 *
 * Run with: pnpm --filter @sproutine/ai eval
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(import.meta.dirname, '../../../.env.local') })

import { runAgentItem } from './task'
import {
  intentExactMatch,
  safetyMatch,
  avgIntentAccuracy,
  avgSafetyRecall,
  avgSafetyExactMatch,
  avgSafetyFalsePositive,
} from './evaluators'

const DATASET_NAME = 'agent-golden'

async function run() {
  // Dynamic import: langfuse.ts constructs LangfuseClient/LangfuseSpanProcessor
  // at module-load time, which read env vars eagerly — a static top-of-file
  // import gets hoisted ahead of the dotenv config() call above and reads
  // undefined keys. Deferring the import until after config() has run avoids
  // that ordering trap.
  const { langfuseClient, otelSdk } = await import('../src/langfuse')

  try {
    const dataset = await langfuseClient.dataset.get(DATASET_NAME)

    const result = await dataset.runExperiment({
      name: 'Local golden run',
      description: 'Manual run via pnpm eval',
      task: runAgentItem,
      evaluators: [intentExactMatch, safetyMatch],
      runEvaluators: [avgIntentAccuracy, avgSafetyRecall, avgSafetyExactMatch, avgSafetyFalsePositive],
      maxConcurrency: 2, // stay well under free-tier per-minute limits
    })

    console.log(await result.format())
  } finally {
    await otelSdk.shutdown()
  }
}

run().catch((e) => {
  console.error('Fatal:', e)
  process.exitCode = 1
})
