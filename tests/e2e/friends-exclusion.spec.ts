import { test, expect } from '@playwright/test'

/**
 * Quickstart Scenario E + User Story 4's independent test. Assumes a `pages`
 * document has been seeded with slug `friends`, `showInNav: false`,
 * `includeInSitemap: false`, `noindex: true` (see docs/admin-guide.ru.md).
 */
test.describe('Hidden Friends page (US4)', () => {
  const FRIENDS_SLUG = 'friends'

  test('loads by direct URL with no authentication', async ({ page }) => {
    const response = await page.goto(`/${FRIENDS_SLUG}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('states on the page itself that it is unadvertised, not secured', async ({ page }) => {
    await page.goto(`/${FRIENDS_SLUG}`)
    await expect(page.getByText(/не защищена паролем/)).toBeVisible()
  })

  test('is absent from the rendered navigation', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav.getByRole('link', { name: /друз/i })).toHaveCount(0)
  })

  test('is absent from the sitemap', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    const body = await res.text()
    expect(body).not.toContain(`/${FRIENDS_SLUG}`)
  })

  test('is disallowed in robots.txt', async ({ request }) => {
    const res = await request.get('/robots.txt')
    const body = await res.text()
    expect(body).toContain(`/${FRIENDS_SLUG}/`)
  })

  test('sets noindex metadata', async ({ page }) => {
    await page.goto(`/${FRIENDS_SLUG}`)
    const robotsMeta = page.locator('meta[name="robots"]')
    await expect(robotsMeta).toHaveAttribute('content', /noindex/)
  })
})
