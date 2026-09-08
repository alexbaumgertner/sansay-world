import { test as setup, expect } from '@playwright/test'
import { STORAGE_STATE } from './helpers/paths'
import { adminCredentials } from './helpers/credentials'

/**
 * Runs once per `pnpm test:e2e` invocation. Signs into the Payload admin
 * through the real login form and persists the resulting session cookie to
 * STORAGE_STATE, so no individual test ever logs in again (and no test ever
 * needs the password).
 */
setup('authenticate as the owner', async ({ page }) => {
  const { email, password } = adminCredentials()

  await page.goto('/admin/login')

  // The admin UI is Russian (FR-029); locate by label, not by CSS class.
  await page.getByLabel(/e-?mail/i).fill(email)
  await page.getByLabel(/пароль|password/i).fill(password)
  await page.getByRole('button', { name: /войти|log ?in|sign ?in/i }).click()

  // Landing on the dashboard is the proof the session is real.
  await page.waitForURL(/\/admin(?!\/login)/)
  await expect(page.getByRole('link', { name: /Заявки|Enquiries/i }).first()).toBeVisible()

  await page.context().storageState({ path: STORAGE_STATE })
})
