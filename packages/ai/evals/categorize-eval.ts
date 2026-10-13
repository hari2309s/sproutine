/**
 * Category-accuracy eval for weco.ai optimization.
 * Run with: pnpm --filter @truffle/ai run eval:categorize
 *
 * Scores CATEGORY_GUIDANCE (src/prompts/categorization.prompt.ts) against a
 * fixed, stratified sample (3 rows/category) of transactions.csv. Prints
 * `accuracy: N` to stdout — the line `weco run -m accuracy` parses.
 *
 * Requires env vars: GROQ_API_KEY / GEMINI_API_KEY (whichever the router picks).
 */

// Load .env.local from repo root before importing anything
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../../../.env.local') })

import { loadCsvRows, sampleStratified, runCategoryEval } from './categorize-lib'

const CSV_PATH = resolve(__dirname, '../../../transactions.csv')
const SAMPLE_PER_CATEGORY = 3

async function run() {
  const sample = sampleStratified(loadCsvRows(CSV_PATH), SAMPLE_PER_CATEGORY)
  console.log(`\nRunning categorization eval (${sample.length} sampled rows)...\n`)
  await runCategoryEval(sample)
}

run().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
