// Erzeugt die Bilder der README in docs/bilder (Beispielbetrieb, hell, 1440 × 900) und den
// Beispielbericht als PDF (A4, wie „Drucken / als PDF“ ohne Hintergrundgrafiken).
// Aufruf: npm run build && npx vite preview  (Port 4181)  und dann  node scripts/readme-bilder.mjs
// Nutzt das installierte Edge; fremde Anfragen werden abgebrochen. Die Außenprüfung des
// Beispielbetriebs ist fiktiv und schon gespeichert; es wird nichts abgefragt.
import { chromium } from '@playwright/test'

const ziel = 'docs/bilder'
const adresse = process.env.ADRESSE ?? 'http://localhost:4181/'
const browser = await chromium.launch({ channel: process.env.CI ? 'chrome' : 'msedge' })
const kontext = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', colorScheme: 'light', deviceScaleFactor: 1 })
await kontext.route((url) => !url.href.startsWith(adresse), (route) => route.abort())
const page = await kontext.newPage()
const schritt = (name) => page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name }).click()
// Meldung im Kopf und Fokusrahmen nicht mit aufnehmen
const ruhig = async () => {
  await page.evaluate(() => {
    document.querySelector('.meldung')?.replaceChildren()
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.mouse.move(1430, 890)
  await page.waitForTimeout(300)
}

await page.goto(adresse)
await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()

await schritt(/^Auswertung/)
await ruhig()
await page.screenshot({ path: `${ziel}/auswertung.png`, fullPage: false })

await schritt(/^Außenprüfung/)
await ruhig()
await page.screenshot({ path: `${ziel}/aussenpruefung.png`, fullPage: false })

await schritt(/^Maßnahmen/)
await ruhig()
await page.screenshot({ path: `${ziel}/massnahmen.png`, fullPage: false })

await schritt(/^Bericht/)
await page.locator('.bericht-vorschau').evaluate((e) => window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 16))
await ruhig()
await page.screenshot({ path: `${ziel}/bericht.png`, fullPage: false })
await page.emulateMedia({ media: 'print' })
await page.pdf({ path: `${ziel}/beispielbericht.pdf`, format: 'A4' })
await page.emulateMedia({ media: 'screen' })

await schritt(/^Betrieb/)
await page.getByRole('button', { name: 'Wiederholungsprüfung' }).click()
await schritt(/^Interview/)
await page.getByRole('navigation', { name: 'Themenbereiche' }).getByRole('button', { name: /3 Datensicherung/ }).click()
await ruhig()
await page.screenshot({ path: `${ziel}/interview.png`, fullPage: false })

await browser.close()
console.log('Bilder und Beispielbericht in', ziel)
