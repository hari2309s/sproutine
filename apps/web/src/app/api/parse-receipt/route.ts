import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { startObservation } from '@langfuse/tracing'
import { visionModel, langfuseSpanProcessor } from '@truffle/ai'
import type { TransactionCategory } from '@truffle/types'
import { requireUser } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const maxDuration = 30

const VALID_CATEGORIES = new Set<TransactionCategory>([
  'food_groceries',
  'food_delivery',
  'transport',
  'housing',
  'utilities',
  'subscriptions',
  'health',
  'entertainment',
  'shopping',
  'income',
  'savings',
  'other',
])

function sanitiseCategory(raw: string): TransactionCategory {
  const cleaned = raw.toLowerCase().replace(/\s+/g, '_') as TransactionCategory
  return VALID_CATEGORIES.has(cleaned) ? cleaned : 'other'
}

const EXTRACT_PROMPT = (today: string) => `You are a financial data extraction assistant.
Analyse this receipt or bank statement and extract every transaction you can see.

Return ONLY a valid JSON array — no markdown fences, no explanation, nothing else.
Each item must follow this exact shape:
{
  "date": "YYYY-MM-DD",
  "description": "merchant name or short description",
  "amount": -12.50,
  "currency": "EUR",
  "category": "food_groceries"
}

Rules:
- amount: negative for purchases/expenses, positive for income/refunds/credits
- date: use ISO format YYYY-MM-DD; if only month/day visible assume year from context; if no date at all use today (${today})
- currency: infer from symbol (€ → EUR, £ → GBP, $ → USD); default EUR
- category: pick the single best fit from this list exactly as written:
  food_groceries, food_delivery, transport, housing, utilities, subscriptions,
  health, entertainment, shopping, income, savings, other
- For a single receipt with one total, return one item
- For a bank statement listing multiple rows, return all rows
- If nothing can be extracted return []`

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireUser(req)
    if (errorResponse) return errorResponse

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const mimeType = file.type
    const isImage = mimeType.startsWith('image/')
    const isPDF = mimeType === 'application/pdf'

    if (!isImage && !isPDF) {
      return NextResponse.json(
        { error: 'Only images (JPEG, PNG, WEBP) and PDFs are supported' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const today = new Date().toISOString().slice(0, 10)

    const mediaPart = isPDF
      ? { type: 'file' as const, data: base64, mediaType: 'application/pdf' as const }
      : {
          type: 'image' as const,
          image: base64,
          mediaType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        }

    const trace = startObservation('parse_receipt', {
      input: EXTRACT_PROMPT(today),
      metadata: { fileType: isPDF ? 'pdf' : 'image', mimeType, fileSize: file.size },
    })
    const generation = trace.startObservation(
      'extractTransactions',
      { model: 'gemini-3.7-flash', input: EXTRACT_PROMPT(today) },
      { asType: 'generation' }
    )

    const { text, usage } = await generateText({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [mediaPart, { type: 'text' as const, text: EXTRACT_PROMPT(today) }],
        },
      ],
    })

    generation
      .update({
        output: text,
        usageDetails: usage
          ? { input: usage.inputTokens ?? 0, output: usage.outputTokens ?? 0 }
          : undefined,
      })
      .end()
    trace.end()
    await langfuseSpanProcessor.forceFlush()

    // Strip markdown fences if model wraps despite instructions
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\n?/, '')
      .replace(/\n?```$/, '')

    let raw: unknown
    try {
      raw = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Model returned unparseable output', raw: text },
        { status: 422 }
      )
    }

    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'Expected array from model', raw: text }, { status: 422 })
    }

    const transactions = raw
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      )
      .map((item) => ({
        date: String(item.date ?? today),
        description: String(item.description ?? 'Unknown'),
        amount: Number(item.amount ?? 0),
        currency: ['EUR', 'GBP', 'USD'].includes(String(item.currency))
          ? (String(item.currency) as 'EUR' | 'GBP' | 'USD')
          : 'EUR',
        category: sanitiseCategory(String(item.category ?? 'other')),
      }))
      .filter((t) => !isNaN(t.amount) && t.amount !== 0)

    return NextResponse.json({ transactions })
  } catch (err) {
    console.error('[parse-receipt]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
