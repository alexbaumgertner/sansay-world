import { test, expect, type Page } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'

/**
 * FR-027 / SC-007 — a home or discipline link shared in a messenger must
 * produce a meaningful title and description, and the Open Graph image URL
 * must actually resolve.
 */
test.describe('Search and social metadata (FR-027)', () => {
  const suffix = uniqueSuffix()
  const disciplineName = `Мета-направление ${suffix}`
  const slug = `e2e-meta-${suffix}`
  const seoDescription = `Описание для превью ${suffix}`

  /** Titles a framework leaves behind when nothing real was set. */
  const PLACEHOLDER_TITLES = [/^create next app$/i, /^next\.?js$/i, /^untitled$/i, /^$/]

  let scratch: AdminScratch

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())
    await scratch.create('disciplines', {
      name: disciplineName,
      slug,
      strapline: 'страплайн для превью',
      description: richText('Описание.'),
      tone: 'live',
      order: 970,
      published: true,
      seo: { description: seoDescription },
    })
  })

  test.afterAll(async () => {
    await scratch.cleanup()
  })

  async function metaContent(page: Page, selector: string): Promise<string | null> {
    const el = page.locator(selector)
    return (await el.count()) === 0 ? null : el.first().getAttribute('content')
  }

  async function expectSharePreview(page: Page, route: string) {
    await page.goto(route)

    const title = (await page.title()).trim()
    expect(title, `${route} sets a title`).not.toBe('')
    for (const placeholder of PLACEHOLDER_TITLES) {
      expect(title, `${route} title is not a framework default`).not.toMatch(placeholder)
    }

    const description = await metaContent(page, 'meta[name="description"]')
    expect(description, `${route} has a meta description`).not.toBeNull()
    expect(description!.trim(), `${route} meta description is not empty`).not.toBe('')

    const ogTitle = await metaContent(page, 'meta[property="og:title"]')
    expect(ogTitle, `${route} has og:title`).not.toBeNull()
    expect(ogTitle!.trim()).not.toBe('')

    const ogDescription = await metaContent(page, 'meta[property="og:description"]')
    expect(ogDescription, `${route} has og:description`).not.toBeNull()
    expect(ogDescription!.trim()).not.toBe('')
  }

  test('home page produces a meaningful share preview', async ({ page }) => {
    await expectSharePreview(page, '/')
  })

  test('discipline page produces a meaningful share preview', async ({ page }) => {
    await expectSharePreview(page, `/${slug}`)
    expect(await page.title()).toContain(disciplineName)
    expect(await metaContent(page, 'meta[name="description"]')).toContain(seoDescription)
  })

  test('Open Graph image URL is absolute and resolvable', async ({ page, request }) => {
    for (const route of ['/', `/${slug}`]) {
      await page.goto(route)
      const ogImage = await metaContent(page, 'meta[property="og:image"]')

      expect(ogImage, `${route} declares an og:image`).not.toBeNull()
      expect(() => new URL(ogImage!), `${route} og:image is an absolute URL`).not.toThrow()

      const res = await request.get(ogImage!)
      expect(res.status(), `${route} og:image resolves`).toBeLessThan(400)
    }
  })

  test('sitemap.xml lists absolute URLs including every published discipline', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()
    const locs = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim())

    expect(locs.length, 'sitemap has entries').toBeGreaterThan(0)
    for (const loc of locs) {
      expect(loc, 'no empty <loc>').not.toBe('')
      expect(() => new URL(loc), `<loc>${loc}</loc> is an absolute URL`).not.toThrow()
    }
    expect(
      locs.some((l) => l.endsWith(`/${slug}`)),
      'the newly published discipline is listed in the sitemap',
    ).toBe(true)
  })
})
