'use client'

import { useEffect, useRef, useState } from 'react'
import type { MealSlot } from '@sproutine/food/client'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchRecentFoods, searchFoods, type PickedFood } from '@/lib/foodSearchApi'
import { BottomSheet } from './BottomSheet'
import { FoodDetailStep } from './FoodDetailStep'
import { FoodResultRow } from './FoodResultRow'
import { Icon } from './Icon'

const MIN_QUERY = 2
const DEBOUNCE_MS = 350

type Status = 'idle' | 'loading' | 'done' | 'error' | 'limited'

interface FoodSearchSheetProps {
  slot: MealSlot
  gentle: boolean
  onClose: () => void
  onSaved: (slot: MealSlot) => void
  onScan: () => void
}

export function FoodSearchSheet({ slot, gentle, onClose, onSaved, onScan }: FoodSearchSheetProps) {
  const { t, locale } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ q: string; status: Status; foods: PickedFood[] } | null>(
    null
  )
  const [attempt, setAttempt] = useState(0)
  const [recent, setRecent] = useState<PickedFood[] | null>(null)
  const [picked, setPicked] = useState<PickedFood | null>(null)

  useEffect(() => {
    fetchRecentFoods()
      .then(setRecent)
      .catch(() => setRecent([]))
  }, [])

  // BottomSheet focuses its close button on mount; the search field should win.
  useEffect(() => {
    if (picked) return
    const id = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(id)
  }, [picked])

  const q = query.trim()
  useEffect(() => {
    if (q.length < MIN_QUERY) return
    const ctrl = new AbortController()
    const id = setTimeout(() => {
      searchFoods(q, ctrl.signal)
        .then((foods) => setResult({ q, status: 'done', foods }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return
          const limited = e instanceof Error && e.message === 'rate-limited'
          setResult({ q, status: limited ? 'limited' : 'error', foods: [] })
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(id)
      ctrl.abort()
    }
  }, [q, attempt])
  // Anything other than the latest finished search for this exact query is still loading.
  const status: Status = q.length < MIN_QUERY ? 'idle' : result?.q === q ? result.status : 'loading'
  const results = result?.q === q ? result.foods : []

  const whenLabel = (food: PickedFood): string | null => {
    if (!food.lastAt || !food.lastSlot) return null
    const d = new Date(food.lastAt)
    const days = Math.round(
      (new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000
    )
    const fmtLocale = locale === 'en' ? 'en-GB' : locale
    const when =
      days <= 0
        ? t.search.today
        : days === 1
          ? t.search.yesterday
          : days < 7
            ? d.toLocaleDateString(fmtLocale, { weekday: 'short' })
            : d.toLocaleDateString(fmtLocale, { day: 'numeric', month: 'short' })
    return `${t.meal.slots[food.lastSlot]} · ${when}`
  }

  const searching = q.length >= MIN_QUERY
  const list = searching ? results : (recent ?? [])
  const listLabel = searching
    ? status === 'done'
      ? t.search.results(results.length)
      : t.search.searching
    : t.search.recent

  return (
    <BottomSheet title={t.search.title} onClose={onClose}>
      {picked ? (
        <FoodDetailStep
          food={picked}
          initialSlot={slot}
          gentle={gentle}
          onBack={() => setPicked(null)}
          onSaved={onSaved}
        />
      ) : (
        <div className="flex min-h-[55dvh] flex-col gap-3">
          <span className="eyebrow">{t.search.addTo(t.meal.slots[slot])}</span>
          <div className="flex gap-2">
            <label className="flex h-[52px] flex-1 items-center gap-2 rounded-2xl border border-sproutine-border-strong bg-sproutine-card pr-1.5 pl-3.5 focus-within:border-2 focus-within:border-sproutine-accent focus-within:pl-[13px] focus-within:shadow-[0_0_0_4px_var(--color-sproutine-accent-soft)]">
              <Icon name="search" size={22} className="text-sproutine-text-secondary" />
              <input
                ref={inputRef}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 120))}
                placeholder={t.search.placeholder}
                aria-label={t.search.placeholder}
                className="min-w-0 flex-1 bg-transparent text-base text-sproutine-text outline-none placeholder:text-sproutine-muted focus-visible:shadow-none [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  aria-label={t.search.clear}
                  className="icon-btn h-9 w-9 text-sproutine-text-secondary"
                >
                  <Icon name="close" size={20} />
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={onScan}
              aria-label={t.search.scan}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-sproutine-border-strong bg-sproutine-card text-sproutine-text"
            >
              <Icon name="barcode_scanner" size={24} />
            </button>
          </div>

          <span className="eyebrow pl-1" aria-live="polite">
            {listLabel}
          </span>

          {searching && (status === 'error' || status === 'limited') ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-2 rounded-2xl bg-sproutine-surface px-4 py-3"
            >
              <p className="text-[15px] text-sproutine-text">
                {status === 'limited' ? t.search.tooMany : t.search.failed}
              </p>
              <button
                type="button"
                onClick={() => {
                  setResult(null)
                  setAttempt((n) => n + 1)
                }}
                className="btn-ghost -ml-2 h-11"
              >
                {t.states.retry}
              </button>
            </div>
          ) : searching && status === 'done' && results.length === 0 ? (
            <p className="rounded-2xl bg-sproutine-surface px-4 py-3 text-[15px] text-sproutine-text-secondary">
              {t.search.noResults(q)}
            </p>
          ) : !searching && recent?.length === 0 ? (
            <p className="px-1 text-[15px] text-sproutine-text-secondary">{t.search.noRecent}</p>
          ) : (searching && status !== 'done') || recent === null ? (
            <div className="h-52 animate-pulse rounded-[22px] bg-sproutine-surface" aria-hidden />
          ) : (
            <ul className="card overflow-hidden p-0 shadow-none">
              {list.map((food, i) => (
                <FoodResultRow
                  key={`${food.source}:${food.sourceId}`}
                  food={food}
                  sub={searching ? food.brand : whenLabel(food)}
                  gentle={gentle}
                  first={i === 0}
                  onPick={() => setPicked(food)}
                />
              ))}
            </ul>
          )}

          {searching && status === 'done' && (
            <button
              type="button"
              onClick={onScan}
              className="flex min-h-14 items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-sproutine-border-strong px-3.5 text-left text-sm text-sproutine-text-secondary"
            >
              <Icon name="barcode_scanner" size={22} />
              <span className="flex-1">{t.search.scanInstead}</span>
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
