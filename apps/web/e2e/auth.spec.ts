import { test, expect } from '@playwright/test'

/**
 * Auth page tests — all run unauthenticated.
 * Supabase OTP requests are intercepted so no real email is sent.
 */
test.describe('Auth page', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the Supabase OTP endpoint so no real request is made
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    )
  })

  test('shows Truffle branding and email form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Truffle' })).toBeVisible()
    await expect(page.getByText('Your finances, unearthed.', { exact: true })).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeVisible()
  })

  test('submit button is enabled with a valid email', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('your@email.com')
    const button = page.getByRole('button', { name: 'Continue with email' })

    await input.fill('test@example.com')
    await expect(button).toBeEnabled()
  })

  test('shows magic link confirmation after submission', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('your@email.com').fill('test@example.com')
    await page.getByRole('button', { name: 'Continue with email' }).click()

    await expect(page.getByText('Check your email')).toBeVisible()
    await expect(page.getByText('test@example.com')).toBeVisible()
  })

  test('shows expired link error when ?error=auth_failed is in URL', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await expect(
      page.getByText('Sign-in link expired or already used. Please request a new one.')
    ).toBeVisible()
  })

  test('shows magic link hint text', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Sign in with a magic link · No password needed')).toBeVisible()
  })

  // The submit button is intentionally not gated on email validity — see
  // AuthPage.tsx: a previously-silent disabled state (no explanation shown)
  // was replaced with native required/type=email validation on submit, plus
  // an inline error message, per an accessibility fix. These tests lock in
  // that the button itself stays enabled either way.
  test('submit button is enabled even when email field is empty', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeEnabled()
  })

  test('submit button is enabled with an invalid email format', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder('your@email.com').fill('notanemail')
    await expect(page.getByRole('button', { name: 'Continue with email' })).toBeEnabled()
  })
})
