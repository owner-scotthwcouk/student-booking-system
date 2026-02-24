import { expect, test } from '@playwright/test'

const SUPABASE_URL = 'https://e2e.supabase.local'
const STUDENT_ID = '11111111-1111-1111-1111-111111111111'
const TUTOR_ID = '22222222-2222-2222-2222-222222222222'
const BOOKING_ID = '33333333-3333-3333-3333-333333333333'
const ROOM_TOKEN = 'room-token-abc'

function bookingFixture({ lobbyEnabled = true } = {}) {
  return {
    id: BOOKING_ID,
    student_id: STUDENT_ID,
    tutor_id: TUTOR_ID,
    lesson_date: '2026-02-24',
    lesson_time: '14:30:00',
    video_room_token: ROOM_TOKEN,
    video_provider: 'jitsi',
    video_room_lobby_enabled: lobbyEnabled
  }
}

async function mockSupabaseVideoRoom(
  page,
  {
    validPasscode = '123456',
    lobbyEnabled = true,
    bookingOverrides = {},
    initialAdmissions = []
  } = {}
) {
  const booking = {
    ...bookingFixture({ lobbyEnabled }),
    ...bookingOverrides
  }
  const events = []
  const postedEvents = []
  const admissions = initialAdmissions.map((admission, index) => ({
    id: admission.id || `admission-${index + 1}`,
    booking_id: BOOKING_ID,
    student_id: STUDENT_ID,
    requested_at: new Date().toISOString(),
    approved_at: null,
    ...admission
  }))

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname, searchParams } = url
    const method = request.method()

    if (pathname === '/rest/v1/bookings' && method === 'GET') {
      const roomTokenFilter = searchParams.get('video_room_token')
      if (roomTokenFilter === `eq.${ROOM_TOKEN}`) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([booking])
        })
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }

    if (pathname === '/rest/v1/rpc/verify_video_room_access' && method === 'POST') {
      const payload = request.postDataJSON()
      const isValid = payload?.p_room_token === ROOM_TOKEN && payload?.p_passcode === validPasscode
      const body = isValid ? [booking] : []
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    }

    if (pathname === '/rest/v1/video_room_events' && method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(events)
      })
    }

    if (pathname === '/rest/v1/video_room_events' && method === 'POST') {
      const payload = request.postDataJSON()
      postedEvents.push(payload)
      events.push({
        id: `evt-${events.length + 1}`,
        booking_id: payload?.booking_id || BOOKING_ID,
        user_id: payload?.user_id || STUDENT_ID,
        display_name: payload?.display_name || '',
        event_type: payload?.event_type || 'chat',
        message: payload?.message ?? null,
        created_at: new Date().toISOString()
      })
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([events[events.length - 1]])
      })
    }

    if (pathname === '/rest/v1/video_room_admissions' && method === 'POST') {
      const payload = request.postDataJSON()
      const existingIndex = admissions.findIndex(
        (admission) => admission.booking_id === payload?.booking_id && admission.student_id === payload?.student_id
      )
      const admissionRow = {
        id: existingIndex >= 0 ? admissions[existingIndex].id : `admission-${admissions.length + 1}`,
        booking_id: payload?.booking_id || BOOKING_ID,
        student_id: payload?.student_id || STUDENT_ID,
        requested_at: payload?.requested_at || new Date().toISOString(),
        approved_at: null,
        approved_by: null,
        updated_at: payload?.updated_at || new Date().toISOString()
      }
      if (existingIndex >= 0) {
        admissions[existingIndex] = admissionRow
      } else {
        admissions.push(admissionRow)
      }
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([admissionRow])
      })
    }

    if (pathname === '/rest/v1/video_room_admissions' && method === 'PATCH') {
      const payload = request.postDataJSON()
      const idFilter = searchParams.get('id')
      const admissionId = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null
      const existingIndex = admissions.findIndex((admission) => admission.id === admissionId)

      if (existingIndex >= 0) {
        admissions[existingIndex] = {
          ...admissions[existingIndex],
          ...payload
        }
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(existingIndex >= 0 ? [admissions[existingIndex]] : [])
      })
    }

    if (pathname === '/rest/v1/video_room_admissions' && method === 'GET') {
      const studentIdFilter = searchParams.get('student_id')
      if (studentIdFilter) {
        const studentId = studentIdFilter.startsWith('eq.') ? studentIdFilter.slice(3) : studentIdFilter
        const row = admissions.find((admission) => admission.student_id === studentId) || null
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(row ? [row] : [])
        })
      }

      const pendingAdmissions = admissions.filter((admission) => !admission.approved_at)
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pendingAdmissions)
      })
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  return {
    getPostedEvents: () => postedEvents,
    getAdmissions: () => admissions
  }
}

