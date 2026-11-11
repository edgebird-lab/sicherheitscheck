/**
 * Punkte, Statuswert und Relevanz nach dem Punkteschema der DIN SPEC 27076 (Spezifikation 6.1).
 *
 * Basis-Anforderung: erfüllt 1, sonst 0. TOP-Anforderung: erfüllt 3, sonst −3.
 * „Teilweise“ gibt es nicht; offen zählt wie nicht erfüllt. Nicht relevante Anforderungen
 * fallen aus dem Maximum. Ausgewiesen wird mindestens 0.
 */
import type { Anforderung, Antwort, Bewertung, Ergebnis, Katalog, Pruefung, ThemaErgebnis, ThemaId } from './typen'

export const THEMA_IDS: ThemaId[] = ['organisation', 'identitaet', 'datensicherung', 'patch', 'schadprogramme', 'systeme']

/** Was die Bewertung von einer Prüfung braucht */
export type Bewertbar = Pick<Pruefung, 'vorfragen' | 'antworten'>

export const LEERE_ANTWORT: Antwort = { bewertung: 'offen', begruendung: '', nachweis: '', uebernommen: false }

/** Gespeicherte Antwort; fehlt sie, gilt die Anforderung als offen. */
export function antwortVon(p: Bewertbar, anforderungId: string): Antwort {
  return p.antworten[anforderungId] ?? LEERE_ANTWORT
}

/** Die Vorfrage ist beantwortet und passt nicht: Die Anforderung erscheint nicht im Interview. */
export function durchVorfrageAusgeblendet(a: Anforderung, p: Bewertbar): boolean {
  if (a.relevanz.art !== 'vorfrage') return false
  const wert = p.vorfragen[a.relevanz.vorfrageId] ?? null
  return wert !== null && wert !== a.relevanz.relevantWenn
}

/** Relevanz nach der Tabelle in 6.1. */
export function istRelevant(a: Anforderung, p: Bewertbar): boolean {
  switch (a.relevanz.art) {
    case 'immer':
      return true
    case 'vorfrage':
      return !durchVorfrageAusgeblendet(a, p)
    case 'begruendet':
      return antwortVon(p, a.id).bewertung !== 'nicht_relevant'
  }
}

/** Darf die Bewertung „nicht relevant“ von Hand gewählt werden? */
export function nichtRelevantWaehlbar(a: Anforderung): boolean {
  return a.relevanz.art === 'begruendet'
}

/**
 * Bewertung, wie sie zählt: nicht relevante Anforderungen sind 'nicht_relevant'; ein
 * gespeichertes 'nicht_relevant', das die Relevanzregel nicht erlaubt, zählt als 'offen'.
 */
export function wirksameBewertung(a: Anforderung, p: Bewertbar): Bewertung {
  if (!istRelevant(a, p)) return 'nicht_relevant'
  const b = antwortVon(p, a.id).bewertung
  return b === 'nicht_relevant' ? 'offen' : b
}

/** Höchstpunktzahl einer relevanten Anforderung */
export function gewicht(a: Anforderung): number {
  return a.top ? 3 : 1
}

export function punkte(a: Anforderung, p: Bewertbar): number {
  if (!istRelevant(a, p)) return 0
  if (wirksameBewertung(a, p) === 'erfuellt') return gewicht(a)
  return a.top ? -3 : 0
}

export function prozentVon(statuswert: number, maximal: number): number {
  return maximal > 0 ? Math.round((statuswert / maximal) * 100) : 0
}

function leeresThema(): ThemaErgebnis {
  return { roh: 0, maximal: 0, anteil: null }
}

/**
 * Ergebnis einer Prüfung. Je Themenbereich gilt dieselbe Rechnung;
 * `anteil = max(0, roh) / maximal` ist eine Annahme bis zum Abgleich mit der Norm (Phase 0.2).
 */
export function berechneErgebnis(k: Katalog, p: Bewertbar & Pick<Pruefung, 'teilnehmende'>): Ergebnis {
  const jeThema = Object.fromEntries(THEMA_IDS.map((id) => [id, leeresThema()])) as Record<ThemaId, ThemaErgebnis>
  let rohpunkte = 0
  let maximal = 0
  const topNichtErfuellt: string[] = []
  const nichtRelevant: string[] = []

  for (const a of k.anforderungen) {
    const t = (jeThema[a.thema] ??= leeresThema())
    if (!istRelevant(a, p)) {
      nichtRelevant.push(a.id)
      continue
    }
    const pk = punkte(a, p)
    rohpunkte += pk
    maximal += gewicht(a)
    t.roh += pk
    t.maximal += gewicht(a)
    if (a.top && wirksameBewertung(a, p) !== 'erfuellt') topNichtErfuellt.push(a.id)
  }
  for (const t of Object.values(jeThema)) t.anteil = t.maximal > 0 ? Math.max(0, t.roh) / t.maximal : null

  const statuswert = Math.max(0, rohpunkte)
  return {
    rohpunkte,
    statuswert,
    maximal,
    prozent: prozentVon(statuswert, maximal),
    jeThema,
    topNichtErfuellt,
    nichtRelevant,
    ohneGeschaeftsfuehrung: !p.teilnehmende.some((t) => t.rolle === 'geschaeftsfuehrung'),
  }
}

/** Hinweis zu einer Antwort, die nicht zur Relevanzregel passt (T-B12) */
export interface Relevanzmeldung {
  code: 'R1'
  anforderungId: string
  text: string
}

/** Gespeichertes „nicht relevant“, das die Regel nicht erlaubt: zählt als offen und wird gemeldet. */
export function relevanzMeldungen(k: Katalog, p: Bewertbar): Relevanzmeldung[] {
  const meldungen: Relevanzmeldung[] = []
  for (const a of k.anforderungen) {
    if (antwortVon(p, a.id).bewertung !== 'nicht_relevant') continue
    if (a.relevanz.art === 'begruendet' || !istRelevant(a, p)) continue
    meldungen.push({
      code: 'R1',
      anforderungId: a.id,
      text: `Anforderung ${a.normNr}: „Nicht relevant“ ist hier nicht vorgesehen; die Antwort zählt als offen.`,
    })
  }
  return meldungen
}

/** Begründung ausreichend? (Abschlussprüfung A4: mindestens 3 Zeichen) */
export function begruendungReicht(antwort: Antwort): boolean {
  return antwort.begruendung.trim().length >= 3
}

/**
 * Im Interview fertig: bewertet, begründet und, falls übernommen, bestätigt.
 * Durch eine Vorfrage ausgeblendete Anforderungen gelten als fertig.
 */
export function istBeantwortet(a: Anforderung, p: Bewertbar): boolean {
  if (durchVorfrageAusgeblendet(a, p)) return true
  const antwort = antwortVon(p, a.id)
  return wirksameBewertung(a, p) !== 'offen' && begruendungReicht(antwort) && !antwort.uebernommen
}
