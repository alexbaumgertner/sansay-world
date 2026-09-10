import { test, expect } from './fixtures/cms'
import { t } from '@/lib/copy'
import { paths } from './helpers/paths'

/**
 * Spec 001 — FR-026 and SC-006: phone-sized screens must stay usable, with no
 * horizontal scrolling and no unreachable controls.
 */

const PHONE = { width: 390, height: 844 }

test.use({ viewport: PHONE })

async function hasHorizontalOverflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth > doc.clientWidth
  })
}

test.describe(`At a ${PHONE.width}px viewport`, () => {
  test('the home page does not scroll horizontally (SC-006)', async ({ page }) => {
    await page.goto('/')

    expect(await hasHorizontalOverflow(page), 'home page overflows horizontally').toBe(false)
  })

  test('a discipline page does not scroll horizontally (SC-006)', async ({ page, cms }) => {
    const [discipline] = await cms.publishedDisciplines()

    await page.goto(`/${discipline.slug}`)

    expect(await hasHorizontalOverflow(page), `${discipline.slug} overflows horizontally`).toBe(false)
  })

  test('the discipline cards stack in a single column (FR-026)', async ({ page, cms }) => {
    const disciplines = await cms.publishedDisciplines()
    test.skip(disciplines.length < 2, 'needs at least two published disciplines to observe stacking')

    await page.goto('/')

    const boxes = []
    for (const discipline of disciplines) {
      const card = page
        .getByRole('main')
        .getByRole('link')
        .filter({ has: page.getByRole('heading', { level: 3, name: discipline.name, exact: true }) })
      const box = await card.boundingBox()
      expect(box, `card for "${discipline.name}" should be laid out`).not.toBeNull()
      boxes.push(box!)
    }

    for (let i = 1; i < boxes.length; i += 1) {
      expect(boxes[i].x, 'stacked cards share a left edge').toBeCloseTo(boxes[0].x, 0)
      expect(boxes[i].width, 'stacked cards share a width').toBeCloseTo(boxes[0].width, 0)
      expect(boxes[i].y, 'each card sits below the previous one').toBeGreaterThan(boxes[i - 1].y + boxes[i - 1].height - 1)
    }

    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(PHONE.width)
    }
  })

  test('the primary call to action is reachable without zooming (SC-001, SC-006)', async ({ page }) => {
    await page.goto('/')

    // The page is laid out at device width — nothing to pinch out of.
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/)

    const cta = page.locator('#home-hero').getByRole('link', { name: t('home.ctaToDisciplines') })
    await expect(cta).toBeVisible()
    // Without any scrolling, straight after load.
    await expect(cta).toBeInViewport()

    const box = await cta.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width, 'the CTA must fit within the screen width').toBeLessThanOrEqual(PHONE.width)
    // A finger-sized target: WCAG 2.2 AA minimum (SC-006, "unusable controls").
    expect(box!.height, 'the CTA should be a usable tap target').toBeGreaterThanOrEqual(24)

    // And it actually does its job at this size.
    await cta.click()
    await expect(page.getByRole('heading', { name: t('home.disciplinesHeading') })).toBeInViewport()
  })

  test('the sign-in page is usable at phone width (FR-043)', async ({ page }) => {
    await page.goto(paths.signIn)

    const email = page.getByLabel(t('login.emailLabel'))
    await expect(email).toBeVisible()
    await expect(email).toBeInViewport()

    const submit = page.getByRole('button', { name: t('login.emailSubmit') })
    const box = await submit.boundingBox()
    expect(box!.height, 'submit control is a usable tap target').toBeGreaterThanOrEqual(24)

    expect(await hasHorizontalOverflow(page), 'sign-in overflows horizontally').toBe(false)
  })

  test('the login code field supports mobile entry (FR-043)', async ({ page }) => {
    await page.goto(paths.signIn)
    await page.getByLabel(t('login.emailLabel')).fill('mobile@example.com')
    await page.getByRole('button', { name: t('login.emailSubmit') }).click()
    await expect(page.getByText(t('login.codeSent'))).toBeVisible()

    const code = page.getByLabel(t('login.codeLabel'))
    await expect(code).toHaveAttribute('inputmode', 'numeric')
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code')
  })
})

const PHONE_LANDSCAPE = { width: 844, height: 390 }

test.describe(`At phone landscape ${PHONE_LANDSCAPE.width}×${PHONE_LANDSCAPE.height} (SC-004)`, () => {
  test.use({ viewport: PHONE_LANDSCAPE })

  test('name, essence, and CTA fit without scrolling or horizontal overflow', async ({ page }) => {
    await page.goto('/')

    const hero = page.locator('#home-hero')
    await expect(hero.getByRole('heading', { level: 1 })).toBeInViewport()
    await expect(hero.locator('p')).toBeInViewport()
    await expect(hero.getByRole('link', { name: t('home.ctaToDisciplines') })).toBeInViewport()
    expect(await hasHorizontalOverflow(page)).toBe(false)
  })
})
