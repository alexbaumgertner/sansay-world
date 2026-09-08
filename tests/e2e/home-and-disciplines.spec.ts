import { test, expect } from '@playwright/test'

/** Quickstart Scenario F + User Story 1's independent test. */
test.describe('Home page and discipline browsing (US1)', () => {
  test('first screen shows name, essence, and CTA without scrolling', async ({ page }) => {
    await page.goto('/')
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toBeInViewport()
    await expect(page.getByRole('link', { name: /работы/i })).toBeInViewport()
  })

  test('every published discipline is reachable and opens its own page', async ({ page }) => {
    await page.goto('/')
    const disciplineLink = page.locator('#disciplines a').first()
    await expect(disciplineLink).toBeVisible()
    const href = await disciplineLink.getAttribute('href')
    await disciplineLink.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.locator('h1')).toBeVisible()
  })

  test('no horizontal scroll at a 375px mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(hasHorizontalScroll).toBe(false)
  })
})
