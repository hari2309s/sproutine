'use client'

import { useState } from 'react'
import { signOut } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { deleteAccount } from '@/lib/settingsApi'
import { Icon } from './Icon'

export function DeleteAccountSection() {
  const { t } = useLanguage()
  const [deleteInput, setDeleteInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const deleteArmed = deleteInput === t.settings.deleteConfirmWord

  const handleDelete = async () => {
    if (!deleteArmed) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      await signOut()
    } catch {
      setDeleteError(t.settings.deleteError)
      setIsDeleting(false)
    }
  }

  return (
    <section className="space-y-3 rounded-[22px] border-[1.5px] border-sproutine-red p-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-sproutine-red uppercase">
        <Icon name="delete" size={18} />
        {t.settings.dangerZone}
      </h3>
      <p className="text-[15px] leading-normal text-sproutine-text">
        {t.settings.deleteAccountDesc}
      </p>
      <div className="space-y-1.5">
        <label htmlFor="delete-confirm" className="text-sm font-semibold text-sproutine-text">
          {t.settings.deleteConfirmLabel}
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={deleteInput}
          onChange={(e) => setDeleteInput(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="field font-mono tracking-[0.06em]"
        />
      </div>
      {deleteError && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-sm font-medium text-sproutine-red"
        >
          <Icon name="error" size={18} />
          {deleteError}
        </p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={!deleteArmed || isDeleting}
        className="btn-destructive w-full"
      >
        <Icon name="delete" size={20} />
        {isDeleting ? t.settings.deleting : t.settings.deleteMyAccount}
      </button>
      {deleteInput && (
        <button
          type="button"
          onClick={() => setDeleteInput('')}
          className="btn-ghost h-11 w-full text-[15px] text-sproutine-text-secondary"
        >
          {t.settings.keepAccount}
        </button>
      )}
    </section>
  )
}

export function AttributionFooter() {
  const { t } = useLanguage()
  return (
    <>
      <p className="text-center text-[13px] leading-normal text-sproutine-muted">
        {t.settings.disclaimer}
      </p>
      <div className="-mt-4 space-y-1 text-center text-[11px] leading-normal text-sproutine-muted">
        <p className="text-[13px]">{t.settings.dataSources}</p>
        <p>
          <a href="https://blsdb.de/" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            BLS 4.0
          </a>
          {' '}— Max Rubner-Institut (CC BY 4.0)
        </p>
        <p>
          <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            Open Food Facts
          </a>
          {' '}— ODbL
        </p>
        <p>
          <a href="https://fdc.nal.usda.gov" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            USDA FoodData Central
          </a>
          {' '}— Public Domain
        </p>
      </div>
    </>
  )
}
