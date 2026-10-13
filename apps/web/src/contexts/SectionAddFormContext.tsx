'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface SectionAddFormContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

const SectionAddFormContext = createContext<SectionAddFormContextValue | null>(null)

/**
 * Scopes "is the add-form open" state to a single accordion section on the
 * Insights page. Both the section's header toggle button and its embedded
 * content (e.g. SavingsGoalsEmbedded, MonthlyBudgets) read/write this via
 * `useSectionAddForm`, so the parent page doesn't need to own the state and
 * thread it into both places as controlled props.
 */
export function SectionAddFormProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((prev) => !prev), [])

  return (
    <SectionAddFormContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </SectionAddFormContext.Provider>
  )
}

export function useSectionAddForm(): SectionAddFormContextValue {
  const ctx = useContext(SectionAddFormContext)
  if (!ctx) {
    throw new Error('useSectionAddForm must be used within a SectionAddFormProvider')
  }
  return ctx
}
