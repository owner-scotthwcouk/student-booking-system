import { defineConfig } from '@playwright/test'

const E2E_PORT = 4173
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry'
  },
  webServer: {
    command: `npm.cmd run dev -- --host 127.0.0.1 --port ${E2E_PORT} --strictPort`,
    url: E2E_BASE_URL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.local',
      VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
      VITE_E2E_AUTH_BYPASS: 'true',
      VITE_E2E_USER_ID: '11111111-1111-1111-1111-111111111111',
      VITE_E2E_USER_ROLE: 'student',
      VITE_E2E_USER_NAME: 'Student E2E',
      VITE_E2E_USER_EMAIL: 'student.e2e@example.com'
    }
  }
})
