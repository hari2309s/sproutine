import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import base from '../../eslint.config.mjs'

const config = [
  ...base,
  ...nextVitals,
  ...nextTs,
  { ignores: ['playwright-report/**', 'test-results/**'] },
  prettier,
]

export default config
