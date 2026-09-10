import { test, expect } from '@playwright/test'
import { copy } from './helpers/copy'

/**
 * User Story 1 / FR-001 to FR-004. Everything here runs signed-out, as a
 * first-time visitor does.
 */
test.describe('Home page (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('FR-001: name, one-sentence essence, and a control to the disciplines are above the fold', async ({
    page,
  }) => {
    const hero = page.locator('#home-hero')
    const name = hero.getByRole('heading', { level: 1 })
    await expect(name).toBeVisible()
    await expect(name).toBeInViewport()
    await expect(name).not.toHaveText(/^\s*$/)

    const essence = hero.locator('p')
    await expect(essence).toBeInViewport()
    await expect(essence).not.toHaveText(/^\s*$/)

    const cta = hero.getByRole('link', { name: copy.home.ctaToDisciplines })
    await expect(cta).toBeVisible()
    await expect(cta).toBeInViewport()
    await expect(cta).toHaveAttribute('href', '#disciplines')
  })

  test('FR-001: the essence sentence is actually populated, not an empty element', async ({ page }) => {
    const essence = (await page.locator('#home-hero p').innerText()).trim()
    expect(essence, 'the opening screen states in one sentence what SanSay does').not.toBe('')
  })

  test('FR-002: the about block has one photograph and two to three biography paragraphs', async ({
    page,
  }) => {
    const about = page.locator('section').filter({ has: page.getByRole('heading', { name: copy.home.aboutHeading }) })
    await expect(about).toBeVisible()

    await expect(about.getByRole('img'), 'about block photograph').toHaveCount(1)

    const paragraphs = about.locator('p').filter({ hasText: /\S/ })
    const count = await paragraphs.count()
    expect(count, 'two to three biography paragraphs').toBeGreaterThanOrEqual(2)
    expect(count).toBeLessThanOrEqual(3)
  })

  test('FR-003/FR-004: one card per published discipline, in CMS order, each linking to its own page', async ({
    page,
    request,
  }) => {
    const res = await request.get('/api/disciplines?limit=200&sort=order&where[published][equals]=true')
    expect(res.ok()).toBeTruthy()
    const { docs } = await res.json()

    const section = page.locator('#disciplines')
    const cards = section.getByRole('link')

    await expect(cards, 'a card for every published discipline').toHaveCount(docs.length)

    // Editor-defined order (FR-004), and each card carries name, strapline
    // and a one-to-two-sentence description (FR-003).
    for (const [i, d] of docs.entries()) {
      const card = cards.nth(i)
      await expect(card).toHaveAttribute('href', `/${d.slug}`)
      await expect(card.getByRole('heading', { name: d.name })).toBeVisible()
      await expect(card).toContainText(d.strapline)

      const cardText = (await card.innerText()).replace(d.name, '').replace(d.strapline, '').trim()
      expect(cardText, `card for "${d.name}" carries a description`).not.toBe('')
    }
  })

  test('FR-003: clicking a discipline card opens that discipline page', async ({ page }) => {
    const card = page.locator('#disciplines').getByRole('link').first()
    test.skip((await card.count()) === 0, 'no published disciplines in the CMS')

    const href = await card.getAttribute('href')
    await card.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
