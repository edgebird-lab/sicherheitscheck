/**
 * Zustand der Oberfläche: der gesamte Datenbestand und die aktuelle Ansicht.
 * Änderungen an Daten laufen über reine Funktionen aus src/modell; der Reducer ersetzt nur
 * die betroffenen Objekte, damit das Speichern geänderte Betriebe an der Identität erkennt.
 */
import { mitPruefung } from '../modell/operationen'
import type { Betrieb, Datenbestand, Einstellungen, Id, Pruefung } from '../modell/typen'
import { leererBestand } from '../speicher/pruefen'

export type SchrittId = 'betrieb' | 'vorgespraech' | 'interview' | 'aussen' | 'auswertung' | 'massnahmen' | 'bericht'

export const SCHRITTE: { id: SchrittId; name: string }[] = [
  { id: 'betrieb', name: 'Betrieb' },
  { id: 'vorgespraech', name: 'Vorgespräch' },
  { id: 'interview', name: 'Interview' },
  { id: 'aussen', name: 'Außenprüfung' },
  { id: 'auswertung', name: 'Auswertung' },
  { id: 'massnahmen', name: 'Maßnahmen' },
  { id: 'bericht', name: 'Bericht' },
]

export type Ansicht =
  | { art: 'start' }
  | { art: 'einstellungen' }
  | { art: 'betrieb'; betriebId: Id; pruefungId: Id | null; schritt: SchrittId; anforderungId: string | null }

export interface Zustand {
  bestand: Datenbestand
  ansicht: Ansicht
}

export type Aktion =
  | { typ: 'bestand'; bestand: Datenbestand }
  | { typ: 'start' }
  | { typ: 'einstellungenZeigen' }
  | { typ: 'oeffneBetrieb'; betriebId: Id; pruefungId?: Id | null; schritt?: SchrittId }
  | { typ: 'schritt'; schritt: SchrittId; anforderungId?: string | null }
  | { typ: 'anforderung'; anforderungId: string }
  | { typ: 'betriebNeu'; betrieb: Betrieb }
  | { typ: 'betriebAendern'; betriebId: Id; aendere: (b: Betrieb) => Betrieb }
  | { typ: 'pruefungAendern'; betriebId: Id; pruefungId: Id; aendere: (p: Pruefung) => Pruefung; jetzt: Date }
  | { typ: 'betriebLoeschen'; betriebId: Id }
  | { typ: 'einstellungen'; aendere: (e: Einstellungen) => Einstellungen }

export function startZustand(): Zustand {
  return { bestand: leererBestand(), ansicht: { art: 'start' } }
}

function ersetzeBetrieb(bestand: Datenbestand, id: Id, aendere: (b: Betrieb) => Betrieb): Datenbestand {
  let geaendert = false
  const betriebe = bestand.betriebe.map((b) => {
    if (b.id !== id) return b
    const neu = aendere(b)
    if (neu !== b) geaendert = true
    return neu
  })
  return geaendert ? { ...bestand, betriebe } : bestand
}

/** Neueste Prüfung (höchste Nummer) oder null */
export function neuestePruefung(b: Betrieb): Pruefung | null {
  return b.pruefungen.at(-1) ?? null
}

export function reduziere(z: Zustand, a: Aktion): Zustand {
  switch (a.typ) {
    case 'bestand': {
      // Ansicht auf einen Betrieb, den es nicht mehr gibt, führt zur Startseite
      const bleibt = z.ansicht.art !== 'betrieb' || a.bestand.betriebe.some((b) => b.id === (z.ansicht as { betriebId: Id }).betriebId)
      return { bestand: a.bestand, ansicht: bleibt ? z.ansicht : { art: 'start' } }
    }
    case 'start':
      return { ...z, ansicht: { art: 'start' } }
    case 'einstellungenZeigen':
      return { ...z, ansicht: { art: 'einstellungen' } }
    case 'oeffneBetrieb': {
      const b = z.bestand.betriebe.find((x) => x.id === a.betriebId)
      if (!b) return z
      const pruefungId = a.pruefungId !== undefined ? a.pruefungId : (neuestePruefung(b)?.id ?? null)
      return { ...z, ansicht: { art: 'betrieb', betriebId: b.id, pruefungId, schritt: a.schritt ?? 'betrieb', anforderungId: null } }
    }
    case 'schritt':
      if (z.ansicht.art !== 'betrieb') return z
      return { ...z, ansicht: { ...z.ansicht, schritt: a.schritt, anforderungId: a.anforderungId !== undefined ? a.anforderungId : z.ansicht.anforderungId } }
    case 'anforderung':
      if (z.ansicht.art !== 'betrieb') return z
      return { ...z, ansicht: { ...z.ansicht, schritt: 'interview', anforderungId: a.anforderungId } }
    case 'betriebNeu':
      return {
        bestand: { ...z.bestand, betriebe: [...z.bestand.betriebe, a.betrieb] },
        ansicht: { art: 'betrieb', betriebId: a.betrieb.id, pruefungId: neuestePruefung(a.betrieb)?.id ?? null, schritt: 'betrieb', anforderungId: null },
      }
    case 'betriebAendern':
      return { ...z, bestand: ersetzeBetrieb(z.bestand, a.betriebId, a.aendere) }
    case 'pruefungAendern':
      return {
        ...z,
        bestand: ersetzeBetrieb(z.bestand, a.betriebId, (b) => {
          const p = b.pruefungen.find((x) => x.id === a.pruefungId)
          if (!p) return b
          const neu = a.aendere(p)
          return neu === p ? b : mitPruefung(b, neu, a.jetzt)
        }),
      }
    case 'betriebLoeschen': {
      const betriebe = z.bestand.betriebe.filter((b) => b.id !== a.betriebId)
      const offen = z.ansicht.art === 'betrieb' && z.ansicht.betriebId === a.betriebId
      return { bestand: { ...z.bestand, betriebe }, ansicht: offen ? { art: 'start' } : z.ansicht }
    }
    case 'einstellungen': {
      const neu = a.aendere(z.bestand.einstellungen)
      return neu === z.bestand.einstellungen ? z : { ...z, bestand: { ...z.bestand, einstellungen: neu } }
    }
  }
}
