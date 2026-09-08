import { test, expect } from '@playwright/test'
import { copy } from './helpers/copy'
import { paths } from './helpers/paths'

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
