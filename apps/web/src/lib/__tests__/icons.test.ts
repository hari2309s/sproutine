import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ICONS } from '@/lib/icons'

describe('self-hosted icon font', () => {
  it('contains exactly the icons in ICONS (run `pnpm --filter @sproutine/web icons:sync` if not)', () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, '../../../public/fonts/material-symbols-rounded.json'),
        'utf8'
      )
    ) as { icons: string[] }
    expect(manifest.icons).toEqual([...ICONS].sort())
  })
})
