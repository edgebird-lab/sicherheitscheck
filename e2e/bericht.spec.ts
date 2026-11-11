import { expect, pruefeBarrierefreiheit, schritt, test } from './hilfen.ts'

test('E-10: Bericht als Druckansicht und PDF mit den Pflichtteilen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await schritt(page, /^Bericht/)
  const bericht = page.getByRole('article', { name: 'Bericht' })
  await expect(bericht.getByRole('heading', { name: 'Bericht zur IT-Sicherheitsberatung nach DIN SPEC 27076' })).toBeVisible()
  await pruefeBarrierefreiheit(page, 'Bericht hell')

  await page.emulateMedia({ media: 'print' })
  // nur der Bericht: Kopf, Schrittleiste, Abschluss und Knöpfe sind im Druck ausgeblendet
  await expect(page.getByRole('navigation', { name: 'Schritte' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Drucken / als PDF' })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Abschluss' })).toBeHidden()

  await expect(bericht.getByText('Statuswert:')).toBeVisible()
  await expect(bericht.getByText('18 von 37 Punkten', { exact: true })).toBeVisible()
  await expect(bericht.getByRole('heading', { name: 'Teil A – Ergebnis nach DIN SPEC 27076' })).toBeVisible()
  await expect(bericht.getByRole('heading', { name: 'Teil B – Prüfung von außen (Zusatz, nicht Teil der DIN SPEC 27076)' })).toBeVisible()
  await expect(bericht.getByRole('heading', { name: 'Teil C – Maßnahmenplan' })).toBeVisible()
  const nichtBewertet = bericht.getByRole('heading', { name: 'Nicht bewertete Anforderungen' })
  await expect(nichtBewertet).toBeVisible()
  await expect(nichtBewertet.locator('xpath=following-sibling::*[1]')).toHaveText('keine')
  await expect(bericht.getByRole('group', { name: /^Unterschrift/ })).toHaveCount(2)
  await expect(bericht.getByText('Der Check ist keine Zertifizierung.')).toBeVisible()
  await expect(bericht.getByRole('heading', { name: 'Bezug zum IT-Grundschutz (ISMS-Brücke)' })).toBeVisible()
  await expect(bericht.getByRole('heading', { name: 'Methodik und Grenzen' })).toBeVisible()
  // Kopfzeile jeder Seite über @page
  const druckstil = await page.locator('style[data-bericht="druck"]').evaluate((e) => e.textContent)
  expect(druckstil).toMatch(/@top-left \{ content: "Vertraulich · Tischlerei Beispiel GmbH \(fiktiv\) · \d\d\.\d\d\.\d{4}"; \}/)
  expect(druckstil).toContain('counter(page)')

  const pdf = await page.pdf({ format: 'A4' })
  expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  const seiten = pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []
  expect(seiten.length).toBeGreaterThanOrEqual(3)
})

test('Bericht eines Entwurfs ohne Außenprüfung: Vermerk „Entwurf“, Teil B entfällt, dunkel ohne schwere Barrieren', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Neuer Betrieb' }).click()
  await page.getByLabel('Name des Betriebs').fill('Bäckerei Probe')
  await page.getByRole('button', { name: 'Anlegen' }).click()
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await schritt(page, /^Bericht/)
  const bericht = page.getByRole('article', { name: 'Bericht' })
  await expect(bericht.getByText('Entwurf: Die Prüfung ist noch nicht abgeschlossen')).toBeVisible()
  await expect(bericht.getByText('Entfällt: Für diese Prüfung gibt es keine Außenprüfung.')).toBeVisible()
  await page.getByLabel('Förderhinweise für den Bericht (Anhang)').fill('Digitalbonus des Landes prüfen')
  await expect(bericht.getByText('Digitalbonus des Landes prüfen')).toBeVisible()
  await pruefeBarrierefreiheit(page, 'Bericht Entwurf dunkel')
})
