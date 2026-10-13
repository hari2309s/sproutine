'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePostHog } from 'posthog-js/react'
import type { TransactionCategory } from '@truffle/types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useImportFlow, ImportSuccess } from '@/hooks/useImportFlow'
import { CURRENCY_SYMBOLS } from '@/lib/currency'

interface ParsedTransaction {
  date: string
  description: string
  amount: number
  currency: 'EUR' | 'GBP' | 'USD'
  category: TransactionCategory
}

interface ReceiptUploadProps {
  userId: string
  onClose?: () => void
}

const MAX_SIZE_MB = 10

export function ReceiptUpload({ userId, onClose }: ReceiptUploadProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const posthog = usePostHog()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ file: File; objectUrl: string } | null>(null)
  const [parsed, setParsed] = useState<ParsedTransaction[] | null>(null)
  const flow = useImportFlow()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    flow.reset()
    setParsed(null)

    const isPDF = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPDF && !isImage) {
      flow.setError(t.receiptUpload.invalidFile)
      return
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      flow.setError(t.receiptUpload.fileTooLarge(MAX_SIZE_MB))
      return
    }

    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl)
    const objectUrl = isImage ? URL.createObjectURL(file) : ''
    setPreview({ file, objectUrl })
  }

  const handleParse = async () => {
    if (!preview) return
    flow.startLoading()

    try {
      const fd = new FormData()
      fd.append('file', preview.file)

      const res = await fetch('/api/parse-receipt', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) {
        flow.setError(json.error ?? t.receiptUpload.parseError)
        return
      }

      if (!json.transactions?.length) {
        flow.setError(t.receiptUpload.noTransactions)
        return
      }

      posthog.capture('receipt_scanned', {
        transaction_count: json.transactions.length,
        file_type: preview.file.type,
      })

      setParsed(json.transactions as ParsedTransaction[])
    } catch {
      flow.setError(t.receiptUpload.somethingWrong)
    } finally {
      flow.stopLoading()
    }
  }

  const handleImport = async () => {
    if (!parsed) return
    flow.startLoading()
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: parsed.map((tx) => ({
            ...tx,
            merchant: tx.description,
            isRecurring: false,
          })),
        }),
      })
      if (!res.ok) throw new Error('Import failed')

      await queryClient.invalidateQueries({ queryKey: ['transactions', userId] })

      posthog.capture('receipt_imported', { transaction_count: parsed.length })

      flow.markImported()
    } catch {
      flow.setError(t.receiptUpload.importFailed)
    } finally {
      flow.stopLoading()
    }
  }

  const reset = () => {
    if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl)
    setPreview(null)
    setParsed(null)
    flow.reset()
    if (fileRef.current) fileRef.current.value = ''
  }

  if (flow.imported) {
    return (
      <ImportSuccess
        message={t.receiptUpload.imported(parsed?.length ?? 0)}
        doneLabel={t.receiptUpload.done}
        onDone={onClose}
      />
    )
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-truffle-text">{t.receiptUpload.title}</h3>
        <span className="text-xs text-truffle-muted">{t.receiptUpload.hint}</span>
      </div>

      {!preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-truffle-border rounded-xl py-8 flex flex-col items-center gap-2 cursor-pointer hover:border-truffle-amber transition-colors"
        >
          <span className="text-2xl">🧾</span>
          <p className="text-sm text-truffle-muted">{t.receiptUpload.tapToSelect}</p>
          <p className="text-xs text-truffle-muted">{t.receiptUpload.fileTypes}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </button>
      )}

      {preview && !parsed && (
        <div className="space-y-3">
          {preview.objectUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={preview.objectUrl}
              alt="Receipt preview"
              width={400}
              height={192}
              className="w-full max-h-48 object-contain rounded-lg border border-truffle-border"
            />
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-truffle-border bg-truffle-surface">
              <span className="text-lg">📄</span>
              <span className="text-sm text-truffle-text truncate">{preview.file.name}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost flex-1 text-sm">
              {t.receiptUpload.changeFile}
            </button>
            <button
              onClick={handleParse}
              disabled={flow.isLoading}
              className="btn-primary flex-1 text-sm disabled:opacity-50"
            >
              {flow.isLoading ? t.receiptUpload.analysing : t.receiptUpload.extractTransactions}
            </button>
          </div>
        </div>
      )}

      {parsed && (
        <div className="space-y-3">
          <p className="text-sm text-truffle-muted">
            {t.receiptUpload.transactionsFound(parsed.length)}
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {parsed.map((tx, i) => {
              const sym = CURRENCY_SYMBOLS[tx.currency] ?? tx.currency
              return (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-truffle-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-truffle-text truncate block">{tx.description}</span>
                    <span className="text-truffle-muted">
                      {tx.date} · {tx.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span
                    className={`ml-3 font-medium tabular-nums ${tx.amount >= 0 ? 'text-truffle-green' : 'text-truffle-red'}`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {sym}
                    {Math.abs(tx.amount).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={reset} className="btn-ghost flex-1 text-sm">
              {t.receiptUpload.tryAgain}
            </button>
            <button
              onClick={handleImport}
              disabled={flow.isLoading}
              className="btn-primary flex-1 text-sm disabled:opacity-50"
            >
              {flow.isLoading ? t.receiptUpload.importing : t.receiptUpload.import(parsed.length)}
            </button>
          </div>
        </div>
      )}

      {flow.error && <p className="text-sm text-truffle-red">{flow.error}</p>}
    </div>
  )
}
