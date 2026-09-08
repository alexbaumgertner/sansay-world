import { test, expect } from '@playwright/test'
import { copy } from './helpers/copy'
import { paths } from './helpers/paths'
import { adminApi } from './helpers/admin'
import {
  cleanupVisitorAuth,
  issueKnownLoginCode,
  seedVisitorWithEnquiry,
} from './helpers/visitor-auth'

test.describe('Visitor login (US1)', () => {
  test('sign-in page renders and unknown address gets standard confirmation', async ({ page }) => {
    await page.goto(paths.signIn)
    await expect(page.getByRole('heading', { name: copy.login.heading })).toBeVisible()

    await page.getByLabel(copy.login.emailLabel).fill('nobody@example.com')
    await page.getByRole('button', { name: copy.login.emailSubmit }).click()

    await expect(page.getByText(copy.login.codeSent)).toBeVisible()
    await expect(page.getByLabel(copy.login.codeLabel)).toBeVisible()
  })

  test('status routes are not indexed', async ({ page }) => {
    const res = await page.goto('/robots.txt')
    expect(res?.ok()).toBeTruthy()
    const body = await res!.text()
    expect(body).toContain('/status/')
  })
})

test.describe('Visitor login (US1/US2)', () => {
  const suffix = `${Date.now().toString(36)}-happy`
  const email = `visitor-${suffix}@example.com`
  let ids: { disciplineId: string; enquiryId: string; visitorId: string }

  test.beforeAll(async () => {
    ids = await seedVisitorWithEnquiry(email, suffix)
  })

  test.afterAll(async () => {
    await cleanupVisitorAuth({
      disciplineId: ids.disciplineId,
      enquiryIds: [ids.enquiryId],
      visitorId: ids.visitorId,
    })
  })

  async function signIn(page: import('@playwright/test').Page) {
    const freshCode = await issueKnownLoginCode(ids.visitorId)
    await page.goto(paths.signIn)
    await page.getByLabel(copy.login.emailLabel).fill(email)
    await page.getByRole('button', { name: copy.login.emailSubmit }).click()
    await page.getByLabel(copy.login.codeLabel).fill(freshCode)
    await page.getByRole('button', { name: copy.login.codeSubmit }).click()
    await expect(page.getByRole('heading', { name: copy.status.heading })).toBeVisible()
  }

  test('happy path: request code, sign in, see enquiry list', async ({ page }) => {
    await signIn(page)
    await expect(page.getByText(`Visitor test ${suffix}`)).toBeVisible()
  })

  test('foreign enquiry id is refused like a missing id (FR-029)', async ({ page }) => {
    await signIn(page)
    const foreign = '00000000-0000-4000-8000-000000000001'
    await page.goto(`${paths.status}/enquiry/${foreign}`)
    await expect(page.getByText(copy.status.notFound)).toBeVisible()
  })

  test('sign-out requires a new code (FR-024)', async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: copy.login.signOut }).click()
    await expect(page.getByText(copy.login.signedOut)).toBeVisible()
    await page.goto(paths.status)
    await expect(page).toHaveURL(/sign-in/)
  })
})

test.describe('Visitor access boundary (SC-008)', () => {
  const suffix = `${Date.now().toString(36)}-boundary`
  const email = `boundary-${suffix}@example.com`
  let ids: { disciplineId: string; enquiryId: string; visitorId: string }

  test.beforeAll(async () => {
    ids = await seedVisitorWithEnquiry(email, suffix)
    const code = await issueKnownLoginCode(ids.visitorId)
    const api = await adminApi()
    const loginRes = await api.post('/api/visitors/login', {
      data: { email, password: code },
    })
    expect(loginRes.status()).not.toBe(201)
    await api.dispose()
  })

  test.afterAll(async () => {
    await cleanupVisitorAuth({
      disciplineId: ids.disciplineId,
      enquiryIds: [ids.enquiryId],
      visitorId: ids.visitorId,
    })
  })

  test('visitor session cannot reach admin panel', async ({ page }) => {
    await page.goto(paths.signIn)
    const code = await issueKnownLoginCode(ids.visitorId)
    await page.getByLabel(copy.login.emailLabel).fill(email)
    await page.getByRole('button', { name: copy.login.emailSubmit }).click()
    await page.getByLabel(copy.login.codeLabel).fill(code)
    await page.getByRole('button', { name: copy.login.codeSubmit }).click()
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/\/admin\/collections/)
  })
})
