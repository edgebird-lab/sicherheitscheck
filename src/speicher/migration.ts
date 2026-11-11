/**
 * Migrationsgerüst: hebt Daten älterer Formatversionen Schritt für Schritt auf FORMAT_VERSION.
 * Format 1 ist das erste Format; es gibt noch keine Migration. Kommt Format 2, erhält
 * MIGRATIONEN einen Eintrag `1: (daten) => { … }`, der die Daten an Ort und Stelle umbaut.
 *
 * Reihenfolge beim Import (6.11): erst Version prüfen und entschlüsseln, dann migrieren,
 * dann mit pruefeDatenbestand prüfen.
 */
import { FORMAT_VERSION } from '../modell/typen'
import { Formatfehler, istObj } from './pruefen'

/** Baut Daten einer Version in die nächste um (an Ort und Stelle). */
export type Migration = (daten: Record<string, unknown>) => void

/** Schlüssel: Ausgangsversion */
export type Migrationen = Readonly<Record<number, Migration>>

export const MIGRATIONEN: Migrationen = {}

/** Gibt die Daten in FORMAT_VERSION zurück; unbekannte ältere Versionen ergeben einen Formatfehler. */
export function migriere(daten: unknown, migrationen: Migrationen = MIGRATIONEN): unknown {
  if (!istObj(daten) || typeof daten.formatVersion !== 'number') return daten
  let version = daten.formatVersion
  while (version < FORMAT_VERSION) {
    const schritt = migrationen[version]
    if (!schritt) throw new Formatfehler(`Datenformat ${version} wird nicht unterstützt.`)
    schritt(daten)
    version += 1
    daten.formatVersion = version
  }
  return daten
}
