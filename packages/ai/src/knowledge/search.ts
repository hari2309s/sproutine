import { KNOWLEDGE, type KnowledgeChunk } from './chunks'

/**
 * Searches the knowledge base using keyword matching. Returns the top-k most
 * relevant chunks for the given query. Uses a simple TF-IDF-like scoring:
 * topic matches are weighted higher than text matches.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'it', 'in', 'on', 'to', 'of', 'for', 'and', 'or',
  'but', 'not', 'with', 'from', 'by', 'at', 'as', 'be', 'was', 'are', 'has',
  'have', 'had', 'do', 'does', 'did', 'will', 'can', 'could', 'should',
  'would', 'may', 'might', 'i', 'me', 'my', 'we', 'you', 'your', 'they',
  'this', 'that', 'what', 'which', 'how', 'much', 'many', 'some', 'about',
  'just', 'also', 'very', 'too', 'more', 'most', 'really', 'so', 'than',
  'then', 'if', 'when', 'where', 'why', 'who', 'whom', 'there', 'here',
  'all', 'any', 'each', 'every', 'both', 'few', 'no', 'own', 'same',
  'such', 'other', 'only', 'up', 'out', 'into', 'over', 'after', 'before',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

/** Scores a chunk against query tokens. Topic matches count 3×. */
function score(chunk: KnowledgeChunk, queryTokens: string[]): number {
  if (!queryTokens.length) return 0
  let s = 0

  const topicStr = chunk.topics.join(' ').toLowerCase()
  const textStr = chunk.text.toLowerCase()

  for (const token of queryTokens) {
    // Exact topic match (high signal)
    if (chunk.topics.some((t) => t.toLowerCase() === token)) {
      s += 5
    }
    // Partial topic match
    else if (topicStr.includes(token)) {
      s += 3
    }
    // Text body match
    if (textStr.includes(token)) {
      s += 1
    }
  }

  // Bonus for multi-word topic matches (e.g. "vitamin d" as a phrase)
  const query = queryTokens.join(' ')
  for (const topic of chunk.topics) {
    if (topic.length > 3 && query.includes(topic.toLowerCase())) {
      s += 4
    }
  }

  return s
}

export interface SearchResult {
  chunk: KnowledgeChunk
  score: number
}

/**
 * Returns the top-k knowledge chunks for a query, sorted by relevance.
 * Only chunks scoring above 0 are returned.
 */
export function searchKnowledge(query: string, topK = 3): SearchResult[] {
  const tokens = tokenize(query)
  if (!tokens.length) return []

  const scored = KNOWLEDGE.map((chunk) => ({
    chunk,
    score: score(chunk, tokens),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, topK)
}

/** Formats search results as context for the system prompt. */
export function formatKnowledgeContext(results: SearchResult[]): string {
  if (!results.length) return ''

  const lines = ['## Nutrition knowledge (cite the source when you use these facts)']
  for (const { chunk } of results) {
    lines.push(`\n[${chunk.id}] ${chunk.text}\n— Source: ${chunk.source}`)
  }
  return lines.join('\n')
}
