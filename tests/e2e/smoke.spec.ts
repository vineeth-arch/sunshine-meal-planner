import { test, expect, type Page } from '@playwright/test'

const TEST_AUTH_STORAGE_KEY = 'mk:e2e-auth-state'

async function setMockAuthState(page: Page, state: 'logged-out' | 'admin' | 'editor' | 'viewer') {
  await page.addInitScript(
    ([storageKey, storageValue]) => {
      window.localStorage.setItem(storageKey, storageValue)
    },
    [TEST_AUTH_STORAGE_KEY, state] as const,
  )
}

test('app loads and login screen appears', async ({ page }) => {
  await setMockAuthState(page, 'logged-out')
  await page.goto('/')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Choose your kitchen profile' })).toBeVisible()
})

test('profile selection updates the login form and can continue into the app', async ({ page }) => {
  await setMockAuthState(page, 'logged-out')
  await page.goto('/login')

  await page.getByRole('button', { name: /Mom/i }).click()
  await expect(page.getByText('Use the Mom profile password from Firebase Authentication.')).toBeVisible()

  const passwordInput = page.getByLabel('Password')
  await expect(passwordInput).toBeEnabled()
  await passwordInput.fill('kitchen-pass')
  await page.getByRole('button', { name: 'Continue as Mom' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Family planning hub' })).toBeVisible()
})

test('protected routes require auth', async ({ page }) => {
  await setMockAuthState(page, 'logged-out')
  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Choose your kitchen profile' })).toBeVisible()
})

test('admin route blocks non-admin users', async ({ page }) => {
  await setMockAuthState(page, 'editor')
  await page.goto('/admin')

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'This admin dashboard is locked' })).toBeVisible()
  await expect(page.getByText('Your account is not an admin')).toBeVisible()
})

test('main navigation renders for authenticated users', async ({ page }) => {
  await setMockAuthState(page, 'admin')
  await page.goto('/dashboard')

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Today/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Tomorrow/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Week Planner/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Pantry/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Dishes/i })).toBeVisible()
})
