import AxeBuilder from '@axe-core/playwright'
import { test as basis, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/** Bricht jede Anfrage ab, die nicht an die eigene Vorschau geht: Kein Test verlässt den Rechner. */
export async function nurLokal(context: BrowserContext, baseURL: string) {
  await context.route((url) => !url.href.startsWith(baseURL), (route) => route.abort())
}

export const test = basis.extend({
  // zweiter Parameter heißt in Playwright meist „use“; der Name kollidiert mit der Hook-Regel von oxlint
  context: async ({ context, baseURL }, bereitstellen) => {
    await nurLokal(context, baseURL!)
    await bereitstellen(context)
  },
})
export { expect }

/** Neuer Browserkontext mit leerem Profil (eigene IndexedDB) */
export async function leeresProfil(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, locale: 'de-DE' })
  await nurLokal(context, baseURL)
  const page = await context.newPage()
  await page.goto('/')
  return { context, page }
}

export async function schritt(page: Page, name: string | RegExp) {
  await page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name }).click()
}

/** Wartet, bis der Schreibpuffer (400 ms) die Änderungen in IndexedDB geschrieben hat. */
export async function gespeichert(page: Page) {
  await page.waitForTimeout(500)
  await expect(page.locator('.speicherstatus')).toHaveText('gespeichert')
}

export async function neuerBetrieb(page: Page, name: string) {
  await page.getByRole('button', { name: 'Neuer Betrieb' }).click()
  await page.getByLabel('Name des Betriebs').fill(name)
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await expect(page.getByRole('heading', { name: 'Betrieb', level: 1 })).toBeVisible()
}

export async function zurStartseite(page: Page) {
  await page.getByRole('button', { name: 'Sicherheitscheck' }).click()
}

/** axe ohne schwere Befunde */
export async function pruefeBarrierefreiheit(page: Page, wo: string) {
  const ergebnis = await new AxeBuilder({ page }).analyze()
  const schwer = ergebnis.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  expect(schwer.map((v) => `${wo}: ${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([])
}
