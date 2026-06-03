import { test, expect } from '@playwright/test'

// ── Helper ────────────────────────────────────────────────────────────────────
async function registerAndLogin(page, email = 'tester@wageora.com', password = 'pass1234') {
  await page.goto('/signup')
  await page.fill('input[id="name"]', 'Test User')
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/employees')
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1: Authentication flow
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Feature 1 – Auth flow', () => {

  test('landing page shows hero and CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-headline')).toBeVisible()
    await expect(page.locator('.logo-script')).toHaveText('Wageora')
    await expect(page.locator('text=Admin login')).toBeVisible()
    await expect(page.locator('text=Employee login')).toBeVisible()
  })

  test('sign-up with valid data redirects to /employees', async ({ page }) => {
    await registerAndLogin(page, `user_${Date.now()}@test.com`)
    await expect(page).toHaveURL(/employees/)
    await expect(page.locator('.emp-page-title')).toHaveText('Employees')
  })

  test('sign-up with invalid email shows validation error', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Ana')
    await page.fill('input[id="email"]', 'bademail')
    await page.fill('input[id="password"]', 'pass1234')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-msg').first()).toBeVisible()
    await expect(page).not.toHaveURL(/employees/)
  })

  test('sign-up with short password shows validation error', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'Ana')
    await page.fill('input[id="email"]', 'valid@test.com')
    await page.fill('input[id="password"]', '123')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-msg').first()).toBeVisible()
  })

  test('sign-up with short name shows validation error', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('input[id="name"]', 'A')
    await page.fill('input[id="email"]', 'valid@test.com')
    await page.fill('input[id="password"]', 'pass1234')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-msg').first()).toBeVisible()
  })

  test('unauthenticated user is redirected from /employees to /login', async ({ page }) => {
    await page.goto('/employees')
    await expect(page).toHaveURL(/login/)
  })

  test('unauthenticated user is redirected from /charts to /login', async ({ page }) => {
    await page.goto('/charts')
    await expect(page).toHaveURL(/login/)
  })

  test('log out navigates back to landing page', async ({ page }) => {
    await registerAndLogin(page, `logout_${Date.now()}@test.com`)
    await page.click('text=Log out')
    await expect(page).toHaveURL('/')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: Employee CRUD
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Feature 2 – Employee CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, `crud_${Date.now()}@test.com`)
  })

  test('employees table shows first page of seed rows (PAGE_SIZE = 7)', async ({ page }) => {
    await expect(page.locator('tbody tr')).toHaveCount(7)
  })

  test('page subtitle shows total employee count', async ({ page }) => {
    const sub = page.locator('.emp-page-sub')
    await expect(sub).toBeVisible()
    const text = await sub.textContent()
    expect(parseInt(text)).toBe(10)
  })

  test('add employee modal opens and closes', async ({ page }) => {
    await page.click('text=+ Add Employee')
    await expect(page.locator('.modal')).toBeVisible()
    await page.click('.modal-close')
    await expect(page.locator('.modal')).not.toBeVisible()
  })

  test('add employee with blank name shows validation error', async ({ page }) => {
    await page.click('text=+ Add Employee')
    await page.click('text=Save Employee')
    await expect(page.locator('.error-msg').first()).toBeVisible()
  })

  test('add employee with valid data increases total count', async ({ page }) => {
    const countBefore = parseInt(await page.locator('.emp-page-sub').textContent())
    await page.click('text=+ Add Employee')
    await page.fill('input[placeholder="e.g. Ana Popescu"]', 'New Employee')
    const selects = page.locator('.modal select')
    await selects.nth(0).selectOption('Hourly')
    await selects.nth(1).selectOption('Accountant')
    await page.fill('input[placeholder="e.g. 35"]', '30')
    await page.click('text=Save Employee')
    const countAfter = parseInt(await page.locator('.emp-page-sub').textContent())
    expect(countAfter).toBe(countBefore + 1)
  })

  test('clicking View/Edit opens detail modal', async ({ page }) => {
    // getByRole skips hidden elements — works on both desktop (table) and mobile (cards)
    await page.getByRole('button', { name: 'View/Edit' }).first().click()
    await expect(page.locator('.modal')).toBeVisible()
    await expect(page.locator('.modal-title')).toBeVisible()
  })

  test('detail modal shows pay slip toggle and edit button', async ({ page }) => {
    await page.getByRole('button', { name: 'View/Edit' }).first().click()
    await expect(page.locator('text=Pay Slips')).toBeVisible()
    const editBtn = page.locator('.modal-footer').getByRole('button', { name: 'Edit' })
    await editBtn.scrollIntoViewIfNeeded()
    await expect(editBtn).toBeVisible()
  })

  test('pay slip section toggles on click', async ({ page }) => {
    await page.getByRole('button', { name: 'View/Edit' }).first().click()
    await page.locator('text=Pay Slips').scrollIntoViewIfNeeded()
    await page.click('text=Pay Slips')
    await expect(page.locator('text=Net Pay')).toBeVisible()
    await page.click('text=Pay Slips')
    await expect(page.locator('text=Net Pay')).not.toBeVisible()
  })

  test('edit employee modal pre-fills existing name', async ({ page }) => {
    await page.getByRole('button', { name: 'View/Edit' }).first().click()
    const editBtn = page.locator('.modal-footer').getByRole('button', { name: 'Edit' })
    await editBtn.scrollIntoViewIfNeeded()
    await editBtn.click()
    const nameInput = page.locator('input[placeholder="e.g. Ana Popescu"]')
    await expect(nameInput).toBeVisible()
    const val = await nameInput.inputValue()
    expect(val.length).toBeGreaterThan(0)
  })

  test('pagination next button loads different rows', async ({ page }) => {
    const firstPageFirst = await page.locator('tbody tr:first-child td:nth-child(2)').textContent()
    await page.click('text=Next →')
    const secondPageFirst = await page.locator('tbody tr:first-child td:nth-child(2)').textContent()
    expect(firstPageFirst).not.toBe(secondPageFirst)
  })

  test('search filters table rows', async ({ page }) => {
    await page.fill('.search-input', 'Marco')
    await expect(page.locator('tbody tr')).toHaveCount(1)
  })

  test('search with no match shows empty state', async ({ page }) => {
    await page.fill('.search-input', 'zzznomatch')
    // Desktop table and mobile cards both render the message — check whichever is visible
    const desktopEmpty = page.locator('.emp-desktop').getByText('No employees found.')
    const mobileEmpty = page.locator('.emp-mobile').getByText('No employees found.')
    const eitherVisible = await desktopEmpty.isVisible() || await mobileEmpty.isVisible()
    expect(eitherVisible).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: Charts & Analytics
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Feature 3 – Charts & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, `chart_${Date.now()}@test.com`)
    // Use the in-app button — page.goto() would reload and wipe RAM-only auth state
    await page.click('text=View Charts')
    await page.waitForURL('**/charts')
  })

  test('charts page loads and shows a heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
  })

  test('charts page shows recharts SVG visualisation', async ({ page }) => {
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible()
  })

  test('pie chart view toggle button exists and is clickable', async ({ page }) => {
    const pieBtn = page.getByRole('button', { name: 'Pie chart' })
    await expect(pieBtn).toBeVisible()
    await pieBtn.click()
    // After click, the pie chart wrapper should be visible
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible()
  })

  test('bar chart view toggle button exists and switches view', async ({ page }) => {
    const barBtn = page.getByRole('button', { name: 'Bar chart' })
    await expect(barBtn).toBeVisible()
    await barBtn.click()
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible()
  })

  test('tabular view toggle button shows a data table', async ({ page }) => {
    const tabBtn = page.getByRole('button', { name: 'Tabular' })
    await expect(tabBtn).toBeVisible()
    await tabBtn.click()
    // A table with department data should appear
    await expect(page.locator('table').first()).toBeVisible()
  })

  test('employee data table is visible below the chart', async ({ page }) => {
    // At least one employee row exists somewhere on the page
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })

  test('an Add button exists on the charts page', async ({ page }) => {
    await expect(page.getByRole('button', { name: /\+ add/i }).first()).toBeVisible()
  })

  test('adding an employee from charts page increases row count', async ({ page }) => {
    const before = await page.locator('tbody tr').count()
    // Click the first Add/+ Add button on the page
    await page.getByRole('button', { name: /\+ add/i }).first().click()
    await page.fill('input[placeholder="e.g. Ana Popescu"]', 'Chart Test')
    const selects = page.locator('.modal select')
    await selects.nth(0).selectOption('Hourly')
    await selects.nth(1).selectOption('Accountant')
    await page.fill('input[placeholder="e.g. 35"]', '40')
    await page.click('text=Save Employee')
    const after = await page.locator('tbody tr').count()
    expect(after).toBe(before + 1)
  })

  test('page is accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.getByRole('heading', { name: /analytics/i })).toBeVisible()
    await expect(page.locator('tbody tr').first()).toBeVisible()
  })
})