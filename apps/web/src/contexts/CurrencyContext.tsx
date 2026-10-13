'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import { CURRENCY_SYMBOLS } from '@/lib/currency'
import { usePersistedPreference } from '@/hooks/usePersistedPreference'

export type Currency = 'EUR' | 'GBP' | 'USD'

const STORAGE_KEY = 'truffle-currency'

function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && value in CURRENCY_SYMBOLS
}

function formatWithCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(Math.abs(amount))
}

interface CurrencyContextValue {
  currency: Currency
  symbol: string
  setCurrency: (c: Currency) => void
  formatAmount: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'EUR',
  symbol: '€',
  setCurrency: () => {},
  formatAmount: (n) => formatWithCurrency(n, 'EUR'),
})

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = usePersistedPreference<Currency>({
    storageKey: STORAGE_KEY,
    defaultValue: 'EUR',
    metadataField: 'currency',
    normalize: (raw) => (isCurrency(raw) ? raw : null),
  })

  const symbol = CURRENCY_SYMBOLS[currency] ?? '€'

  const formatAmount = useCallback((amount: number) => formatWithCurrency(amount, currency), [currency])

  const value = useMemo(
    () => ({ currency, symbol, setCurrency, formatAmount }),
    [currency, symbol, setCurrency, formatAmount]
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
