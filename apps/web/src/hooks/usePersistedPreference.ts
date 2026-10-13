'use client'

// Shared plumbing for the app's "persisted preference" contexts (currency,
// voice, language): a value that lives in localStorage for instant access on
// every load, and — for account-level preferences — gets overridden once the
// Supabase session resolves and reveals a saved `user_metadata` value.
//
// Extracted from three near-identical hand-rolled implementations
// (CurrencyContext, VoiceContext, LanguageContext). Each context differs in
// a few small ways (how a raw value is validated/migrated, whether it syncs
// with Supabase at all, what happens when Supabase disagrees with what's
// stored locally), so those bits are pluggable rather than baked in.

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage unavailable (private mode, disabled storage, etc.) —
    // the in-memory value still works for the rest of the session.
  }
}

export interface UsePersistedPreferenceOptions<T extends string> {
  /** localStorage key the preference is cached under. */
  storageKey: string
  /** Value used until anything is loaded, and if nothing else validates. */
  defaultValue: T
  /**
   * Validate (and optionally migrate) a raw value — from localStorage or
   * from Supabase `user_metadata` — into T. Return null/undefined to reject
   * it. Used for both sources, since "is this a value we accept" is the
   * same question either way.
   */
  normalize: (raw: unknown) => T | null | undefined
  /**
   * `user_metadata` field name holding the account-level preference. When
   * omitted, the hook never calls Supabase — purely a localStorage value
   * (e.g. LanguageContext, which today has no account-level sync of its
   * own — that happens elsewhere, driven by the exposed setter).
   */
  metadataField?: string
  /**
   * Used only when localStorage has no valid value yet, to seed a smarter
   * first-run default than the static `defaultValue` (e.g. matching the
   * browser's language). Must be SSR-safe (guard on `typeof window` /
   * `typeof navigator` internally) — it only ever runs client-side, inside
   * an effect, but is written defensively regardless.
   */
  detectFallback?: () => T | null | undefined
  /**
   * Fires when the Supabase-sourced value differs from what was actually
   * stored in `user_metadata` (i.e. `normalize` migrated a legacy value).
   * Use it to self-heal the account record. Best-effort — the hook does
   * not await or retry it.
   */
  onRemoteNormalize?: (normalized: T, raw: unknown) => void
}

export type UsePersistedPreferenceResult<T> = [T, (next: T) => void]

// Same-tab writes don't fire the `storage` event, so writers notify
// subscribers directly. Other tabs are covered by the real `storage` event.
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function writeAndNotify(key: string, value: string) {
  safeSetItem(key, value)
  listeners.forEach((l) => l())
}

export function usePersistedPreference<T extends string>({
  storageKey,
  defaultValue,
  normalize,
  metadataField,
  detectFallback,
  onRemoteNormalize,
}: UsePersistedPreferenceOptions<T>): UsePersistedPreferenceResult<T> {
  // localStorage is an external store: reading it through
  // useSyncExternalStore gives the server/first-hydration render the default
  // and the client the stored value, without a setState-in-effect re-render.
  // Snapshots are strings, so referential stability is free.
  const value = useSyncExternalStore(
    subscribe,
    () => normalize(safeGetItem(storageKey)) ?? detectFallback?.() ?? defaultValue,
    () => defaultValue
  )

  // Account-level value from Supabase wins once the session resolves.
  useEffect(() => {
    if (!metadataField) return
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const raw = data.session?.user?.user_metadata?.[metadataField]
      const normalized = normalize(raw)
      if (normalized != null) {
        writeAndNotify(storageKey, normalized)
        if (normalized !== raw) onRemoteNormalize?.(normalized, raw)
      }
    })
    return () => {
      cancelled = true
    }
    // Intentionally mount-only: the account value is resolved once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setValue = useCallback((next: T) => writeAndNotify(storageKey, next), [storageKey])

  return [value, setValue]
}
