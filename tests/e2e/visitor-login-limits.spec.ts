import { test, expect } from '@playwright/test'
import { copy } from './helpers/copy'
import { paths } from './helpers/paths'
import {
  cleanupVisitorAuth,
  expireLatestCode,
  issueKnownLoginCode,
  seedVisitorWithEnquiry,
} from './helpers/visitor-auth'

const REQUESTS_PER_ADDRESS = 3
const MAX_FAILED_ATTEMPTS = 5

test.describe('Visitor login limits (US3)', () => {
  test('expired code shows expiry message and new-code control (FR-015)', async ({ page }) => {
    const suffix = `exp-${Date.now().toString(36)}`
    const email = `limits-exp-${suffix}@example.com`
    const ids = await seedVisitorWithEnquiry(email, suffix)
    try {
      await issueKnownLoginCode(ids.visitorId)
      await expireLatestCode(ids.visitorId)

      await page.goto(paths.signIn)
      await page.getByLabel(copy.login.emailLabel).fill(email)
      await page.getByRole('button', { name: copy.login.emailSubmit }).click()
      await page.getByLabel(copy.login.codeLabel).fill('123456')
      await page.getByRole('button', { name: copy.login.codeSubmit }).click()

      await expect(page.getByText(copy.login.errorExpiredCode)).toBeVisible()
      await expect(page.getByRole('button', { name: copy.login.requestNewCode })).toBeVisible()
    } finally {
      await cleanupVisitorAuth(ids)
    }
  })

  test('repeated wrong codes show lockout with duration (FR-018)', async ({ page }) => {
    const suffix = `lock-${Date.now().toString(36)}`
    const email = `limits-lock-${suffix}@example.com`
    const ids = await seedVisitorWithEnquiry(email, suffix)
    try {
      await page.goto(paths.signIn)
      await page.getByLabel(copy.login.emailLabel).fill(email)
      await page.getByRole('button', { name: copy.login.emailSubmit }).click()

      for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
        await page.getByLabel(copy.login.codeLabel).fill('000000')
        await page.getByRole('button', { name: copy.login.codeSubmit }).click()
      }

      await expect(page.getByRole('alert')).toContainText(/мин|сек/)
    } finally {
      await cleanupVisitorAuth(ids)
    }
  })

  test('exceeding per-address request limit shows rate-limit message (FR-019)', async ({ page }) => {
    const suffix = `rate-${Date.now().toString(36)}`
    const email = `limits-rate-${suffix}@example.com`
    const ids = await seedVisitorWithEnquiry(email, suffix)
    try {
      await page.goto(paths.signIn)

      for (let i = 0; i <= REQUESTS_PER_ADDRESS; i++) {
        await page.getByLabel(copy.login.emailLabel).fill(email)
        await page.getByRole('button', { name: copy.login.emailSubmit }).click()
        if (i < REQUESTS_PER_ADDRESS) {
          await expect(page.getByText(copy.login.codeSent)).toBeVisible()
          await page.getByRole('button', { name: copy.login.changeAddress }).click()
        }
      }

      await expect(page.getByRole('alert')).toContainText(/мин|сек/)
    } finally {
      await cleanupVisitorAuth(ids)
    }
  })
})
