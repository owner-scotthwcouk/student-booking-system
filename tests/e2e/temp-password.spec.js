import { expect, test } from '@playwright/test'

const SUPABASE_URL = 'https://e2e.supabase.local'
const STUDENT_ID = '11111111-1111-1111-1111-111111111111'
const STUDENT_EMAIL = 'student.e2e@example.com'
const TEMP_PASSWORD = 'TempPass123!'
const NEW_PASSWORD = 'NewPass123!'

function buildStudentUser(forcePasswordReset) {
  return {
    id: STUDENT_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: STUDENT_EMAIL,
    email_confirmed_at: new Date().toISOString(),
    created_at: '2026-06-15T00:00:00.000Z',
    updated_at: new Date().toISOString(),
    app_metadata: {
      role: 'student',
      force_password_reset: forcePasswordReset
    },
    user_metadata: {
      role: 'student',
      full_name: 'Student E2E'
    }
  }
}

function buildSession(forcePasswordReset) {
  return {
    access_token: `access-token-${forcePasswordReset ? 'pending' : 'ready'}`,
    refresh_token: `refresh-token-${forcePasswordReset ? 'pending' : 'ready'}`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: buildStudentUser(forcePasswordReset)
  }
}

async function mockTempPasswordAuth(page) {
  const state = {
    forcePasswordReset: true,
    signedIn: false,
    lastPassword: null
  }

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname, searchParams } = url
    const method = request.method()

    if (pathname === '/auth/v1/user' && method === 'GET') {
      if (!state.signedIn) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'session_not_found' })
        })
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildStudentUser(state.forcePasswordReset))
      })
    }

    if (pathname === '/auth/v1/token' && method === 'POST') {
      const grantType = searchParams.get('grant_type')
      const payload = request.postDataJSON()

      if (grantType === 'password') {
        if (payload?.email !== STUDENT_EMAIL || payload?.password !== TEMP_PASSWORD) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid login credentials' })
          })
        }

        state.signedIn = true
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildSession(true))
        })
      }

      if (grantType === 'refresh_token') {
        if (!state.signedIn) {
          return route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'session_not_found' })
          })
        }

        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildSession(state.forcePasswordReset))
        })
      }

      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unsupported auth flow' })
      })
    }

    if (pathname === '/auth/v1/user' && method === 'PUT') {
      const payload = request.postDataJSON()
      state.lastPassword = payload?.password ?? null

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildStudentUser(state.forcePasswordReset))
      })
    }

    if (pathname === '/functions/v1/complete-temp-password-reset' && method === 'POST') {
      state.forcePasswordReset = false
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      })
    }

    if (pathname === '/rest/v1/profiles' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: STUDENT_ID,
            role: 'student',
            full_name: 'Student E2E',
            email: STUDENT_EMAIL
          }
        ])
      })
    }

    if (pathname === '/rest/v1/system_settings' && method === 'GET') {
      const keyFilter = searchParams.get('key')
      if (keyFilter === 'eq.maintenance_mode') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ key: 'maintenance_mode', value: 'false' }])
        })
      }
    }

    if (pathname.startsWith('/rest/v1/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]'
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{}'
    })
  })

  return state
}

test('temporary password login completes the reset flow and opens the student dashboard', async ({ page }) => {
  const authState = await mockTempPasswordAuth(page)

  await page.goto('/login')
  await page.getByLabel('Email Address').fill(STUDENT_EMAIL)
  await page.getByLabel('Password').fill(TEMP_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(/\/reset-password$/)
  await expect(page.getByRole('heading', { name: 'Set New Password' })).toBeVisible()

  await page.getByLabel('Temporary Password').fill(TEMP_PASSWORD)
  await page.getByLabel('New Password').fill(NEW_PASSWORD)
  await page.getByLabel('Confirm Password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Update Password' }).click()

  await expect(page).toHaveURL(/\/student$/)
  await expect(page.getByRole('heading', { name: 'My Lessons' })).toBeVisible()
  expect(authState.lastPassword).toBe(NEW_PASSWORD)
})
