import { expect, schritt, test } from './hilfen.ts'

test('E-05: Wiederholungsprüfung mit vorbelegten Antworten; Abschluss erst nach Bestätigung aller', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await page.getByRole('button', { name: 'Wiederholungsprüfung' }).click()
  await expect(page.getByRole('heading', { name: 'Vorgespräch', level: 1 })).toBeVisible()
  await expect(page.getByText('Prüfung 2 · Entwurf')).toBeVisible()
  // Teilnehmende und Vorfragen sind übernommen
  await expect(page.getByLabel('Name von Person 1')).toHaveValue('Erika Beispiel')
  await expect(page.getByRole('group', { name: 'Betreibt der Betrieb ein eigenes WLAN?' }).getByRole('radio', { name: 'Ja' })).toBeChecked()

  await schritt(page, /Bericht/)
  await expect(page.getByText('27 übernommene Antworten sind noch nicht bestätigt.')).toBeVisible()
  const abschliessen = page.getByRole('button', { name: 'Prüfung abschließen' })
  await expect(abschliessen).toBeDisabled()

  await schritt(page, /Interview/)
  await expect(page.getByText('27 übernommene Antworten sind noch zu bestätigen')).toBeVisible()
  // Antworten sind vorbelegt, der Kasten zeigt das letzte Mal
  await expect(page.getByRole('radio', { name: 'Erfüllt', exact: true })).toBeChecked()
  await expect(page.getByLabel('Begründung in Stichpunkten (Pflicht)')).toHaveValue(/Inhaberin kümmert sich selbst/)
  await expect(page.getByText('Letztes Mal:')).toBeVisible()

  // Eine Antwort ändert sich: 1.2 ist inzwischen erfüllt
  const themen = page.getByRole('navigation', { name: 'Themenbereiche' })
  await themen.getByRole('button', { name: /1\.2 Beschäftigte/ }).click()
  await expect(page.getByRole('radio', { name: 'Nicht erfüllt' })).toBeChecked()
  await page.getByRole('radio', { name: 'Erfüllt', exact: true }).check()
  await page.getByLabel('Begründung in Stichpunkten (Pflicht)').fill('Schulung zu Phishing im Oktober, Meldestelle festgelegt')
  await expect(page.getByRole('button', { name: 'Unverändert bestätigen' })).toHaveCount(0)

  // Die übrigen 26 unverändert bestätigen
  const bestaetigen = page.getByRole('button', { name: 'Unverändert bestätigen' })
  const naechste = page.getByRole('button', { name: 'Nächste offene' })
  for (let i = 0; i < 26; i++) {
    await naechste.click()
    await bestaetigen.click()
  }
  await expect(naechste).toBeDisabled()
  await expect(page.getByText('übernommene Antworten sind noch zu bestätigen')).toHaveCount(0)

  await schritt(page, /Bericht/)
  await expect(page.getByText('Alles Nötige ist erfasst.')).toBeVisible()
  await abschliessen.click()
  await expect(page.getByText(/Abgeschlossen am/)).toBeVisible()
  // 18 + 6 (1.2 von −3 auf +3) = 24 von 37; 24 / 37 = 64,9 % → 65 %
  await expect(page.getByText('Statuswert 24 von 37 Punkten (65 %).', { exact: false })).toBeVisible()

  await schritt(page, /Auswertung/)
  await expect(page.getByTestId('statuswert')).toHaveText('24 von 37 Punkten · 65 %')
  await expect(page.getByText(/Prüfung 1 vom .*: 18 von 37 Punkten \(49 %\)\. Jetzt: 24 von 37 Punkten \(65 %\)/)).toBeVisible()
})

test('Abschluss nennt fehlende Angaben mit Sprungmarke; wieder öffnen nach Rückfrage', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await schritt(page, /Bericht/)
  await page.getByRole('button', { name: 'Wieder öffnen' }).click()
  const frage = page.getByRole('dialog', { name: 'Prüfung wieder öffnen?' })
  await expect(frage.getByRole('button', { name: 'Abbrechen' })).toBeFocused()
  await frage.getByRole('button', { name: 'Wieder öffnen' }).click()
  await expect(page.getByRole('button', { name: 'Prüfung abschließen' })).toBeEnabled()

  // Eine Begründung leeren: Fehler A4 mit Sprungmarke
  await schritt(page, /Interview/)
  await page.getByLabel('Begründung in Stichpunkten (Pflicht)').fill('')
  await schritt(page, /Bericht/)
  await expect(page.getByText('Begründung fehlt bei Anforderung 1.1.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Prüfung abschließen' })).toBeDisabled()
  await page.getByRole('button', { name: 'Zum Schritt Interview' }).click()
  await expect(page.locator('#frage-titel')).toHaveText('Geschäftsführung verantwortet die Informationssicherheit')
})
