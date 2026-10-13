'use client'

import { useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransactionCategory } from '@truffle/types'
import { CATEGORY_EMOJI } from '@/lib/categories'
import {
  type TransactionFilters,
  type TypeFilter,
  type DatePreset,
} from '@/hooks/useTransactionFilters'
import { useLanguage } from '@/contexts/LanguageContext'

const pillActive = 'bg-truffle-amber text-truffle-bg'
const pillIdle = 'bg-truffle-surface text-truffle-muted hover:text-truffle-text'

const DATE_PRESET_KEYS: DatePreset[] = ['all', 'week', 'month', 'last_month', '3months']

type PanelFilters = Pick<
  TransactionFilters,
  | 'search'
  | 'setSearch'
  | 'typeFilter'
  | 'setTypeFilter'
  | 'datePreset'
  | 'setDatePreset'
  | 'activeCategories'
  | 'toggleCategory'
  | 'availableCategories'
  | 'filtersOpen'
  | 'setFiltersOpen'
  | 'activeFilterCount'
>

interface Props {
  filters: PanelFilters
}

export function TransactionFilterPanel({ filters }: Props) {
  const {
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
  } = filters
  const { t } = useLanguage()
  const panelId = useId()

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-truffle-muted text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.filter.searchPlaceholder}
            className="w-full bg-truffle-surface border border-truffle-border rounded-xl pl-8 pr-4 py-2 text-sm text-truffle-text placeholder:text-truffle-muted focus:outline-none focus:border-truffle-amber"
          />
        </div>

        <button
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
            filtersOpen || activeFilterCount > 0
              ? 'bg-truffle-amber border-truffle-amber text-truffle-bg'
              : 'bg-truffle-surface border-truffle-border text-truffle-muted hover:text-truffle-text'
          }`}
        >
          <span>{t.filter.filters}</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-truffle-bg text-truffle-amber text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
          <motion.span
            animate={{ rotate: filtersOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block"
          >
            ▾
          </motion.span>
        </button>
      </div>

      <div id={panelId}>
      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            key="filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(['all', 'expenses', 'income'] as TypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      typeFilter === type ? pillActive : pillIdle
                    }`}
                  >
                    {type === 'all'
                      ? t.filter.all
                      : type === 'expenses'
                        ? t.filter.expenses
                        : t.filter.income}
                  </button>
                ))}
              </div>

              {/* Date presets */}
              <div className="flex gap-2 justify-between overflow-x-auto pb-1 scrollbar-none">
                {DATE_PRESET_KEYS.map((value) => (
                  <button
                    key={value}
                    onClick={() => setDatePreset(value)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      datePreset === value ? pillActive : pillIdle
                    }`}
                  >
                    {t.filter.datePresets[value] ?? value}
                  </button>
                ))}
              </div>

              {/* Category pills */}
              {availableCategories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {availableCategories.map((cat: TransactionCategory) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        activeCategories.has(cat)
                          ? 'bg-truffle-amber border-truffle-amber text-truffle-bg'
                          : 'bg-truffle-surface border-truffle-border text-truffle-muted hover:text-truffle-text'
                      }`}
                    >
                      <span>{CATEGORY_EMOJI[cat]}</span>
                      <span>{t.categories[cat] ?? cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
