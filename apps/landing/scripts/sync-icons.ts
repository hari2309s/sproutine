/**
 * Downloads the Material Symbols Rounded subset for the icons in src/lib/icons.ts
 * into public/fonts, so the site never loads fonts from Google at runtime (an IP
 * transfer to Google that German courts have found to breach GDPR).
 *
 *   pnpm --filter @sproutine/landing icons:sync
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ICONS, ICON_FONT_URL } from '../src/lib/icons'

const OUT = resolve(import.meta.dirname, '../public/fonts/material-symbols-rounded.woff2')
const CSS = resolve(import.meta.dirname, '../src/app/globals.css')
const LAYOUT = resolve(import.meta.dirname, '../src/app/layout.tsx')
const FONT_URL = /\/fonts\/material-symbols-rounded\.woff2(\?v=[0-9a-f]+)?/g

async function run() {
  // A modern UA makes Google serve woff2.
  const css = await fetch(ICON_FONT_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    },
  }).then((r) => {
    if (!r.ok) throw new Error(`font CSS → HTTP ${r.status}`)
    return r.text()
  })
  const url = css.match(/url\((https:[^)]+)\) format\('woff2'\)/)?.[1]
  if (!url) throw new Error('No woff2 URL in font CSS')

  const font = Buffer.from(await (await fetch(url)).arrayBuffer())
  await writeFile(OUT, font)
  const version = createHash('sha256').update(font).digest('hex').slice(0, 10)
  for (const file of [CSS, LAYOUT]) {
    const source = await readFile(file, 'utf8')
    await writeFile(
      file,
      source.replace(FONT_URL, `/fonts/material-symbols-rounded.woff2?v=${version}`)
    )
  }
  console.log(`Saved ${ICONS.length} icons (${(font.length / 1024).toFixed(1)} KB)`)
}

run().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
