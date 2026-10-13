/**
 * Pushes evals/dataset-items.ts (the reviewable, git-diffable source of truth)
 * into the Langfuse dataset "agent-golden". Idempotent — items upsert on their
 * stable `id`, so re-running after editing dataset-items.ts just updates them.
 *
 * Run with: pnpm --filter @truffle/ai eval:sync-dataset
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../../.env.local') })

import { LangfuseClient } from '@langfuse/client'
import { EVAL_DATASET_ITEMS } from './dataset-items'

const DATASET_NAME = 'agent-golden'

async function run() {
  const langfuse = new LangfuseClient()

  const exists = await langfuse.api.datasets
    .get(DATASET_NAME)
    .then(() => true)
    .catch((e) => {
      // Only a 404 means "doesn't exist yet" — an auth/network/5xx error here
      // must surface, not be silently treated as a green light to (re-)create.
      if (e?.statusCode === 404) return false
      throw e
    })

  if (!exists) {
    await langfuse.api.datasets.create({
      name: DATASET_NAME,
      description:
        'Router intent-classification cases plus per-agent response cases (affordabilityChecker, forecaster, spendingAnalyst, savingsGoalAdvisor, habitAdvisor, anomalyReviewer) against the fixed Hari fixture set. Source of truth: packages/ai/evals/dataset-items.ts.',
    })
    console.log(`Created dataset "${DATASET_NAME}"`)
  }

  for (const item of EVAL_DATASET_ITEMS) {
    await langfuse.dataset.createItem({
      datasetName: DATASET_NAME,
      id: item.id,
      input: item.input,
      metadata: item.metadata,
    })
    console.log(`✓ upserted ${item.id}`)
  }

  console.log(`\nSynced ${EVAL_DATASET_ITEMS.length} items to dataset "${DATASET_NAME}"`)
}

run().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
