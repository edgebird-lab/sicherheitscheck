import type { Page } from '@playwright/test'
import { expect, neuerBetrieb, pruefeBarrierefreiheit, schritt, test, zurStartseite } from './hilfen.ts'

const SCHRITTE = ['Betrieb', 'Vorgespräch', 'Interview', 'Außenprüfung', 'Auswertung', 'Maßnahmen', 'Bericht']

async function alleSchritte(page: Page, wo: string) {
  for (const s of SCHRITTE) {
    await schritt(page, new RegExp(`^(${s})`))
    await expect(page.getByRole('heading', { name: s, level: 1 })).toBeVisible()
    await pruefeBarrierefreiheit(page, `${wo}, ${s}`)
  }
}

for (const schema of ['light', 'dark'] as const) {
  const name = schema === 'light' ? 'hell' : 'dunkel'
  test(`E-13: alle Seiten und Schritte ohne schwere Barrieren (${name})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema })
    await page.goto('/')
    await pruefeBarrierefreiheit(page, 'Startseite leer')

    // Abgeschlossene Prüfung (schreibgeschützt)
    await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
    await alleSchritte(page, 'abgeschlossen')

    // Wiederholungsprüfung: Kasten „Letztes Mal“, übernommene Antworten, Fehlerliste im Abschluss
    await schritt(page, /^Betrieb/)
    await page.getByRole('button', { name: 'Wiederholungsprüfung' }).click()
    await alleSchritte(page, 'Wiederholung')

    // Neuer Betrieb ohne Prüfung, neue Prüfung mit offenen Feldern
    await zurStartseite(page)
    await neuerBetrieb(page, 'Bäckerei Probe')
    await schritt(page, /^Interview/)
    await pruefeBarrierefreiheit(page, 'ohne Prüfung')
    await schritt(page, /^Betrieb/)
    await page.getByRole('button', { name: 'Neue Prüfung' }).click()
    await alleSchritte(page, 'neue Prüfung')

    await zurStartseite(page)
    await pruefeBarrierefreiheit(page, 'Startseite mit Liste')
    await page.getByRole('button', { name: 'Sicherung exportieren' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Sicherung exportieren' })).toBeVisible()
    await pruefeBarrierefreiheit(page, 'Exportdialog')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'Einstellungen' }).click()
    await pruefeBarrierefreiheit(page, 'Einstellungen')
  })
}

test('Darstellung „Dunkel“ aus den Einstellungen besteht axe', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.getByRole('group', { name: 'Farbschema' }).getByRole('radio', { name: 'Dunkel' }).check()
  await pruefeBarrierefreiheit(page, 'Einstellungen dunkel')
  await page.getByRole('button', { name: 'Sicherheitscheck' }).click()
  await page.getByRole('button', { name: 'Tischlerei Beispiel GmbH (fiktiv)' }).click()
  await schritt(page, /^Auswertung/)
  await pruefeBarrierefreiheit(page, 'Auswertung dunkel')
})

test('jedes Eingabefeld hat eine Beschriftung', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: '+ Ansprechpartner' }).click()
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await page.getByRole('button', { name: '+ Person' }).click()
  const ohne = async () =>
    page.locator('input:not([type="hidden"]):not([hidden]), select, textarea').evaluateAll((els) =>
      els
        .filter((e) => !(e as HTMLInputElement).labels?.length && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby'))
        .map((e) => e.outerHTML.slice(0, 100)),
    )
  for (const s of ['Betrieb', 'Vorgespräch', 'Interview']) {
    await schritt(page, new RegExp(`^${s}`))
    expect(await ohne(), s).toEqual([])
  }
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  expect(await ohne(), 'Einstellungen').toEqual([])
})

test('Tastatur: Fokus nach Seitenwechsel auf der Überschrift, Sprungmarke führt zum Inhalt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await expect(page.getByRole('heading', { name: 'Betrieb', level: 1 })).toBeFocused()
  await schritt(page, /^Auswertung/)
  await expect(page.getByRole('heading', { name: 'Auswertung', level: 1 })).toBeFocused()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Neuer Betrieb' })).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Zum Inhalt springen' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#inhalt$/)
})