test('shows an error for invalid room passcode', async ({ page }) => {
  await mockSupabaseVideoRoom(page, { validPasscode: '123456' })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await expect(page.getByRole('heading', { name: 'Lesson Video Room' })).toBeVisible()

  await page.getByPlaceholder('6-digit passcode').fill('000000')
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByText('Incorrect passcode or access denied.')).toBeVisible()
  await expect(page.locator('iframe[title="Video Room"]')).toHaveCount(0)
})

test('enters the room when passcode is correct and lobby is disabled', async ({ page }) => {
  await mockSupabaseVideoRoom(page, { validPasscode: '654321', lobbyEnabled: false })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('654321')
  await page.getByRole('button', { name: 'Verify' }).click()

  const roomFrame = page.locator('iframe[title="Video Room"]')
  await expect(roomFrame).toBeVisible()
  await expect(roomFrame).toHaveAttribute('src', /https:\/\/meet\.jit\.si\/TutorHub-/)
})

test('shows waiting room state when lobby is enabled and student requests admission', async ({ page }) => {
  const mocks = await mockSupabaseVideoRoom(page, { validPasscode: '111222', lobbyEnabled: true })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('111222')
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByRole('heading', { name: 'Waiting Room' })).toBeVisible()
  await page.getByRole('button', { name: 'Request to Join' }).click()

  await expect(page.getByText('Your request has been sent. Waiting for tutor approval...')).toBeVisible()
  await expect(page.locator('iframe[title="Video Room"]')).toHaveCount(0)
  expect(mocks.getAdmissions().length).toBeGreaterThan(0)
})

test('tutor can approve a pending lobby request', async ({ page }) => {
  await mockSupabaseVideoRoom(page, {
    validPasscode: '222333',
    lobbyEnabled: true,
    bookingOverrides: {
      tutor_id: STUDENT_ID,
      student_id: TUTOR_ID
    },
    initialAdmissions: [
      {
        id: 'admission-pending-1',
        booking_id: BOOKING_ID,
        student_id: TUTOR_ID,
        requested_at: new Date().toISOString(),
        approved_at: null
      }
    ]
  })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('222333')
  await page.getByRole('button', { name: 'Verify' }).click()

  await expect(page.getByRole('heading', { name: 'Lobby Requests' })).toBeVisible()
  await page.getByRole('button', { name: 'Admit' }).click()
  await expect(page.getByText('No pending requests.')).toBeVisible()
})

test('persists and displays chat messages after send', async ({ page }) => {
  const mocks = await mockSupabaseVideoRoom(page, { validPasscode: '777888', lobbyEnabled: false })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('777888')
  await page.getByRole('button', { name: 'Verify' }).click()

  const message = 'Hello from Playwright chat test'
  await page.getByPlaceholder('Type a message').fill(message)
  await page.getByRole('button', { name: 'Send' }).click()

  await expect(page.getByText(message)).toBeVisible()
  expect(
    mocks
      .getPostedEvents()
      .some((event) => event?.event_type === 'chat' && event?.message === message)
  ).toBeTruthy()
})

test('opens whiteboard tools and canvas in active room', async ({ page }) => {
  await mockSupabaseVideoRoom(page, { validPasscode: '444555', lobbyEnabled: false })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('444555')
  await page.getByRole('button', { name: 'Verify' }).click()

  await page.getByRole('button', { name: 'Open Whiteboard' }).click()
  await expect(page.getByRole('heading', { name: 'Whiteboard' })).toBeVisible()
  await expect(page.locator('canvas[aria-label="Whiteboard Canvas"]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible()
})

test('starts and stops local recording in active room', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeMediaRecorder {
      constructor(stream) {
        this.stream = stream
        this.state = 'inactive'
        this.ondataavailable = null
        this.onstop = null
      }
      start() {
        this.state = 'recording'
      }
      stop() {
        this.state = 'inactive'
        if (this.ondataavailable) {
          this.ondataavailable({
            data: new Blob(['e2e'], { type: 'video/webm' }),
            size: 3
          })
        }
        if (this.onstop) this.onstop()
      }
    }

    const fakeStream = {
      getTracks: () => [{ stop: () => {} }]
    }

    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true })
    }
    navigator.mediaDevices.getDisplayMedia = async () => fakeStream
    Object.defineProperty(window, 'MediaRecorder', { value: FakeMediaRecorder, configurable: true })
  })

  await mockSupabaseVideoRoom(page, { validPasscode: '666777', lobbyEnabled: false })

  await page.goto(`/video/${ROOM_TOKEN}`)
  await page.getByPlaceholder('6-digit passcode').fill('666777')
  await page.getByRole('button', { name: 'Verify' }).click()

  await page.getByRole('button', { name: 'Start Recording' }).click()
  await expect(page.getByRole('button', { name: 'Stop Recording' })).toBeVisible()

  await page.getByRole('button', { name: 'Stop Recording' }).click()
  await expect(page.getByRole('button', { name: 'Start Recording' })).toBeVisible()
})
