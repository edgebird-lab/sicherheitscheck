/**
 * IndexedDB-Adapter (7.4): Datenbank `sicherheitscheck`, Version 1, Objektspeicher `betriebe`
 * (keyPath `id`) und `meta` (Schlüssel `einstellungen`, `formatVersion`).
 * Liefert die Rohdaten; geprüft wird mit pruefeDatenbestand.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { FORMAT_VERSION, type Betrieb } from '../modell/typen'
import type { Aenderungen, Schreibziel } from './aenderungen'
import { standardEinstellungen } from './pruefen'

export const DB_NAME = 'sicherheitscheck'
const DB_VERSION = 1

interface Schema extends DBSchema {
  betriebe: { key: string; value: Betrieb }
  meta: { key: string; value: unknown }
}

export interface Rohdaten {
  formatVersion: unknown
  einstellungen: unknown
  betriebe: unknown[]
}

export interface Speicher extends Schreibziel {
  ladeRoh(): Promise<Rohdaten>
  leere(): Promise<void>
  schliesse(): void
}

export async function oeffneSpeicher(): Promise<Speicher> {
  const db: IDBPDatabase<Schema> = await openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('betriebe')) d.createObjectStore('betriebe', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta')
    },
  })

  return {
    async ladeRoh() {
      const tx = db.transaction(['betriebe', 'meta'], 'readonly')
      const [betriebe, formatVersion, einstellungen] = await Promise.all([
        tx.objectStore('betriebe').getAll(),
        tx.objectStore('meta').get('formatVersion'),
        tx.objectStore('meta').get('einstellungen'),
      ])
      await tx.done
      // Neue, leere Datenbank: aktuelle Version. Fehlende Einstellungen sind kein Fehler (noch nie geändert).
      return { formatVersion: formatVersion ?? (betriebe.length === 0 ? FORMAT_VERSION : undefined), einstellungen: einstellungen ?? standardEinstellungen(), betriebe }
    },

    async schreibe(a: Aenderungen) {
      const tx = db.transaction(['betriebe', 'meta'], 'readwrite')
      const betriebe = tx.objectStore('betriebe')
      const meta = tx.objectStore('meta')
      const auftraege: Promise<unknown>[] = [meta.put(FORMAT_VERSION, 'formatVersion')]
      for (const b of a.betriebe) auftraege.push(betriebe.put(b))
      for (const id of a.geloescht) auftraege.push(betriebe.delete(id))
      if (a.einstellungen) auftraege.push(meta.put(a.einstellungen, 'einstellungen'))
      await Promise.all([...auftraege, tx.done])
    },

    async leere() {
      const tx = db.transaction(['betriebe', 'meta'], 'readwrite')
      await Promise.all([tx.objectStore('betriebe').clear(), tx.objectStore('meta').clear(), tx.done])
    },

    schliesse() {
      db.close()
    },
  }
}

/**
 * Bittet den Browser, die Daten nicht bei Platzmangel zu löschen (7.4).
 * Ergebnis: true (zugesagt), false (abgelehnt) oder null (nicht verfügbar).
 */
export async function dauerhaftAnfordern(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}
