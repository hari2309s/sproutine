// Self-hosts the zxing-wasm barcode decoder (the package defaults to loading
// it from the jsDelivr CDN at runtime, i.e. a third-party request from the
// user's browser). Copies the .wasm into public/ and checks it against the
// SHA-256 the package publishes.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const src = require.resolve('zxing-wasm/reader/zxing_reader.wasm')
const out = resolve(import.meta.dirname, '../public/wasm/zxing_reader.wasm')

const { ZXING_WASM_SHA256 } = await import('zxing-wasm/reader')
const bytes = await readFile(src)
const sha = createHash('sha256').update(bytes).digest('hex')
if (sha !== ZXING_WASM_SHA256) throw new Error(`zxing wasm hash mismatch: ${sha}`)

await mkdir(dirname(out), { recursive: true })
await writeFile(out, bytes)
console.log(`zxing_reader.wasm → public/wasm (${(bytes.length / 1024).toFixed(0)} KB, sha256 ok)`)
