import { readFileSync } from 'fs'
import type { TransactionCategory } from '@truffle/types'
import { routedGenerateText } from '../src/router'
import { CATEGORY_GUIDANCE } from '../src/prompts/categorization.prompt'

export interface TransactionRow {
  description: string
  amount: number
  category: TransactionCategory
  merchant: string
}

// CSVs here have no quoted/embedded commas (verified with `awk -F, '{print NF}'`),
// so a plain split is safe and avoids pulling in a CSV parsing dependency.
export function loadCsvRows(csvPath: string): TransactionRow[] {
  const lines = readFileSync(csvPath, 'utf-8').trim().split('\n')
  const [, ...rows] = lines
  return rows
    .map((line) => {
      const [, description, amount, category, merchant] = line.split(',')
      return { description, amount, category, merchant }
    })
    .filter((r): r is { description: string; amount: string; category: string; merchant: string } =>
      Boolean(r.description && r.category)
    )
    .map((r) => ({
      description: r.description,
      amount: Number(r.amount),
      category: r.category as TransactionCategory,
      merchant: r.merchant ?? '',
    }))
}

// Deterministic (file-order) sample, N rows per category — keeps eval cost/latency
// bounded per Weco iteration instead of scoring the entire dataset every step.
export function sampleStratified(rows: TransactionRow[], perCategory: number): TransactionRow[] {
  const byCategory = new Map<string, TransactionRow[]>()
  for (const row of rows) {
    const bucket = byCategory.get(row.category) ?? []
    if (bucket.length < perCategory) {
      bucket.push(row)
      byCategory.set(row.category, bucket)
    }
  }
  return [...byCategory.values()].flat()
}

function parseCategoryToken(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '')
}

export async function runCategoryEval(rows: TransactionRow[]): Promise<void> {
  const systemPrompt = `You categorize personal finance transactions. ${CATEGORY_GUIDANCE}\nRespond with ONLY the category token — no punctuation, no explanation.`

  let correct = 0
  for (const row of rows) {
    const userPrompt = `Description: ${row.description}\nAmount: ${row.amount}\nMerchant: ${row.merchant || 'unknown'}\n\nCategory:`

    // 'tool-calling' routes to GPT-OSS 120B, a reasoning model. Under AI SDK v5,
    // reasoning tokens count against maxOutputTokens, so a tight budget (e.g. 10)
    // gets fully consumed by the chain-of-thought and leaves `text` empty. 128
    // covers the low-effort reasoning plus the one-word category token.
    const { text } = await routedGenerateText('tool-calling', {
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 128,
    })

    const predicted = parseCategoryToken(text)
    const ok = predicted === row.category
    if (ok) correct++
    console.log(
      `${ok ? '✓' : '✗'} "${row.description.slice(0, 40)}" → ${predicted} (expected ${row.category})`
    )
  }

  const accuracy = rows.length ? correct / rows.length : 0
  console.log(`\n${correct}/${rows.length} correct`)
  console.log(`accuracy: ${accuracy.toFixed(4)}`)
}
