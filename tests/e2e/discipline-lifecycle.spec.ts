import { test, expect, request as playwrightRequest } from '@playwright/test'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Quickstart Scenario D + User Story 3's independent test: creating a
 * discipline through the Local API (standing in for "the owner clicks Save
 * in the admin" — Payload's REST/GraphQL/Local API and its admin UI all go
 * through the same collection config) must make it appear on the home page,
 * in navigation, and as an enquiry topic with zero code changes.
 */
test.describe('New discipline propagates with no code change (US3)', () => {
  test('appears in nav, on the home page with correct tone accent, and as an enquiry topic', async ({ page }) => {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'disciplines',
      data: {
        name: 'Плейрайт-тест',
        slug: 'playwright-test',
        strapline: 'Создано тестом',
        tone: 'digital',
        order: 99,
        published: true,
        description: {
          root: {
            type: 'root',
            children: [{ type: 'paragraph', children: [{ type: 'text', text: 'x', version: 1 }], direction: 'ltr', format: '', indent: 0, version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
    })

    try {
      await page.goto('/')
      await expect(page.locator('nav').getByRole('link', { name: 'Плейрайт-тест' })).toBeVisible()

      const card = page.locator('#disciplines a', { hasText: 'Плейрайт-тест' })
      await expect(card).toBeVisible()
      await expect(card).toHaveClass(/border-tone-digital/)

      await page.goto('/playwright-test')
      const enquiryDisciplineField = page.getByLabel('Направление')
      await expect(enquiryDisciplineField).toHaveValue('Плейрайт-тест')
    } finally {
      await payload.delete({ collection: 'disciplines', id: created.id })
    }
  })
})

test.describe('API smoke: enquiry appears in admin data with correct discipline', () => {
  test('a submitted enquiry references the discipline it was submitted for', async () => {
    const payload = await getPayload({ config })
    const disciplines = await payload.find({ collection: 'disciplines', where: { slug: { equals: 'music' } } })
    const discipline = disciplines.docs[0]
    test.skip(!discipline, 'Seed data not present — run `pnpm seed` first')

    const api = await playwrightRequest.newContext({ baseURL: 'http://localhost:3000' })
    const res = await api.post('/api/enquiries', {
      data: {
        name: 'API Smoke',
        preferredContactMethod: 'email test@example.com',
        jobDescription: 'Проверка через API',
        discipline: discipline.id,
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.doc.discipline.slug).toBe('music')
    expect(body.doc.status).toBe('new')
  })
})
