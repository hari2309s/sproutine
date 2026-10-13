/**
 * Runs the "agent-golden" Langfuse dataset as an experiment against the real
 * router and agent functions, and prints per-item + aggregate scores.
 *
 * Requires the dataset to exist — run `pnpm eval:sync-dataset` first (or
 * after editing evals/dataset-items.ts).
 *
 * Run with: pnpm --filter @truffle/ai eval
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../../.env.local') })

import { runAgentItem } from './task'
import {
  intentExactMatch,
  numericFaithfulness,
  responseQualityJudge,
  avgIntentAccuracy,
  avgResponseQuality,
  avgNumericFaithfulness,
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
      evaluators: [intentExactMatch, numericFaithfulness, responseQualityJudge],
      runEvaluators: [avgIntentAccuracy, avgResponseQuality, avgNumericFaithfulness],
      maxConcurrency: 2, // free-tier Gemini quota is 5 req/min; keep bursts well under that
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
