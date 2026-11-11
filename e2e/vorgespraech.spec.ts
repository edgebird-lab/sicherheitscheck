import { expect, neuerBetrieb, schritt, test } from './hilfen.ts'

test('E-03: ohne Datum ist „Weiter“ gesperrt; Vorfrage „Nein“ blendet die abhängige Anforderung aus', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await expect(page.getByRole('heading', { name: 'Vorgespräch', level: 1 })).toBeVisible()

  const datum = page.getByLabel('Datum des Interviews (Pflicht)')
  const weiter = page.getByRole('button', { name: 'Weiter zum Interview' })
  await expect(weiter).toBeEnabled()
  await datum.fill('')
  await expect(weiter).toBeDisabled()
  await expect(page.getByText('Erst das Datum des Interviews eintragen.')).toBeVisible()
  await datum.fill('2026-11-11')
  await expect(weiter).toBeEnabled()

  // Warnung, solange niemand aus der Geschäftsführung eingetragen ist
  const warnung = page.getByText('Noch niemand aus der Geschäftsführung eingetragen.', { exact: false })
  await expect(warnung).toBeVisible()
  await page.getByRole('button', { name: '+ Person' }).click()
  await page.getByLabel('Name von Person 1').fill('Erika Beispiel')
  await expect(page.getByLabel('Rolle von Person 1')).toHaveValue('geschaeftsfuehrung')
  await expect(warnung).toHaveCount(0)

  await page.getByRole('group', { name: 'Betreibt der Betrieb ein eigenes WLAN?' }).getByRole('radio', { name: 'Nein' }).check()
  await expect(page.getByText('Entfällt im Interview: Anforderung 6.2')).toBeVisible()

  await weiter.click()
  await page.getByRole('button', { name: /6 IT-Systeme und Netzwerke/ }).click()
  const liste = page.getByRole('navigation', { name: 'Themenbereiche' })
  await expect(liste.getByRole('button', { name: /6\.1 Firewall/ })).toBeVisible()
  await expect(liste.getByRole('button', { name: /WLAN/ })).toHaveCount(0)
  await expect(page.getByText('von 26')).toBeVisible()

  // Zurück auf „Ja“: Die Anforderung erscheint wieder und ist offen
  await schritt(page, /Vorgespräch/)
  await page.getByRole('group', { name: 'Betreibt der Betrieb ein eigenes WLAN?' }).getByRole('radio', { name: 'Ja' }).check()
  await schritt(page, /Interview/)
  await page.getByRole('button', { name: /6 IT-Systeme und Netzwerke/ }).click()
  await expect(liste.getByRole('button', { name: /6\.2 WLAN.*offen/ })).toBeVisible()
})
