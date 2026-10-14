import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ICONS } from '@/lib/icons'

const manifest = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../../../public/fonts/material-symbols-rounded.json'),
    'utf8'
  )
) as { version: string; icons: string[] }

describe('self-hosted icon font', () => {
  it('contains exactly the icons in ICONS (run `pnpm --filter @sproutine/web icons:sync` if not)', () => {
    expect(manifest.icons).toEqual([...ICONS].sort())
  })

  it('is referenced with its current version, so browsers drop a cached older subset', () => {
    for (const file of ['../../app/globals.css', '../../app/layout.tsx']) {
      const source = readFileSync(resolve(import.meta.dirname, file), 'utf8')
      expect(source, file).toContain(`/fonts/material-symbols-rounded.woff2?v=${manifest.version}`)
    }
  })
})
