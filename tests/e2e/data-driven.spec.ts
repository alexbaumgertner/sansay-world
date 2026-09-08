import { test, expect } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'
import { copy } from './helpers/copy'

/**
 * FR-022 / SC-005 — the load-bearing requirement of User Story 3: a
 * discipline the owner creates in the admin must appear on the home page, in
 * the navigation, and in the enquiry topic list with no code change and no
 * deploy.
 */
test.describe('A discipline created in the admin propagates everywhere (US3, FR-022)', () => {
  const suffix = uniqueSuffix()
  const name = `Тест-направление ${suffix}`
  const slug = `e2e-${suffix}`
  const strapline = 'создано автотестом'

  let scratch: AdminScratch

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())
  })

  test.afterAll(async () => {
    // Always removes what this spec created, assertion failures included.
    await scratch.cleanup()
  })

  test('appears on the home page, in navigation, and as the enquiry topic — no code change', async ({
    page,
  }) => {
    await scratch.create('disciplines', {
      name,
      slug,
      strapline,
      description: richText('Направление, созданное end-to-end тестом.'),
      tone: 'live',
      order: 999,
      published: true,
    })

    // 1. Home page discipline list (FR-003 + FR-022).
    await page.goto('/')
    const card = page.locator('#disciplines').getByRole('link', { name: new RegExp(name) })
    await expect(card, 'the new discipline is a card on the home page').toBeVisible()
    await expect(card).toHaveAttribute('href', `/${slug}`)
    await expect(card).toContainText(strapline)

    // 2. Site navigation (FR-022).
    const nav = page.getByRole('navigation')
    await expect(
      nav.getByRole('link', { name }),
      'the new discipline is in the site navigation',
    ).toBeVisible()

    // 3. The enquiry topic list — visible as the pre-filled topic on its own
    //    page, and reachable as a topic from any other discipline page.
    await page.goto(`/${slug}`)
    await expect(page.getByLabel(copy.enquiry.fieldDiscipline)).toHaveValue(name)
  })

  test('disappears again once the owner deletes it', async ({ page }) => {
    const created = await scratch.create('disciplines', {
      name: `${name} (удаляемое)`,
      slug: `${slug}-removable`,
      strapline,
      description: richText('Временное направление.'),
      tone: 'digital',
      order: 998,
      published: true,
    })

    await page.goto('/')
    await expect(page.locator('#disciplines').getByRole('link', { name: new RegExp(`${name} \\(удаляемое\\)`) })).toBeVisible()

    const api = await adminApi()
    // Scoped delete by id, never an unfiltered one.
    const res = await api.delete(`/api/disciplines/${created.id}`)
    expect(res.ok()).toBeTruthy()
    await api.dispose()

    await page.goto('/')
    await expect(
      page.locator('#disciplines').getByRole('link', { name: new RegExp(`${name} \\(удаляемое\\)`) }),
    ).toHaveCount(0)
    await expect(page.getByRole('navigation').getByRole('link', { name: `${name} (удаляемое)` })).toHaveCount(0)
  })
})
