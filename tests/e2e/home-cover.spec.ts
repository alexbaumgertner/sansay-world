import { test, expect } from './fixtures/cms'
import { copy } from './helpers/copy'
import { nearWhiteCover, busyCover } from './fixtures/images'
import { toneTokens } from '@/lib/theme/tokens'

/**
 * Spec 003 — home opening-screen cover, brand mark, and uncovered fallback.
 */

function rgbOf(hex: string): string {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

test.describe('Home cover (spec 003)', () => {
  test('covered hero fills the viewport with a legible brand mark (SC-001, SC-003, SC-005, SC-008, SC-009)', async ({
    page,
    cms,
  }) => {
    const media = await cms.uploadMedia({
      data: await nearWhiteCover(),
      filename: `cover-white-${Date.now()}.png`,
      alt: 'E2E near-white cover',
    })
    await cms.setHomeCover(media.id)

    await page.goto('/')

    const hero = page.locator('#home-hero')
    const box = await hero.boundingBox()
    const viewport = page.viewportSize()
    expect(box).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(Math.round(box!.width)).toBe(viewport!.width)
    expect(Math.round(box!.height)).toBeGreaterThanOrEqual(viewport!.height - 1)

    const img = hero.locator('img')
    await expect(img).toHaveCount(1)
    const objectFit = await img.evaluate((el) => getComputedStyle(el).objectFit)
    expect(objectFit).toBe('cover')

    // Header overlays the hero — no dark bar displacing the photograph
    const headerBottom = await page.locator('body > header').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return r.bottom
    })
    const heroTop = box!.y
    expect(heroTop).toBeLessThanOrEqual(1)
    expect(headerBottom).toBeGreaterThan(0)

    const home = await cms.home()
    const h1 = hero.getByRole('heading', { level: 1 })
    await expect(h1).toHaveAccessibleName(home.name)
    await expect(h1).toBeInViewport()
    await expect(hero.locator('p')).toBeInViewport()
    const cta = hero.getByRole('link', { name: copy.home.ctaToDisciplines })
    await expect(cta).toBeInViewport()

    if (viewport!.width >= 1280) {
      const fontSize = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      expect(fontSize, 'desktop brand mark larger than pre-feature text-5xl (48px)').toBeGreaterThanOrEqual(96)
    }

    if (home.name.trim().toLowerCase() === 'sansay') {
      const spans = h1.locator('span')
      await expect(spans).toHaveCount(2)
      const live = await spans.nth(0).evaluate((el) => getComputedStyle(el).color)
      const digital = await spans.nth(1).evaluate((el) => getComputedStyle(el).color)
      expect(live).toBe(rgbOf(toneTokens.live))
      expect(digital).toBe(rgbOf(toneTokens.digital))
    }

    await cta.focus()
    const outlineWidth = await cta.evaluate((el) => parseFloat(getComputedStyle(el).outlineWidth))
    expect(outlineWidth, 'focus indicator visible over the cover').toBeGreaterThan(0)
  })

  test('busy cover still keeps name, essence, and CTA in the first viewport (SC-002)', async ({
    page,
    cms,
  }) => {
    const media = await cms.uploadMedia({
      data: await busyCover(),
      filename: `cover-busy-${Date.now()}.png`,
      alt: 'E2E busy cover',
    })
    await cms.setHomeCover(media.id)
    await page.goto('/')

    const hero = page.locator('#home-hero')
    await expect(hero.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(hero.locator('p')).toBeInViewport()
    await expect(hero.getByRole('link', { name: copy.home.ctaToDisciplines })).toBeInViewport()
  })

  test('owner can set, replace, and keep aboutPhoto independent (FR-019, FR-020, SC-006)', async ({
    page,
    cms,
  }) => {
    const first = await cms.uploadMedia({
      data: await nearWhiteCover(),
      filename: `cover-a-${Date.now()}.png`,
      alt: 'E2E cover A',
    })
    await cms.setHomeCover(first.id)
    await page.goto('/')
    await expect(page.locator('#home-hero img')).toHaveCount(1)
    const srcA = await page.locator('#home-hero img').getAttribute('src')

    const second = await cms.uploadMedia({
      data: await busyCover(),
      filename: `cover-b-${Date.now()}.png`,
      alt: 'E2E cover B',
    })
    await cms.setHomeCover(second.id)
    await page.goto('/')
    const srcB = await page.locator('#home-hero img').getAttribute('src')
    expect(srcB).not.toBe(srcA)

    const before = await cms.home()
    const aboutBefore =
      before.aboutPhoto && typeof before.aboutPhoto === 'object'
        ? before.aboutPhoto.id
        : before.aboutPhoto
    const coverBefore =
      before.coverImage && typeof before.coverImage === 'object'
        ? before.coverImage.id
        : before.coverImage

    // Touch aboutPhoto alone — cover must stay
    await cms.setHomeAboutPhoto(aboutBefore ?? null)
    const afterAbout = await cms.home()
    const coverAfterAbout =
      afterAbout.coverImage && typeof afterAbout.coverImage === 'object'
        ? afterAbout.coverImage.id
        : afterAbout.coverImage
    expect(coverAfterAbout).toBe(coverBefore)

    // Touch cover alone — about must stay
    await cms.setHomeCover(first.id)
    const afterCover = await cms.home()
    const aboutAfterCover =
      afterCover.aboutPhoto && typeof afterCover.aboutPhoto === 'object'
        ? afterCover.aboutPhoto.id
        : afterCover.aboutPhoto
    expect(aboutAfterCover).toBe(aboutBefore)
  })

  test('uncovered hero has no img and still fills the viewport (FR-023, FR-024, SC-007)', async ({
    page,
    cms,
  }) => {
    await cms.clearHomeCover()
    await page.goto('/')

    const hero = page.locator('#home-hero')
    await expect(hero.locator('img')).toHaveCount(0)
    await expect(hero.locator('.cover-scrim-text')).toHaveCount(1)
    await expect(hero.locator('.cover-scrim-top')).toHaveCount(1)

    const box = await hero.boundingBox()
    const viewport = page.viewportSize()
    expect(box!.height).toBeGreaterThanOrEqual(viewport!.height - 1)

    await expect(hero.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(hero.locator('p')).toBeInViewport()
    await expect(hero.getByRole('link', { name: copy.home.ctaToDisciplines })).toBeInViewport()
  })

  test('text stays readable when the cover media request is blocked (FR-017, FR-026, SC-010)', async ({
    page,
    cms,
  }) => {
    const media = await cms.uploadMedia({
      data: await nearWhiteCover(),
      filename: `cover-block-${Date.now()}.png`,
      alt: 'E2E blocked cover',
    })
    await cms.setHomeCover(media.id)

    await page.route('**/api/media/file/**', (route) => route.abort())
    await page.route('**/_next/image**', (route) => {
      const url = route.request().url()
      if (url.includes('media') || url.includes('cover')) return route.abort()
      return route.continue()
    })

    await page.goto('/')

    const hero = page.locator('#home-hero')
    await expect(hero.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(hero.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(hero.locator('p')).toBeInViewport()
    await expect(hero.getByRole('link', { name: copy.home.ctaToDisciplines })).toBeInViewport()
  })
})
