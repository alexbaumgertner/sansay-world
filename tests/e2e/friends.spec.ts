import { test, expect } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'

/**
 * User Story 4 — FR-023, FR-024, FR-025, FR-028, SC-008.
 *
 * The hidden page is a `pages` document whose hiddenness is data, not code
 * (showInNav / includeInSitemap / noindex). The spec's guarantee is about
 * that behaviour, so the suite creates a page carrying those flags and
 * checks the site honours them everywhere.
 */
test.describe('Hidden Friends page (US4)', () => {
  const suffix = uniqueSuffix()
  const title = `Друзья ${suffix}`
  const slug = `e2e-friends-${suffix}`
  const chapterHeading = `Глава первая ${suffix}`
  const chapterBody = `Мурат, Зуич и автор — глава ${suffix}.`

  let scratch: AdminScratch

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())
    await scratch.create('pages', {
      title,
      slug,
      published: true,
      showInNav: false,
      includeInSitemap: false,
      noindex: true,
      chapters: [{ heading: chapterHeading, body: richText(chapterBody) }],
    })
  })

  test.afterAll(async () => {
    await scratch.cleanup()
  })

  test('FR-023: loads by direct URL with no authentication', async ({ page }) => {
    const response = await page.goto(`/${slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByRole('heading', { name: chapterHeading })).toBeVisible()
    await expect(page.getByText(chapterBody)).toBeVisible()
  })

  test('FR-025: states on the page that it is unadvertised, not secured', async ({ page }) => {
    await page.goto(`/${slug}`)
    await expect(page.getByText(/не защищена паролем/)).toBeVisible()
  })

  test('FR-024: absent from navigation on every page', async ({ page, request }) => {
    const res = await request.get('/api/disciplines?limit=200&where[published][equals]=true')
    const { docs } = await res.json()

    const routes = ['/', `/${slug}`, ...docs.map((d: { slug: string }) => `/${d.slug}`)]

    for (const route of routes) {
      await page.goto(route)
      const nav = page.getByRole('navigation')
      await expect(nav.getByRole('link', { name: new RegExp(title) }), `nav on ${route}`).toHaveCount(0)
      await expect(nav.locator(`a[href="/${slug}"]`), `nav on ${route}`).toHaveCount(0)
    }
  })

  test('FR-024: absent from sitemap.xml', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBeTruthy()
    expect(await res.text()).not.toContain(`/${slug}`)
  })

  test('FR-028: carries noindex', async ({ page, request }) => {
    await page.goto(`/${slug}`)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    const robots = await (await request.get('/robots.txt')).text()
    expect(robots, 'robots.txt disallows the hidden page').toContain(`/${slug}/`)
  })
})
