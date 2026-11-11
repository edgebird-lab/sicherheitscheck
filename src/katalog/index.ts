import type { Anforderung, Katalog, Thema, ThemaId } from '../modell/typen'
import { ANFORDERUNGEN } from './anforderungen'
import { THEMEN } from './themen'
import { VORFRAGEN } from './vorfragen'

/**
 * Noch nicht mit der Norm abgeglichen (Phase 0.2). Solange das gilt, zeigt die Oberfläche
 * einen Hinweis, dass Nummern und Zuordnung vorläufig sind.
 */
export const KATALOG_ABGEGLICHEN = false

/** Der Katalog der App. Inhaltliche Änderungen erhöhen `version`. */
export const KATALOG: Katalog = {
  version: '2026.1',
  quelle: 'DIN SPEC 27076:2023-05',
  themen: THEMEN,
  vorfragen: VORFRAGEN,
  anforderungen: ANFORDERUNGEN,
  // Endfassung nach dem Abgleich mit der Norm (Phase 0.2)
  vorbereitung: [
    { id: 'notfallplan', text: 'Notfallplan oder Liste der Notfallkontakte' },
    { id: 'datensicherung', text: 'Datensicherungskonzept oder Beschreibung der Sicherung' },
    { id: 'berechtigungen', text: 'Zugangs- und Berechtigungskonzept' },
    { id: 'it_uebersicht', text: 'Übersicht der IT-Systeme und Online-Dienste' },
    { id: 'dienstleister', text: 'Verträge mit IT-Dienstleistern' },
  ],
}

export function thema(k: Katalog, id: ThemaId): Thema {
  const t = k.themen.find((x) => x.id === id)
  if (!t) throw new Error(`Unbekannter Themenbereich ${id}`)
  return t
}

export function anforderung(k: Katalog, id: string): Anforderung | undefined {
  return k.anforderungen.find((a) => a.id === id)
}

/** Anforderungen eines Themenbereichs in Katalogreihenfolge */
export function anforderungenVon(k: Katalog, id: ThemaId): Anforderung[] {
  return k.anforderungen.filter((a) => a.thema === id)
}

/** Themen nach `nr` aufsteigend */
export function themenSortiert(k: Katalog): Thema[] {
  return [...k.themen].sort((a, b) => a.nr - b.nr)
}
