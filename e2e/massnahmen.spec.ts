import { expect, gespeichert, pruefeBarrierefreiheit, schritt, test, zurStartseite } from './hilfen.ts'

const BEISPIEL = 'Tischlerei Beispiel GmbH (fiktiv)'

test('E-08: Maßnahme auf „erledigt“ setzen, neu laden: ein offene Maßnahme weniger, Status bleibt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await schritt(page, /^Maßnahmen/)
  const zaehler = page.getByTestId('massnahmen-zaehler')
  await expect(zaehler).toContainText('12 offen oder in Arbeit · 1 erledigt · 13 insgesamt')
  await expect(zaehler).toContainText('2 überfällig')
  await expect(page.locator('#inhalt').getByRole('heading', { level: 2 })).toHaveText(['Sofort (Priorität 1)', 'Zeitnah (Priorität 2)', 'Geplant (Priorität 3)'])

  const notfall = page.getByRole('group', { name: 'Notfallplan für IT-Ausfälle und Angriffe' })
  await expect(notfall.getByText(/^Anforderung 1\.4 · Organisation & Sensibilisierung · Frist/)).toBeVisible()
  await expect(notfall.getByText(/Was ist zu tun\?/)).toBeVisible()
  await notfall.getByLabel('Status').selectOption('erledigt')
  await expect(zaehler).toContainText('11 offen oder in Arbeit · 2 erledigt')
  // bleibt bis zum nächsten Filterwechsel sichtbar
  await expect(notfall.getByText(/erledigt am/)).toBeVisible()

  await gespeichert(page)
  await page.reload()
  const zeile = page.getByRole('row', { name: new RegExp(BEISPIEL.replace(/[()]/g, '.')) })
  await expect(zeile.getByRole('cell').nth(2)).toHaveText('11')
  await zeile.getByRole('button', { name: BEISPIEL }).click()
  await schritt(page, /^Maßnahmen/)
  await expect(page.getByTestId('massnahmen-zaehler')).toContainText('11 offen oder in Arbeit')
  await expect(page.getByRole('group', { name: 'Notfallplan für IT-Ausfälle und Angriffe' })).toHaveCount(0)
  await page.getByRole('radio', { name: 'Alle', exact: true }).check()
  await expect(page.getByRole('group', { name: 'Notfallplan für IT-Ausfälle und Angriffe' }).getByLabel('Status')).toHaveValue('erledigt')
})

test('Priorität von Hand nur mit Begründung; Verantwortlicher bleibt gespeichert', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await schritt(page, /^Maßnahmen/)
  const caa = page.getByRole('group', { name: 'Keine CAA-Einträge (example.com)' })
  await expect(caa.getByText(/Außenprüfung: CAA · example\.com/)).toBeVisible()
  await caa.getByLabel('Verantwortlich').fill('IT-Service Muster')
  await caa.getByText('Priorität ändern').click()
  await caa.getByLabel('Priorität', { exact: true }).selectOption('1')
  const uebernehmen = caa.getByRole('button', { name: 'Priorität übernehmen' })
  await expect(uebernehmen).toBeDisabled()
  await caa.getByLabel('Begründung (Pflicht)').fill('Webshop startet im Dezember')
  await uebernehmen.click()

  const sofort = page.getByRole('region', { name: 'Sofort (Priorität 1)' })
  const verschoben = sofort.getByRole('group', { name: 'Keine CAA-Einträge (example.com)' })
  await expect(verschoben.getByText('Priorität von Hand: 1 statt 3. Begründung: Webshop startet im Dezember')).toBeVisible()
  await expect(verschoben.getByLabel('Verantwortlich')).toHaveValue('IT-Service Muster')
  await pruefeBarrierefreiheit(page, 'Maßnahmen nach Änderung der Priorität')

  await gespeichert(page)
  await page.reload()
  await page.getByRole('button', { name: BEISPIEL }).click()
  await schritt(page, /^Maßnahmen/)
  await expect(page.getByRole('region', { name: 'Sofort (Priorität 1)' }).getByRole('group', { name: 'Keine CAA-Einträge (example.com)' })).toBeVisible()
  await zurStartseite(page)
})
