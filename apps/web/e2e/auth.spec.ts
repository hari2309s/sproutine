import { test, expect, type Page } from '@playwright/test'

/**
 * Auth page tests: all run signed out. Supabase auth endpoints are
 * intercepted, so no account is created and no email is sent.
 */
const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const user = (identities: unknown[]) => ({
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  identities,
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-14T00:00:00Z',
})

async function fillSignUp(page: Page, password = 'correct horse') {
  await page.getByPlaceholder('What should I call you?').fill('Sam')
  await page.getByPlaceholder('you@example.com').fill('test@example.com')
  await page.getByPlaceholder('At least 8 characters').fill(password)
}

test.describe('Auth page', () => {
  test('shows branding and the create-account form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Sproutine', { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Eat well, one sprout at a time.' })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'New here' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await expect(page.getByPlaceholder('What should I call you?')).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('At least 8 characters')).toHaveAttribute('type', 'password')
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
  })

  test('asks for a name and an 8-character password before calling Supabase', async ({ page }) => {
    let called = false
    await page.route('**/auth/v1/signup**', (route) => {
      called = true
      return route.fulfill(json({}))
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Tell me what to call you.')).toBeVisible()
    await fillSignUp(page, 'short')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
    expect(called).toBe(false)
  })

  test('sends the name with the sign-up and shows the confirm-email step', async ({ page }) => {
    let body: Record<string, unknown> = {}
    await page.route('**/auth/v1/signup**', (route) => {
      body = route.request().postDataJSON()
      return route.fulfill(json(user([{ id: 'x' }])))
    })
    await page.goto('/')
    await fillSignUp(page)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText(/I sent a confirmation link to test@example.com/)).toBeVisible()
    expect(body.data).toEqual({ display_name: 'Sam' })
    expect(body.password).toBe('correct horse')
  })

  test('does not reveal whether an email already has an account', async ({ page }) => {
    // Supabase returns a known address with no identities; the page answers
    // exactly as for a new one.
    await page.route('**/auth/v1/signup**', (route) => route.fulfill(json(user([]))))
    await page.goto('/')
    await fillSignUp(page)
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText(/I sent a confirmation link to test@example.com/)).toBeVisible()
  })

  test('shows a friendly message for a wrong password', async ({ page }) => {
    await page.route('**/auth/v1/token**', (route) =>
      route.fulfill(
        json(
          {
            code: 'invalid_credentials',
            msg: 'Invalid login credentials',
            message: 'Invalid login credentials',
          },
          400
        )
      )
    )
    await page.goto('/')
    await page.getByRole('button', { name: 'I have an account' }).click()
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder('Your password').fill('not the password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByText(/That email and password don't match/)).toBeVisible()
  })

  test('shows and hides the password', async ({ page }) => {
    await page.goto('/')
    const field = page.getByPlaceholder('At least 8 characters')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(field).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(field).toHaveAttribute('type', 'password')
  })

  test('sends a reset link from "Forgot password?"', async ({ page }) => {
    let redirect = ''
    await page.route('**/auth/v1/recover**', (route) => {
      redirect = new URL(route.request().url()).searchParams.get('redirect_to') ?? ''
      return route.fulfill(json({}))
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'I have an account' }).click()
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(/a link to set a new password is on its way/)).toBeVisible()
    expect(redirect).toMatch(/\/auth\/confirm\/recovery$/)
  })

  test('shows the expired-link error when ?error=auth_failed is in the URL', async ({ page }) => {
    await page.goto('/?error=auth_failed')
    await expect(
      page.getByText(
        'That link has expired or was already used. If you were confirming your email, try signing in.'
      )
    ).toBeVisible()
  })

  test('the reset page explains an expired link', async ({ page }) => {
    await page.goto('/auth/reset?error=expired')
    await expect(page.getByText(/That reset link has expired/)).toBeVisible()
  })
})
