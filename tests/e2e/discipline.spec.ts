import { test, expect } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'
import { copy } from './helpers/copy'

/**
 * FR-006 to FR-011. The spec's shape guarantees are per-discipline, so this
 * suite provisions its own disciplines through the admin API rather than
 * depending on whatever the CMS happens to hold.
 */
test.describe('Discipline page (US1)', () => {
  const suffix = uniqueSuffix()
  const withSamples = { name: `Направление A ${suffix}`, slug: `e2e-a-${suffix}` }
  const empty = { name: `Направление B ${suffix}`, slug: `e2e-b-${suffix}` }
  const descriptionText = `Развёрнутое описание услуги ${suffix}.`

  // Deliberately created out of display order to prove `order` drives the view.
  const sampleTitles = [`Третий ${suffix}`, `Первый ${suffix}`, `Второй ${suffix}`]
  const sampleOrders = [3, 1, 2]

  let scratch: AdminScratch

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())

    const a = await scratch.create('disciplines', {
      name: withSamples.name,
      slug: withSamples.slug,
      strapline: 'страплайн A',
      description: richText(descriptionText),
      tone: 'live',
      order: 990,
      published: true,
    })

    await scratch.create('disciplines', {
      name: empty.name,
      slug: empty.slug,
      strapline: 'страплайн B',
      description: richText('Описание без примеров работ.'),
      tone: 'digital',
      order: 991,
      published: true,
    })

    for (const [i, title] of sampleTitles.entries()) {
      await scratch.create('work-samples', {
        title,
        discipline: a.id,
        description: `Описание примера ${i}`,
        order: sampleOrders[i],
        published: true,
        externalVideoUrl: i === 0 ? 'https://example.com/video' : undefined,
      })
    }
  })

  test.afterAll(async () => {
    await scratch.cleanup()
  })

  test('FR-006: shows heading, strapline, and the fuller description', async ({ page }) => {
    await page.goto(`/${withSamples.slug}`)

    await expect(page.getByRole('heading', { level: 1, name: withSamples.name })).toBeVisible()
    await expect(page.getByText('страплайн A')).toBeVisible()
    await expect(page.getByText(descriptionText)).toBeVisible()
  })

  test('FR-007/FR-008: work samples render in the order the editor set', async ({ page }) => {
    await page.goto(`/${withSamples.slug}`)

    const headings = page.getByRole('listitem').getByRole('heading')
    await expect(headings).toHaveText([
      `Первый ${suffix}`,
      `Второй ${suffix}`,
      `Третий ${suffix}`,
    ])

    // FR-008: an optional external video link is offered when one is set.
    await expect(page.getByRole('link', { name: copy.discipline.gallery.watchVideo })).toHaveAttribute(
      'href',
      'https://example.com/video',
    )
  })

  test('edge case: a discipline with zero work samples shows an empty state, not a broken page', async ({
    page,
  }) => {
    const response = await page.goto(`/${empty.slug}`)
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1, name: empty.name })).toBeVisible()
    await expect(page.getByText(copy.discipline.gallery.empty)).toBeVisible()
    // The enquiry form still works on an empty discipline.
    await expect(page.getByRole('button', { name: copy.enquiry.submit })).toBeVisible()
  })

  test('FR-011: links back home and to neighbouring disciplines', async ({ page }) => {
    await page.goto(`/${empty.slug}`)

    // The article's own footer nav, not the site-wide navigation in the header.
    const pageNav = page.getByRole('article').getByRole('navigation')

    await expect(pageNav.getByRole('link', { name: copy.discipline.backHome })).toHaveAttribute('href', '/')
    // B sits immediately after A in `order`, so A is its previous neighbour.
    await expect(pageNav.getByRole('link', { name: new RegExp(withSamples.name) })).toHaveAttribute(
      'href',
      `/${withSamples.slug}`,
    )
  })
})
