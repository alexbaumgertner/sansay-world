import { test, expect } from '@playwright/test'

/** Quickstart Scenarios A/C + User Story 2's independent test. */
test.describe('Enquiry submission (US2)', () => {
  test('a visitor can submit an enquiry and sees a confirmation with a reply window', async ({ page }) => {
    await page.goto('/music')
    await page.getByLabel('Имя').fill('Плейрайт Тест')
    await page.getByLabel('Как с вами связаться').fill('telegram @playwright')
    await page.getByLabel('Опишите задачу').fill('Проверка формы через Playwright')
    await page.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByRole('status')).toBeVisible()
    await expect(page.getByRole('status')).toContainText('Заявка получена')
  })

  test('a filled honeypot field never shows a success confirmation (FR-017)', async ({ page }) => {
    await page.goto('/music')
    await page.getByLabel('Имя').fill('Bot')
    await page.getByLabel('Как с вами связаться').fill('bot@example.com')
    await page.getByLabel('Опишите задачу').fill('spam')
    // The honeypot input is present but hidden from sighted/keyboard users;
    // a bot filling every input on the page would fill it too.
    await page.locator('#company_website').fill('http://spam.example')
    await page.getByRole('button', { name: 'Отправить' }).click()
    await expect(page.getByRole('status')).not.toBeVisible()
  })

  test('the discipline field is pre-filled and visible, not editable by the visitor', async ({ page }) => {
    await page.goto('/music')
    const disciplineField = page.getByLabel('Направление')
    await expect(disciplineField).toHaveValue('Музыка')
    await expect(disciplineField).toHaveAttribute('readonly', '')
  })
})
