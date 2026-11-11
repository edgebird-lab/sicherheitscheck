// Rundgang durch die App mit Bildschirmfotos (Entwicklungswerkzeug).
// Aufruf: npm run build && npx vite preview & node scripts/ansehen.mjs <zielordner>
// Nutzt das installierte Edge (lokal) bzw. Chrome (CI); lädt keinen Browser herunter.
// Fremde Anfragen werden abgebrochen.
import { chromium } from '@playwright/test'

const ziel = process.argv[2] ?? 'test-results/ansehen'
const adresse = process.env.ADRESSE ?? 'http://localhost:4181/'
const browser = await chromium.launch({ channel: process.env.CI ? 'chrome' : 'msedge' })
const meldungen = []

async function seite(optionen = {}) {
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', ...optionen })
  await kontext.route((url) => !url.href.startsWith(adresse), (route) => route.abort())
  const page = await kontext.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') meldungen.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => meldungen.push(`pageerror: ${e.message}`))
  await page.goto(adresse)
  return page
}
const foto = (page, name, ganz = false) => page.screenshot({ path: `${ziel}/${name}.png`, fullPage: ganz })
const schritt = (page, name) => page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name }).click()

// Hell, Desktop
const page = await seite()
await page.waitForTimeout(500)
await foto(page, '01-start-leer')
await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
await page.waitForTimeout(500)
await foto(page, '02-betrieb', true)
await page.getByRole('button', { name: 'Sicherheitscheck', exact: false }).first().click()
await page.waitForTimeout(400)
await foto(page, '03-start-liste')
await page.getByRole('button', { name: /Tischlerei Beispiel/ }).click()
await schritt(page, /Vorgespräch/)
await page.waitForTimeout(300)
await foto(page, '04-vorgespraech', true)
await schritt(page, /Interview/)
await page.waitForTimeout(300)
await foto(page, '05-interview')
await schritt(page, /Auswertung/)
await page.waitForTimeout(300)
await foto(page, '06-auswertung', true)
await schritt(page, /Bericht/)
await page.waitForTimeout(300)
await foto(page, '07-bericht')
await schritt(page, /Betrieb/)
await page.getByRole('button', { name: 'Wiederholungsprüfung' }).first().click()
await schritt(page, /Interview/)
await page.waitForTimeout(300)
await foto(page, '08-interview-wiederholung')
await page.getByRole('button', { name: 'Einstellungen' }).click()
await page.waitForTimeout(300)
await foto(page, '09-einstellungen', true)

// Dunkel
const dunkel = await seite({ colorScheme: 'dark' })
await dunkel.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
await schritt(dunkel, /Auswertung/)
await dunkel.waitForTimeout(400)
await foto(dunkel, '10-dunkel-auswertung', true)
await schritt(dunkel, /Interview/)
await dunkel.waitForTimeout(300)
await foto(dunkel, '11-dunkel-interview')

// Handy
const handy = await seite({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await handy.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
await schritt(handy, /Interview/)
await handy.waitForTimeout(300)
await foto(handy, '12-handy-interview', true)

await browser.close()
console.log(meldungen.length ? meldungen.join('\n') : 'Keine Konsolenfehler.')
