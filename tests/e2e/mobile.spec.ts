import { test, expect } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'
import { copy } from './helpers/copy'

/**
 * FR-026 / SC-006 — phone-sized behaviour. Only meaningful at the 390px
 * project, so the desktop project skips it.
 */
test.describe('Phone-sized layout (FR-026)', () => {
  const suffix = uniqueSuffix()
  const names = [`Моб A ${suffix}`, `Моб B ${suffix}`]
  let scratch: AdminScratch

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())
    for (const [i, name] of names.entries()) {
      await scratch.create('disciplines', {
        name,
        slug: `e2e-mob-${i}-${suffix}`,
        strapline: `страплайн ${i}`,
        description: richText('Описание.'),
        tone: i === 0 ? 'live' : 'digital',
        order: 980 + i,
        published: true,
      })
    }
  })

  test.afterAll(async () => {
    await scratch.cleanup()
  })

  async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, route: string) {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(
      overflow.scrollWidth,
      `${route} must not scroll horizontally at ${overflow.clientWidth}px`,
    ).toBeLessThanOrEqual(overflow.clientWidth)
  }

  test('no horizontal overflow on the home page or a discipline page', async ({ page, request }) => {
    const { docs } = await (await request.get('/api/disciplines?limit=5&where[published][equals]=true')).json()
    const routes = ['/', ...docs.slice(0, 3).map((d: { slug: string }) => `/${d.slug}`)]

    for (const route of routes) {
      await page.goto(route)
      await expectNoHorizontalOverflow(page, route)
    }
  })

  test('discipline cards stack in a single column', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('#disciplines').getByRole('link')
    const count = await cards.count()
    test.skip(count < 2, 'needs at least two cards to prove stacking')

    const boxes = await cards.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, bottom: r.bottom })),
    )

    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].x, 'every card starts at the same left edge').toBeCloseTo(boxes[0].x, 0)
      expect(boxes[i].y, 'each card sits below the previous one').toBeGreaterThanOrEqual(
        boxes[i - 1].bottom - 1,
      )
    }
  })

  test('the primary CTA is reachable and usable', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: copy.home.ctaToDisciplines })

    await expect(cta).toBeVisible()
    await expect(cta).toBeInViewport()

    const box = await cta.boundingBox()
    expect(box, 'the CTA has a hit area').not.toBeNull()
    expect(box!.height, 'comfortable tap target').toBeGreaterThanOrEqual(40)

    await cta.click()
    await expect(page.locator('#disciplines')).toBeInViewport()
  })
})
