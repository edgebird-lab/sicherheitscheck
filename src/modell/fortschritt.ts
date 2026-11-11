/**
 * Fortschritt im Interview und Häkchen der Schrittleiste („vollständig“, 5.1).
 */
import { durchVorfrageAusgeblendet, istBeantwortet } from './bewertung'
import { istDatum } from './datum'
import type { Anforderung, Betrieb, Katalog, Pruefung, Thema } from './typen'

/** Anforderungen, die im Interview erscheinen (nicht durch eine Vorfrage ausgeblendet), in Katalogreihenfolge */
export function sichtbareAnforderungen(k: Katalog, p: Pick<Pruefung, 'vorfragen' | 'antworten'>): Anforderung[] {
  return k.anforderungen.filter((a) => !durchVorfrageAusgeblendet(a, p))
}

export interface ThemaFortschritt {
  thema: Thema
  anzahl: number
  beantwortet: number
  vollstaendig: boolean
}

export function themenFortschritt(k: Katalog, p: Pruefung): ThemaFortschritt[] {
  const sichtbar = sichtbareAnforderungen(k, p)
  return [...k.themen]
    .sort((a, b) => a.nr - b.nr)
    .map((thema) => {
      const liste = sichtbar.filter((a) => a.thema === thema.id)
      const beantwortet = liste.filter((a) => istBeantwortet(a, p)).length
      return { thema, anzahl: liste.length, beantwortet, vollstaendig: beantwortet === liste.length }
    })
}

export function offeneAnforderungen(k: Katalog, p: Pruefung): Anforderung[] {
  return sichtbareAnforderungen(k, p).filter((a) => !istBeantwortet(a, p))
}

/** Nächste nicht fertige Anforderung nach `nachId` (ringsum); null, wenn alle fertig sind */
export function naechsteOffene(k: Katalog, p: Pruefung, nachId: string | null): string | null {
  const sichtbar = sichtbareAnforderungen(k, p)
  const start = nachId ? sichtbar.findIndex((a) => a.id === nachId) : -1
  for (let i = 1; i <= sichtbar.length; i++) {
    const a = sichtbar[(start + i + sichtbar.length) % sichtbar.length]
    if (a.id !== nachId && !istBeantwortet(a, p)) return a.id
  }
  return null
}

export function vorgespraechVollstaendig(k: Katalog, p: Pruefung): boolean {
  return istDatum(p.datum) && k.vorfragen.every((v) => (p.vorfragen[v.id] ?? null) !== null)
}

export function interviewVollstaendig(k: Katalog, p: Pruefung): boolean {
  return offeneAnforderungen(k, p).length === 0
}

export type Schritt = 'betrieb' | 'vorgespraech' | 'interview' | 'aussen' | 'auswertung' | 'massnahmen' | 'bericht'

/** Häkchen „vollständig“ in der Schrittleiste */
export function schrittVollstaendig(s: Schritt, b: Betrieb, p: Pruefung | null, k: Katalog): boolean {
  if (s === 'betrieb') return b.name.trim() !== ''
  if (!p) return false
  switch (s) {
    case 'vorgespraech':
      return vorgespraechVollstaendig(k, p)
    case 'interview':
    case 'auswertung':
      return interviewVollstaendig(k, p)
    case 'aussen':
      return p.aussen !== null && !p.aussen.abgebrochen
    case 'massnahmen':
      // Schritt 4.2: vollständig, wenn jede offene Maßnahme Frist und Verantwortlichen hat
      return p.massnahmen.length > 0 && p.massnahmen.every((m) => m.status === 'erledigt' || m.status === 'verworfen' || m.verantwortlich.trim() !== '')
    case 'bericht':
      return p.status === 'abgeschlossen'
  }
}
