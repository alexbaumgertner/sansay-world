import { test, expect } from '@playwright/test'

/** Quickstart Scenario I. FR-030 / contracts/admin-access.md. */
test.describe('Admin access control (US3)', () => {
  test('signed-out /admin shows the login screen', async ({ page }) => {
    // Admin UI locale is Russian (FR-029), so the login form's labels are too.
    await page.goto('/admin')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/пароль/i)).toBeVisible()
  })

  test('unauthenticated /api/enquiries returns no documents', async ({ request }) => {
    const res = await request.get('/api/enquiries')
    expect(res.status()).toBe(403)
  })

  test('no registration route exists', async ({ request }) => {
    const res = await request.post('/api/users', {
      data: { email: 'intruder@example.com', password: 'whatever123' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })
})
