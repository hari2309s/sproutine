import { test, expect } from '@playwright/test'

/**
 * Navigation guard tests — verify protected routes redirect to /
 * when there is no active session (unauthenticated state).
 *
 * Supabase getSession is intercepted to return null so the redirect
 * fires deterministically without a real auth session.
 */
test.describe('Navigation guards (unauthenticated)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the Supabase session endpoint to return no session
    await page.route('**/auth/v1/session**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { session: null }, error: null }),
      })
    )
  })

  test('/chat redirects to / when not authenticated', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL('/')
  })

  test('/insights redirects to / when not authenticated', async ({ page }) => {
    await page.goto('/insights')
    await expect(page).toHaveURL('/')
  })

  test('/ shows auth page when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible({ timeout: 10_000 })
  })
})
