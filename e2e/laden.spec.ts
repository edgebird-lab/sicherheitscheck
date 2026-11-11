import type { Page } from '@playwright/test'
import { expect, gespeichert, neuerBetrieb, schritt, test } from './hilfen.ts'

/** Schreibt Rohdaten direkt in die IndexedDB der App (Datenbank „sicherheitscheck“, Version 1). */
async function schreibeRoh(page: Page, betriebe: unknown[], meta: Record<string, unknown> = {}) {
  await page.evaluate(
    ({ betriebe, meta }) =>
      new Promise<void>((fertig, fehler) => {
        const anfrage = indexedDB.open('sicherheitscheck', 1)
        anfrage.onerror = () => fehler(anfrage.error)
        anfrage.onsuccess = () => {
          const db = anfrage.result
          const tx = db.transaction(['betriebe', 'meta'], 'readwrite')
          for (const b of betriebe) tx.objectStore('betriebe').put(b)
          for (const [schluessel, wert] of Object.entries(meta)) tx.objectStore('meta').put(wert, schluessel)
          tx.oncomplete = () => {
            db.close()
            fertig()
          }
          tx.onerror = () => fehler(tx.error)
        }
      }),
    { betriebe, meta },
  )
}

/** Liest alle gespeicherten Betriebe und die Formatversion. */
async function leseRoh(page: Page): Promise<{ betriebe: { id: string; name: string }[]; formatVersion: unknown }> {
  return page.evaluate(
    () =>
      new Promise((fertig, fehler) => {
        const anfrage = indexedDB.open('sicherheitscheck', 1)
        anfrage.onerror = () => fehler(anfrage.error)
        anfrage.onsuccess = () => {
          const db = anfrage.result
          const tx = db.transaction(['betriebe', 'meta'], 'readonly')
          const alle = tx.objectStore('betriebe').getAll()
          const version = tx.objectStore('meta').get('formatVersion')
          tx.oncomplete = () => {
            db.close()
            fertig({ betriebe: alle.result, formatVersion: version.result })
          }
        }
      }),
  )
}

test('Beschädigte Einträge beim Laden: Hinweis, die übrigen Betriebe bleiben nutzbar, nichts wird gelöscht', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await gespeichert(page)
  const [beispiel] = (await leseRoh(page)).betriebe as Record<string, unknown>[]
  // Ein Betrieb ohne Pflichtangaben und eine Kopie des Beispiels mit einem Befund, dessen Regel diese Version nicht kennt
  const fremd = JSON.parse(JSON.stringify(beispiel)) as { id: string; name: string; pruefungen: { aussen: { befunde: { regel: string }[] } }[] }
  fremd.id = 'b-regel'
  fremd.name = 'Kopie mit fremder Regel'
  fremd.pruefungen[0].aussen.befunde[0].regel = 'WEB-01'
  await schreibeRoh(page, [{ id: 'b-kaputt', name: '' }, fremd])

  await page.reload()
  const hinweis = page.getByRole('alert').filter({ hasText: 'ließen sich nicht laden' })
  await expect(hinweis).toContainText('2 Einträge ließen sich nicht laden und werden übersprungen. Die Daten bleiben gespeichert und werden nicht gelöscht.')
  await expect(hinweis.getByRole('listitem')).toHaveText(['Betrieb 2: Name fehlt.', 'Betrieb 3, Prüfung 1: Befund mit unbekannter Regel „WEB-01“ (Daten einer neueren Version?).'])

  // Der gültige Betrieb lässt sich öffnen, auch Außenprüfung und Bericht
  await expect(page.getByRole('table', { name: 'Betriebe' }).getByRole('row')).toHaveCount(2)
  await page.getByRole('button', { name: 'Tischlerei Beispiel GmbH (fiktiv)' }).click()
  await schritt(page, /^Außenprüfung/)
  await expect(page.getByRole('region', { name: 'E-Mail' }).getByRole('heading', { level: 3 })).toHaveCount(6)
  await schritt(page, /^Bericht/)
  await expect(page.getByRole('heading', { name: 'Teil C – Maßnahmenplan' })).toBeVisible()

  // Eine Änderung am gültigen Betrieb lässt die übersprungenen Einträge unberührt
  await schritt(page, /^Betrieb/)
  await page.getByLabel('Branche').fill('Tischlerei')
  await gespeichert(page)
  const roh = await leseRoh(page)
  expect(roh.betriebe.map((b) => b.id).sort()).toEqual([beispiel.id, 'b-kaputt', 'b-regel'].sort())
})

test('Daten einer neueren Version: Hinweis statt Absturz, die Daten bleiben unverändert', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await gespeichert(page)
  await schreibeRoh(page, [], { formatVersion: 2 })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Daten lassen sich nicht öffnen' })).toBeVisible()
  await expect(page.getByText('Die Daten stammen aus einer neueren Version.')).toBeVisible()
  const roh = await leseRoh(page)
  expect(roh.formatVersion).toBe(2)
  expect(roh.betriebe).toHaveLength(1)
})

test('Ohne IndexedDB arbeitet die App mit deutlichem Hinweis, ohne zu speichern', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Speicher gesperrt', 'SecurityError')
      },
    })
  })
  await page.goto('/')
  await expect(page.getByRole('alert').filter({ hasText: 'Dieser Browser erlaubt kein Speichern' })).toBeVisible()
  await expect(page.locator('.speicherstatus')).toHaveText('nicht gespeichert')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByRole('button', { name: 'Einstellungen' }).click()
  await expect(page.getByText('nicht verfügbar: Änderungen gehen beim Schließen verloren')).toBeVisible()
})

test('Speichern schlägt fehl: der Kopf zeigt es, der nächste Versuch holt es nach', async ({ page }) => {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await gespeichert(page)
  // IndexedDB lehnt Schreibvorgänge ab, etwa weil der Speicher voll ist
  await page.evaluate(() => {
    const w = window as unknown as { originalPut: typeof IDBObjectStore.prototype.put }
    w.originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Speicher voll', 'QuotaExceededError')
    }
  })
  await page.getByLabel('Branche').fill('Lebensmittelhandwerk')
  await expect(page.locator('.speicherstatus')).toHaveText('Speichern fehlgeschlagen')
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = (window as unknown as { originalPut: typeof IDBObjectStore.prototype.put }).originalPut
  })
  // erneuter Versuch mit wachsendem Abstand (800 ms, 1,6 s, …)
  await expect(page.locator('.speicherstatus')).toHaveText('gespeichert', { timeout: 10_000 })
  await page.reload()
  await page.getByRole('button', { name: 'Bäckerei Probe' }).click()
  await expect(page.getByLabel('Branche')).toHaveValue('Lebensmittelhandwerk')
})
