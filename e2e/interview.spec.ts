import type { Page } from '@playwright/test'
import { expect, neuerBetrieb, schritt, test } from './hilfen.ts'

/** Beantwortet die Fragekarte per Tastatur: Optionsfeld wählen, Begründung tippen, Strg+Eingabe. */
async function beantworte(page: Page, erfuellt: boolean) {
  await page.keyboard.press(erfuellt ? 'Space' : 'ArrowRight')
  await page.keyboard.press('Tab')
  await page.keyboard.type('per Tastatur geprüft')
  await page.keyboard.press('Control+Enter')
}

test('E-04: Interview vollständig per Tastatur, danach zeigt die Auswertung den erwarteten Statuswert', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  for (const frage of ['Arbeiten Beschäftigte im Homeoffice', 'Greift jemand von außen', 'Werden Smartphones oder Tablets']) {
    await page.getByRole('group', { name: new RegExp(frage) }).getByRole('radio', { name: 'Ja' }).check()
  }
  await page.getByRole('group', { name: 'Betreibt der Betrieb ein eigenes WLAN?' }).getByRole('radio', { name: 'Nein' }).check()
  await page.getByRole('button', { name: 'Weiter zum Interview' }).click()

  // Erste Karte: Fokus auf die Bewertung, danach nur Tastatur
  await page.getByRole('radio', { name: 'Erfüllt', exact: true }).focus()
  // 26 Anforderungen (6.2 WLAN entfällt); nicht erfüllt: 1.2 (TOP) und 2.4 (Basis)
  const titel = page.locator('#frage-titel')
  for (let i = 0; i < 26; i++) {
    const t = (await titel.textContent()) ?? ''
    const nichtErfuellt = t.startsWith('Beschäftigte erkennen Phishing') || t.startsWith('Rechte nur so weit wie nötig')
    await beantworte(page, !nichtErfuellt)
    if (i < 25) {
      // neue Karte: Fokus auf der Überschrift; Tab zu „Darum geht es“, Tab zur Bewertung
      await expect(titel).toBeFocused()
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await expect(page.getByRole('radio', { name: 'Erfüllt', exact: true })).toBeFocused()
    }
  }

  // Nach der letzten Karte geht es zur Auswertung: 36 − 6 (TOP nicht erfüllt) − 1 = 29 von 36; 29 / 36 = 80,6 % → 81 %
  await expect(page.getByRole('heading', { name: 'Auswertung', level: 1 })).toBeVisible()
  await expect(page.getByTestId('statuswert')).toHaveText('29 von 36 Punkten · 81 %')
  await expect(page.getByText('Rohpunkte +29')).toBeVisible()
  const top = page.locator('.karte', { has: page.getByRole('heading', { name: 'Nicht erfüllte TOP-Anforderungen' }) })
  await expect(top).toContainText('1.2 Beschäftigte erkennen Phishing und Betrugsversuche')
  const nichtRelevant = page.locator('.karte', { has: page.getByRole('heading', { name: 'Nicht relevante Anforderungen' }) })
  await expect(nichtRelevant).toContainText('6.2 WLAN ist verschlüsselt, Gäste sind getrennt')
  await expect(nichtRelevant).toContainText('Vorfrage „Betreibt der Betrieb ein eigenes WLAN?“: Nein')
  // Tabelle neben dem Netzdiagramm: Organisation 10 von 10 möglich, 1.2 kostet 6 → 4 von 10
  await expect(page.getByRole('row', { name: /1 Organisation & Sensibilisierung/ })).toContainText('40 %')

  await schritt(page, /Interview/)
  const themen = page.getByRole('navigation', { name: 'Themenbereiche' })
  for (const name of ['1 Organisation', '2 Identitäts', '3 Datensicherung', '4 Patch', '5 Schutz', '6 IT-Systeme']) {
    await expect(themen.getByRole('button', { name: new RegExp(`^${name}.*vollständig`) })).toBeVisible()
  }
  await expect(page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: /Interview \(vollständig\)/ })).toBeVisible()
})

test('Interview: Pflichtbegründung, „Nächste offene“ und „nicht relevant“ nur wo erlaubt', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await schritt(page, /Interview/)
  await expect(page.getByText('TOP · zählt ±3 Punkte')).toBeVisible()
  await expect(page.getByText('Zuerst die Leitfragen stellen: DIN SPEC 27076, Anforderung 1.1')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Nicht relevant' })).toHaveCount(0)
  await page.getByRole('radio', { name: 'Erfüllt', exact: true }).check()
  await expect(page.getByText('Bitte kurz begründen (mindestens drei Zeichen).')).toBeVisible()
  await page.getByLabel('Begründung in Stichpunkten (Pflicht)').fill('GF kümmert sich')
  await expect(page.getByText('Bitte kurz begründen (mindestens drei Zeichen).')).toHaveCount(0)
  await page.getByRole('button', { name: 'Nächste offene' }).click()
  await expect(page.locator('#frage-titel')).toHaveText('Beschäftigte erkennen Phishing und Betrugsversuche')

  // 2.5 erlaubt „nicht relevant“ mit Begründung
  await page.getByRole('button', { name: /2 Identitäts/ }).click()
  await page.getByRole('navigation', { name: 'Themenbereiche' }).getByRole('button', { name: /2\.5 Zugänge/ }).click()
  await page.getByRole('radio', { name: 'Nicht relevant' }).check()
  await expect(page.getByLabel('Begründung, warum nicht relevant (Pflicht)')).toBeVisible()

  // „Darum geht es“ klappt auf
  await page.getByText('Darum geht es').click()
  await expect(page.getByText('Nicht relevant kann die Anforderung nur sein')).toBeVisible()
})
