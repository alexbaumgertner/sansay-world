import { defineConfig, devices } from '@playwright/test'
import { STORAGE_STATE } from './tests/e2e/helpers/paths'

// A value already in the environment (CI, or an inline override on the
// command line) beats the dotfiles, which loadEnvFile would otherwise clobber.
const inheritedEnv = { ...process.env }

// Local secrets live in .env.local (gitignored). In CI the real environment
// already carries E2E_*, so a missing file is not an error.
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // not present — fine
  }
}

for (const key of ['E2E_BASE_URL', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD']) {
  if (inheritedEnv[key]) process.env[key] = inheritedEnv[key]
}

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error(
    'E2E_BASE_URL is not set. Point it at the deployment under test (see .env.local).',
  )
}

export default defineConfig({
  testDir: './tests/e2e',

  // The target is a single shared deployment and several specs create and
  // delete real content through the admin API, so tests must not race.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    userAgent: 'sansay-e2e Playwright',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      // Every requirement that is not viewport-specific.
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: /mobile\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      // The spec's phone-sized target (FR-026, SC-006).
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
})
