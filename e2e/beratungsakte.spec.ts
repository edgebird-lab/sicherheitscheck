import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { expect, neuerBetrieb, pruefeBarrierefreiheit, schritt, test } from './hilfen.ts'

// Export „Für die Beratungsakte speichern“ im Schritt Bericht (Format Beratungsakte v1)

function heute(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function beispielBericht(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).first().click()
  await schritt(page, /^Bericht/)
}

test('Dialog: Vorbelegung, Pflichtfeld, Abbrechen, Escape und Fokus; Speichern lädt die Akte herunter', async ({ page }) => {
  await beispielBericht(page)
  const bericht = page.getByRole('article', { name: 'Bericht' })
  // Was der Bericht zeigt: Handlungsempfehlungen (nicht erfüllte Anforderungen), Befunde der Außenprüfung mit Handlungsbedarf, Maßnahmenplan
  const empfehlungen = await bericht.locator('.bericht-empfehlungen > li').count()
  const aussenBefunde = await bericht.locator('li.bericht-befund').filter({ has: page.locator('.stufe-kritisch, .stufe-warnung, .stufe-hinweis, .stufe-fehler') }).count()
  const massnahmen = await bericht.getByRole('table', { name: 'Maßnahmenplan' }).locator('tbody tr').count()
  expect([empfehlungen, aussenBefunde, massnahmen]).toEqual([9, 4, 13])

  const knopf = page.getByRole('button', { name: 'Für die Beratungsakte speichern' })
  const dialog = page.getByRole('dialog', { name: 'Für die Beratungsakte speichern' })
  const mandant = dialog.getByRole('textbox', { name: 'Mandant', exact: true })

  // Escape schließt, Fokus zurück auf den Knopf
  await knopf.click()
  await expect(dialog).toBeVisible()
  await expect(mandant).toBeFocused()
  await expect(mandant).toHaveValue('Tischlerei Beispiel GmbH (fiktiv)')
  await expect(dialog).toContainText('Enthält: 19 Kennzahlen, 13 Befunde, 13 Maßnahmen')
  await expect(dialog).toContainText('Die Datei ist unverschlüsselt und enthält Daten des Mandanten.')
  await expect(dialog).toContainText(`Datei: Tischlerei-Beispiel-GmbH-(fiktiv)-sicherheitscheck-${heute()}.beratungsakte.json`)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(knopf).toBeFocused()

  // Abbrechen ebenso
  await knopf.click()
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(dialog).toBeHidden()
  await expect(knopf).toBeFocused()

  // Pflichtfeld: ohne Mandant kein Download, Meldung am Feld
  await knopf.click()
  await mandant.fill('  ')
  let heruntergeladen = false
  page.on('download', () => (heruntergeladen = true))
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Bitte den Mandanten angeben.')
  await expect(mandant).toHaveAttribute('aria-invalid', 'true')
  await expect(mandant).toBeFocused()
  expect(heruntergeladen).toBe(false)

  // Mandant mit Umlauten und Nummer: der Dateiname folgt sofort
  await mandant.fill('Bäckerei Groß & Söhne GbR')
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await dialog.getByRole('textbox', { name: 'Mandantennummer (optional)' }).fill('K-0815')
  const dateiname = `Bäckerei-Groß-&-Söhne-GbR-sicherheitscheck-${heute()}.beratungsakte.json`
  await expect(dialog).toContainText(dateiname)
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Speichern' }).click()])
  await expect(dialog).toBeHidden()
  await expect(knopf).toBeFocused()
  await expect(page.getByRole('status')).toHaveText(`Gespeichert als „${dateiname}“.`)
  expect(download.suggestedFilename()).toBe(dateiname)

  const text = await readFile((await download.path())!, 'utf8')
  expect(text.charCodeAt(0)).not.toBe(0xfeff)
  const akte = JSON.parse(text)
  expect(akte.format).toBe('beratungsakte')
  expect(akte.formatVersion).toBe('1.0')
  expect(akte.erzeugtVon).toMatchObject({ app: 'sicherheitscheck', name: 'Sicherheitscheck' })
  expect(akte.mandant).toEqual({ name: 'Bäckerei Groß & Söhne GbR', kennung: 'K-0815' })
  expect(akte.analyse).toMatchObject({ art: 'sicherheitscheck', titel: 'Sicherheitscheck Tischlerei Beispiel GmbH (fiktiv), Prüfung 1' })
  expect(akte.kennzahlen.slice(0, 3).map((k: { wert: number }) => k.wert)).toEqual([18, 37, 49])
  expect(akte.befunde).toHaveLength(empfehlungen + aussenBefunde)
  expect(akte.massnahmen).toHaveLength(massnahmen)
  expect(akte.massnahmen.every((m: { befunde: string[] }) => m.befunde.length === 1)).toBe(true)
})

