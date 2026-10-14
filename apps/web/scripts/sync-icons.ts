/**
 * Downloads the Material Symbols Rounded subset for the icons listed in
 * src/lib/icons.ts into public/fonts, so the app never loads fonts
 * from Google at runtime (an IP transfer to Google that German courts have
 * found to breach GDPR). Re-run after adding an icon:
 *
 *   pnpm --filter @sproutine/web icons:sync
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ICONS, ICON_FONT_URL } from '../src/lib/icons'

const OUT_DIR = resolve(import.meta.dirname, '../public/fonts')
// Files that reference the font. Each gets ?v=<content hash>, so a browser
// that cached an older subset fetches the new one instead of showing icon
// names as text.
const FONT_REFS = [
  resolve(import.meta.dirname, '../src/app/globals.css'),
  resolve(import.meta.dirname, '../src/app/layout.tsx'),
]
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
  await writeFile(resolve(OUT_DIR, 'material-symbols-rounded.woff2'), font)
  const version = createHash('sha256').update(font).digest('hex').slice(0, 10)
  // Records which icons the font contains and its version; unit tests
  // compare them to ICONS and to the references below.
  await writeFile(
    resolve(OUT_DIR, 'material-symbols-rounded.json'),
    JSON.stringify({ version, icons: [...ICONS].sort() }, null, 2) + '\n'
  )
  for (const file of FONT_REFS) {
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
