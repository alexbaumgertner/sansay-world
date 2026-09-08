import { defineConfig, devices } from '@playwright/test'

try {
  process.loadEnvFile('.env')
} catch {
  // .env not present — fine in CI where real env vars are already set
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