test('Entwurf ohne Antworten: Akte ohne Befunde und Maßnahmen, Titel mit „Entwurf“', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await schritt(page, /^Bericht/)
  await page.getByRole('button', { name: 'Für die Beratungsakte speichern' }).click()
  const dialog = page.getByRole('dialog', { name: 'Für die Beratungsakte speichern' })
  await expect(dialog.getByRole('textbox', { name: 'Mandant', exact: true })).toHaveValue('Bäckerei Probe')
  await expect(dialog).toContainText('Enthält: 15 Kennzahlen, 0 Befunde, 0 Maßnahmen')
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Speichern' }).click()])
  expect(download.suggestedFilename()).toBe(`Bäckerei-Probe-sicherheitscheck-${heute()}.beratungsakte.json`)
  const akte = JSON.parse(await readFile((await download.path())!, 'utf8'))
  expect(akte.analyse).toMatchObject({ titel: 'Sicherheitscheck Bäckerei Probe, Prüfung 1 (Entwurf)' })
  expect(akte.erweiterungen.sicherheitscheck.status).toBe('entwurf')
})

for (const schema of ['light', 'dark'] as const) {
  const art = schema === 'light' ? 'hell' : 'dunkel'
  test(`Knopf und Dialog ohne schwere Barrieren (${art})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: schema })
    await beispielBericht(page)
    const knopf = page.getByRole('button', { name: 'Für die Beratungsakte speichern' })
    await expect(knopf).toBeVisible()
    await pruefeBarrierefreiheit(page, `Bericht mit Knopf (${art})`)
    // Bildschirmfotos nur auf Wunsch: BERATUNGSAKTE_BILDER=<Ordner>
    const bilder = process.env.BERATUNGSAKTE_BILDER
    if (bilder) {
      const karte = page.getByRole('group', { name: 'Weitergeben' })
      await karte.scrollIntoViewIfNeeded()
      const druck = (await page.getByRole('group', { name: 'Drucken' }).boundingBox())!
      const box = (await karte.boundingBox())!
      await page.screenshot({ path: join(bilder, `sicherheitscheck-knopf-${art}.png`), clip: { x: Math.max(0, box.x - 16), y: Math.max(0, druck.y - 16), width: box.width + 32, height: box.y + box.height - druck.y + 32 } })
    }
    await knopf.click()
    const dialog = page.getByRole('dialog', { name: 'Für die Beratungsakte speichern' })
    await expect(dialog).toBeVisible()
    await pruefeBarrierefreiheit(page, `Dialog (${art})`)
    if (bilder) await page.screenshot({ path: join(bilder, `sicherheitscheck-dialog-${art}.png`) })
    // auch mit Meldung am Feld
    await dialog.getByRole('textbox', { name: 'Mandant', exact: true }).fill('')
    await dialog.getByRole('button', { name: 'Speichern' }).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await pruefeBarrierefreiheit(page, `Dialog mit Meldung (${art})`)
    if (bilder) await dialog.screenshot({ path: join(bilder, `sicherheitscheck-dialog-meldung-${art}.png`) })
  })
}
