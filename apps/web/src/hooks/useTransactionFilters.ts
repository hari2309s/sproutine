import { useState, useMemo } from 'react'
import type { Transaction, TransactionCategory } from '@truffle/types'

export type TypeFilter = 'all' | 'expenses' | 'income'
export type DatePreset = 'all' | 'week' | 'month' | 'last_month' | '3months'

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: '3months', label: '3 months' },
]

function getDateRange(preset: DatePreset): { from: Date; to: Date } | null {
  if (preset === 'all') return null
  const now = new Date()
  const to = new Date(now)
  let from: Date
  if (preset === 'week') {
    from = new Date(now)
    from.setDate(now.getDate() - 6)
  } else if (preset === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (preset === 'last_month') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    to.setDate(0)
  } else {
    from = new Date(now)
    from.setMonth(now.getMonth() - 3)
  }
  from.setHours(0, 0, 0, 0)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

export interface TransactionFilters {
  search: string
  setSearch: (v: string) => void
  typeFilter: TypeFilter
  setTypeFilter: (v: TypeFilter) => void
  datePreset: DatePreset
  setDatePreset: (v: DatePreset) => void
  activeCategories: Set<TransactionCategory>
  toggleCategory: (cat: TransactionCategory) => void
  availableCategories: TransactionCategory[]
  filtersOpen: boolean
  setFiltersOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  activeFilterCount: number
  isFiltered: boolean
  filtered: Transaction[]
  clearFilters: () => void
}

export function useTransactionFilters(transactions: Transaction[]): TransactionFilters {
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [activeCategories, setActiveCategories] = useState<Set<TransactionCategory>>(new Set())

  const availableCategories = useMemo<TransactionCategory[]>(() => {
    const seen = new Set<TransactionCategory>()
    for (const tx of transactions) seen.add(tx.category)
    return Array.from(seen)
  }, [transactions])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const dateRange = getDateRange(datePreset)
    return transactions.filter((tx) => {
      if (typeFilter === 'expenses' && tx.amount >= 0) return false
      if (typeFilter === 'income' && tx.amount <= 0) return false
      if (activeCategories.size > 0 && !activeCategories.has(tx.category)) return false
      if (dateRange) {
        const d = new Date(tx.date)
        if (d < dateRange.from || d > dateRange.to) return false
      }
      if (
        q &&
        !tx.description.toLowerCase().includes(q) &&
        !(tx.merchant ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [transactions, typeFilter, activeCategories, datePreset, search])

  function toggleCategory(cat: TransactionCategory) {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('all')
    setDatePreset('all')
    setActiveCategories(new Set())
  }

  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) + (datePreset !== 'all' ? 1 : 0) + activeCategories.size

  const isFiltered = search.trim() !== '' || activeFilterCount > 0

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    datePreset,
    setDatePreset,
    activeCategories,
    toggleCategory,
    availableCategories,
    filtersOpen,
    setFiltersOpen,
    activeFilterCount,
    isFiltered,
    filtered,
    clearFilters,
  }
}
