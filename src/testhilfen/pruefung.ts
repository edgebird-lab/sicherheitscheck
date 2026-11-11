/** Hilfen für Unit-Tests: feste Zeit, vorhersagbare Kennungen, Prüfungen mit vorgegebenen Antworten. */
import { neuePruefung, neuerBetrieb, type NeueId } from '../modell/operationen'
import type { Anforderung, Betrieb, Bewertung, Katalog, Pruefung } from '../modell/typen'

export const JETZT = new Date('2026-11-11T12:00:00.000Z')
export const HEUTE = '2026-11-11'

/** Kennungen 'id-1', 'id-2', … */
export function zaehler(praefix = 'id'): NeueId {
  let n = 0
  return () => `${praefix}-${++n}`
}

/**
 * Prüfung, in der alle Vorfragen mit „Ja“ beantwortet sind (alles relevant) und jede
 * Anforderung die Bewertung aus `bewertung` hat; Begründung „Test“ außer bei „offen“.
 */
export function pruefungMit(k: Katalog, bewertung: (a: Anforderung) => Bewertung, extra: Partial<Pruefung> = {}): Pruefung {
  const { pruefung } = neuePruefung(neuerBetrieb('Testbetrieb', JETZT, 'b-1'), k, 'Robin', HEUTE, JETZT, 'p-1')
  const antworten = Object.fromEntries(
    k.anforderungen.map((a) => {
      const b = bewertung(a)
      return [a.id, { bewertung: b, begruendung: b === 'offen' ? '' : 'Test', nachweis: '', uebernommen: false }]
    }),
  )
  return {
    ...pruefung,
    vorfragen: Object.fromEntries(k.vorfragen.map((v) => [v.id, true])),
    antworten,
    teilnehmende: [{ name: 'Erika Beispiel', rolle: 'geschaeftsfuehrung' }],
    ...extra,
  }
}

export function betriebMit(...pruefungen: Pruefung[]): Betrieb {
  return { ...neuerBetrieb('Testbetrieb', JETZT, 'b-1'), pruefungen }
}
