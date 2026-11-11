import { defineConfig } from '@playwright/test'

const CI = !!process.env.CI
// Eigener Port: Auf diesem Rechner laufen mehrere Apps parallel; 4173 gehört dem Prozesslotsen.
// SC_PORT erlaubt einen anderen Port für eine zweite Arbeitskopie.
const PORT = Number(process.env.SC_PORT ?? 4181)

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  // Lokal höchstens 4 Browser gleichzeitig (SC_WORKERS ändert das): Oft testen mehrere Apps parallel,
  // und mit 11 Arbeitern liefen schwere Tests (Argon2, PDF, axe) unter dieser Last in ihr Zeitlimit.
  workers: CI ? undefined : Number(process.env.SC_WORKERS ?? 4),
  retries: CI ? 1 : 0,
  reporter: CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Vorhandenen Browser nutzen statt einen herunterzuladen: lokal Edge, in der CI Chrome
    channel: CI ? 'chrome' : 'msedge',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
