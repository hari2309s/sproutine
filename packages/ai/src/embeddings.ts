// Uses the Gemini `gemini-embedding-2` API — works in any serverless environment.
// Output is truncated to 768 dims (MRL) to match the Supabase pgvector column size.
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent`,
    {
      method: 'POST',
      // Header, not query string, so the key never lands in proxy/access logs.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
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
  // pgvector columns are `vector(768)` — a wrong length would
  // be rejected on write (or silently corrupt search). Fail loudly instead.
  if (values.length !== 768) {
    throw new Error(`Gemini embed returned ${values.length} dims, expected 768`)
  }
  return values
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
