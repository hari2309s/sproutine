import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['apps/web/vitest.config.mts', 'packages/ai/vitest.config.mts'],
  },
})
