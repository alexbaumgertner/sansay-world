import { defineConfig } from 'vitest/config'
import path from 'node:path'

const dirname = import.meta.dirname

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['tests/integration/helpers/env.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      '@payload-config': path.resolve(dirname, './src/payload.config.ts'),
    },
  },
})
