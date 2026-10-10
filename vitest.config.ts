import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@simulation': resolve(__dirname, 'src/simulation'),
      '@career': resolve(__dirname, 'src/career')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
