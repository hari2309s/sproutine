import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'food',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
