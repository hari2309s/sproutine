'use client'

import { CURRENCY_SYMBOLS } from '@/lib/currency'
import type { Currency } from '@/contexts/CurrencyContext'

const CURRENCIES = Object.keys(CURRENCY_SYMBOLS) as Currency[]

interface CurrencyPickerProps {
  value: Currency
  onChange: (currency: Currency) => void
}

export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
            value === c
              ? 'bg-truffle-amber text-truffle-bg'
              : 'bg-truffle-surface text-truffle-muted border border-truffle-border'
          }`}
        >
          {CURRENCY_SYMBOLS[c]} {c}
        </button>
      ))}
    </div>
  )
}
