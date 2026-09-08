import { test, expect } from '@playwright/test'
import { AdminScratch, adminApi, richText, uniqueSuffix } from './helpers/admin'
import { copy } from './helpers/copy'

/** User Story 2 — FR-009, FR-010, FR-012, FR-016, FR-017. */
test.describe('Enquiry form (US2)', () => {
  const suffix = uniqueSuffix()
  const disciplineName = `Направление заявки ${suffix}`
  const slug = `e2e-enq-${suffix}`
  const senderName = `Тестовый отправитель ${suffix}`

  let scratch: AdminScratch
  let disciplineId: string

  test.beforeAll(async () => {
    scratch = new AdminScratch(await adminApi())
    const d = await scratch.create('disciplines', {
      name: disciplineName,
      slug,
      strapline: 'страплайн заявки',
      description: richText('Описание.'),
      tone: 'live',
      order: 995,
      published: true,
    })
    disciplineId = d.id
  })

  test.afterAll(async () => {
    await scratch.cleanup()
  })

  test('FR-009/FR-010: the form collects the required fields with the discipline pre-filled', async ({
    page,
  }) => {
    await page.goto(`/${slug}`)

    const topic = page.getByLabel(copy.enquiry.fieldDiscipline)
    await expect(topic, 'discipline is pre-filled and visible').toHaveValue(disciplineName)
    await expect(topic, 'the visitor does not choose it manually').toHaveAttribute('readonly', '')

    await expect(page.getByLabel(copy.enquiry.fieldName)).toBeVisible()
    await expect(page.getByLabel(copy.enquiry.fieldContact)).toBeVisible()
    await expect(page.getByLabel(copy.enquiry.fieldDate)).toBeVisible()
    await expect(page.getByLabel(copy.enquiry.fieldDescription)).toBeVisible()
  })

  test('FR-012/FR-016: a valid submission confirms on screen and persists with status "new"', async ({
    page,
  }) => {
    await page.goto(`/${slug}`)

    await page.getByLabel(copy.enquiry.fieldName).fill(senderName)
    await page.getByLabel(copy.enquiry.fieldContact).fill('telegram @e2e')
    await page.getByLabel(copy.enquiry.fieldDescription).fill(`Проверка формы ${suffix}`)
    await page.getByRole('button', { name: copy.enquiry.submit }).click()

    // FR-016: confirmation appears only after acceptance and states the reply window.
    const confirmation = page.getByRole('status')
    await expect(confirmation).toBeVisible()
    await expect(confirmation).toContainText(copy.enquiry.confirmationTitle)
    await expect(confirmation, 'states when a reply can be expected').not.toHaveText(
      new RegExp(`^\\s*${copy.enquiry.confirmationTitle}\\s*$`),
    )

    // FR-012: retrievable by the owner in the admin, status "new", right discipline.
    const api = await adminApi()
    const res = await api.get(
      `/api/enquiries?where[name][equals]=${encodeURIComponent(senderName)}&depth=1`,
    )
    expect(res.ok()).toBeTruthy()
    const { docs } = await res.json()
    await api.dispose()

    expect(docs, 'the enquiry is stored').toHaveLength(1)
    expect(docs[0].status).toBe('new')
    expect(docs[0].discipline.id ?? docs[0].discipline).toBe(disciplineId)

    scratch.track('enquiries', docs[0].id)
  })

  test('validation rejects an empty required field', async ({ page }) => {
    await page.goto(`/${slug}`)

    // Leave the required "name" blank; fill the rest.
    await page.getByLabel(copy.enquiry.fieldContact).fill('telegram @e2e')
    await page.getByLabel(copy.enquiry.fieldDescription).fill('Без имени')
    await page.getByRole('button', { name: copy.enquiry.submit }).click()

    await expect(page.getByRole('status'), 'no false confirmation').toHaveCount(0)

    const nameField = page.getByLabel(copy.enquiry.fieldName)
    const blocked = await nameField.evaluate(
      (el: HTMLInputElement) => !el.checkValidity() && el.validity.valueMissing,
    )
    expect(blocked, 'the empty required field is rejected before submission').toBe(true)
  })

  test('FR-017: a submission with the honeypot filled never shows a confirmation', async ({ page }) => {
    const botName = `Бот ${suffix}`
    await page.goto(`/${slug}`)

    await page.getByLabel(copy.enquiry.fieldName).fill(botName)
    await page.getByLabel(copy.enquiry.fieldContact).fill('bot@example.com')
    await page.getByLabel(copy.enquiry.fieldDescription).fill('spam')
    // A bot filling every input on the page fills this one too.
    await page.locator('#company_website').fill('http://spam.example')
    await page.getByRole('button', { name: copy.enquiry.submit }).click()

    await expect(page.getByRole('status')).toHaveCount(0)

    const api = await adminApi()
    const res = await api.get(`/api/enquiries?where[name][equals]=${encodeURIComponent(botName)}`)
    const { docs } = await res.json()
    await api.dispose()
    expect(docs, 'the bot submission was never stored').toHaveLength(0)
  })
})
