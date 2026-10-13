import type { Transaction } from '@truffle/types'

// Uses the Gemini `gemini-embedding-2` API — works in any serverless environment.
// Output is truncated to 768 dims (MRL) to match the Supabase pgvector column size.
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini embed error: ${err}`)
  }

  const json = (await res.json()) as { embedding: { values: number[] } }
  const values = json.embedding?.values ?? []
  // The `transactions.embedding` column is `vector(768)` — a wrong length would
  // be rejected on write (or silently corrupt search). Fail loudly instead.
  if (values.length !== 768) {
    throw new Error(`Gemini embed returned ${values.length} dims, expected 768`)
  }
  return values
}

export async function embedTransaction(transaction: Transaction): Promise<number[]> {
  const text = [
    transaction.description,
    transaction.category.replace(/_/g, ' '),
    transaction.amount > 0 ? 'income' : 'expense',
    `€${Math.abs(transaction.amount).toFixed(2)}`,
    transaction.merchant ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return embedText(text)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have the same length')
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    normA += (a[i] ?? 0) * (a[i] ?? 0)
    normB += (b[i] ?? 0) * (b[i] ?? 0)
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
