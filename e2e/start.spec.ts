import { expect, gespeichert, neuerBetrieb, test, zurStartseite } from './hilfen.ts'

test('E-01: ein angelegter Betrieb ist nach dem Neuladen noch da', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByLabel('Branche').fill('Lebensmittelhandwerk')
  await gespeichert(page)
  await page.reload()
  await page.getByRole('button', { name: 'Bäckerei Probe' }).click()
  await expect(page.getByLabel('Branche')).toHaveValue('Lebensmittelhandwerk')
})

test('E-02: neuer Betrieb erscheint in der Liste, der Sicherungshinweis ist sichtbar', async ({ page }) => {
  await page.goto('/')
  // Leerer Zustand: Zweck der App und zwei Knöpfe
  await expect(page.getByText('Alle Daten bleiben in diesem Browser auf diesem Rechner.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Beispielbetrieb laden' })).toBeVisible()
  await neuerBetrieb(page, 'Bäckerei Probe')
  await zurStartseite(page)
  const liste = page.getByRole('table', { name: 'Betriebe' })
  await expect(liste.getByRole('button', { name: 'Bäckerei Probe' })).toBeVisible()
  await expect(liste.getByRole('row')).toHaveCount(2)
  await expect(page.getByText('Noch keine Sicherung exportiert.')).toBeVisible()
})

test('Beispielbetrieb laden zeigt 18 von 37 Punkten in der Liste', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await zurStartseite(page)
  const zeile = page.getByRole('row', { name: /Tischlerei Beispiel/ })
  await expect(zeile).toContainText('18 von 37 Punkten')
  // Suche
  await page.getByLabel('Betriebe durchsuchen').fill('bäckerei')
  await expect(page.getByText('Kein Betrieb passt zu „bäckerei“.')).toBeVisible()
  await page.getByLabel('Betriebe durchsuchen').fill('tisch')
  await expect(zeile).toBeVisible()
})

test('E-12: ein zweiter Tab zeigt „Bereits in einem anderen Tab geöffnet“', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Neuer Betrieb' })).toBeVisible()
  const zweite = await context.newPage()
  await zweite.goto('/')
  await expect(zweite.getByRole('heading', { name: 'Bereits in einem anderen Tab geöffnet' })).toBeVisible()
  // Nach dem Schließen des ersten Tabs geht es im zweiten weiter (der Browser gibt die Sperre kurz danach frei)
  await page.close()
  await expect(async () => {
    await zweite.getByRole('button', { name: 'Erneut versuchen' }).click()
    await expect(zweite.getByRole('button', { name: 'Neuer Betrieb' })).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
})

test('Einstellungen: Darstellung dunkel und Berater bleiben gespeichert', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Robin Olbricht')
  await page.getByRole('group', { name: 'Farbschema' }).getByRole('radio', { name: 'Dunkel' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await gespeichert(page)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Robin Olbricht')
})

test('Alle Daten löschen erst nach Eingabe von „LÖSCHEN“', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  const knopf = page.getByRole('button', { name: 'Alle Daten löschen' })
  await expect(knopf).toBeDisabled()
  await page.getByLabel('Zur Bestätigung „LÖSCHEN“ eingeben').fill('LÖSCHEN')
  await knopf.click()
  await zurStartseite(page)
  await expect(page.getByRole('button', { name: 'Beispielbetrieb laden' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Alle Daten bleiben in diesem Browser auf diesem Rechner.')).toBeVisible()
})
