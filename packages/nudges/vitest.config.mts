import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'nudges',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
