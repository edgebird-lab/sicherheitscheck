/**
 * Änderungen an Betrieben und Prüfungen als reine Funktionen (Spezifikation 6.1, 6.2, 6.10).
 * Jede Funktion gibt neue Objekte zurück und lässt die Eingabe unverändert.
 * Zeit und Kennungen kommen als Parameter, damit Tests sie festlegen können.
 */
import { antwortVon, begruendungReicht, berechneErgebnis, durchVorfrageAusgeblendet, istRelevant, LEERE_ANTWORT, nichtRelevantWaehlbar, relevanzMeldungen, wirksameBewertung } from './bewertung'
import { datumDeutsch, istDatum, tageZwischen } from './datum'
import type { Antwort, Betrieb, Datum, Id, Katalog, Massnahme, Pruefung, Teilnahme } from './typen'

export type NeueId = () => Id

export const neueId: NeueId = () => crypto.randomUUID()

const zeit = (jetzt: Date) => jetzt.toISOString()

/* ---------- Betrieb ---------- */

export function neuerBetrieb(name: string, jetzt: Date, id: Id = neueId()): Betrieb {
  return {
    id,
    name: name.trim(),
    branche: '',
    beschaeftigte: null,
    anschrift: '',
    ansprechpartner: [],
    domain: null,
    dkimSelektoren: [],
    notiz: '',
    angelegt: zeit(jetzt),
    geaendert: zeit(jetzt),
    pruefungen: [],
  }
}

export type BetriebFelder = Partial<Pick<Betrieb, 'name' | 'branche' | 'beschaeftigte' | 'anschrift' | 'ansprechpartner' | 'domain' | 'dkimSelektoren' | 'notiz'>>

export function aendereBetrieb(b: Betrieb, felder: BetriebFelder, jetzt: Date): Betrieb {
  return { ...b, ...felder, geaendert: zeit(jetzt) }
}

/** Ersetzt eine Prüfung des Betriebs (gleiche id) und hält die Liste nach `nr` sortiert. */
export function mitPruefung(b: Betrieb, p: Pruefung, jetzt: Date): Betrieb {
  const andere = b.pruefungen.filter((x) => x.id !== p.id)
  return { ...b, pruefungen: [...andere, p].sort((x, y) => x.nr - y.nr), geaendert: zeit(jetzt) }
}

export function naechsteNr(b: Betrieb): number {
  return b.pruefungen.reduce((m, p) => Math.max(m, p.nr), 0) + 1
}

/** Letzte abgeschlossene Prüfung (höchste Nummer) oder null */
export function letzteAbgeschlossene(b: Betrieb): Pruefung | null {
  return [...b.pruefungen].reverse().find((p) => p.status === 'abgeschlossen') ?? null
}

/* ---------- Prüfung ---------- */

function alleAntwortenOffen(k: Katalog): Record<string, Antwort> {
  return Object.fromEntries(k.anforderungen.map((a) => [a.id, { ...LEERE_ANTWORT }]))
}

export function neuePruefung(b: Betrieb, k: Katalog, berater: string, heute: Datum, jetzt: Date, id: Id = neueId()): { betrieb: Betrieb; pruefung: Pruefung } {
  const pruefung: Pruefung = {
    id,
    nr: naechsteNr(b),
    status: 'entwurf',
    katalogVersion: k.version,
    datum: heute,
    vorgaengerId: null,
    berater,
    teilnehmende: [],
    vorfragen: Object.fromEntries(k.vorfragen.map((v) => [v.id, null])),
    antworten: alleAntwortenOffen(k),
    vorbereitung: Object.fromEntries(k.vorbereitung.map((v) => [v.id, false])),
    aussen: null,
    massnahmen: [],
    foerderhinweise: '',
    ergebnis: null,
    abgeschlossenAm: null,
    angelegt: zeit(jetzt),
    geaendert: zeit(jetzt),
  }
  return { betrieb: mitPruefung(b, pruefung, jetzt), pruefung }
}

export type PruefungFelder = Partial<Pick<Pruefung, 'datum' | 'berater' | 'teilnehmende' | 'vorbereitung' | 'foerderhinweise'>>

/**
 * Ändert Angaben des Vorgesprächs. Nach dem Abschluss sind Datum, Berater, Teilnehmende und
 * Vorbereitung eingefroren, weil das Ergebnis darauf beruht; Förderhinweise bleiben änderbar.
 */
export function aenderePruefung(p: Pruefung, felder: PruefungFelder, jetzt: Date): Pruefung {
  if (p.status === 'abgeschlossen') {
    if (felder.foerderhinweise === undefined) return p
    return { ...p, foerderhinweise: felder.foerderhinweise, geaendert: zeit(jetzt) }
  }
  return { ...p, ...felder, geaendert: zeit(jetzt) }
}

export type AntwortFelder = Partial<Pick<Antwort, 'bewertung' | 'begruendung' | 'nachweis'>>

/**
 * Setzt Bewertung, Begründung oder Nachweis. Eine Änderung an Bewertung oder Begründung
 * hebt „übernommen“ auf (6.10). „Nicht relevant“ lässt sich nur bei Anforderungen mit
 * Relevanz „begründet“ von Hand wählen; Vorfragen setzen es selbst (setzeVorfrage).
 */
export function setzeAntwort(p: Pruefung, k: Katalog, anforderungId: string, felder: AntwortFelder, jetzt: Date): Pruefung {
  const a = k.anforderungen.find((x) => x.id === anforderungId)
  if (!a || p.status === 'abgeschlossen' || durchVorfrageAusgeblendet(a, p)) return p
  if (felder.bewertung === 'nicht_relevant' && !nichtRelevantWaehlbar(a)) return p
  const alt = antwortVon(p, anforderungId)
  const neu: Antwort = { ...alt, ...felder }
  const geaendert = neu.bewertung !== alt.bewertung || neu.begruendung !== alt.begruendung
  if (geaendert) neu.uebernommen = false
  if (neu.bewertung === alt.bewertung && neu.begruendung === alt.begruendung && neu.nachweis === alt.nachweis) return p
  return { ...p, antworten: { ...p.antworten, [anforderungId]: neu }, geaendert: zeit(jetzt) }
}

/** „Unverändert bestätigen“: übernommene Antwort gilt als geprüft (6.10). */
export function bestaetigeAntwort(p: Pruefung, anforderungId: string, jetzt: Date): Pruefung {
  const alt = p.antworten[anforderungId]
  if (!alt || !alt.uebernommen || p.status === 'abgeschlossen') return p
  return { ...p, antworten: { ...p.antworten, [anforderungId]: { ...alt, uebernommen: false } }, geaendert: zeit(jetzt) }
}

/** Begründung, die eine Vorfrage automatisch setzt, z. B. „Vorfrage „Betreibt …?“: Nein“ */
export function vorfrageBegruendung(frage: string, wert: boolean): string {
  return `Vorfrage „${frage}“: ${wert ? 'Ja' : 'Nein'}`
}

/**
 * Beantwortet eine Vorfrage und passt die abhängigen Anforderungen an (6.1):
 * Passt die Antwort nicht zu `relevantWenn`, wird die Anforderung „nicht relevant“ mit
 * automatischer Begründung; wechselt die Vorfrage zurück, wird die Antwort wieder offen.
 */
export function setzeVorfrage(p: Pruefung, k: Katalog, vorfrageId: string, wert: boolean | null, jetzt: Date): Pruefung {
  const vorfrage = k.vorfragen.find((v) => v.id === vorfrageId)
  if (!vorfrage || p.status === 'abgeschlossen') return p
  const vorher = { vorfragen: p.vorfragen, antworten: p.antworten }
  const nachher = { vorfragen: { ...p.vorfragen, [vorfrageId]: wert }, antworten: { ...p.antworten } }
  for (const a of k.anforderungen) {
    if (a.relevanz.art !== 'vorfrage' || a.relevanz.vorfrageId !== vorfrageId) continue
    const warAus = durchVorfrageAusgeblendet(a, vorher)
    const istAus = durchVorfrageAusgeblendet(a, nachher)
    if (istAus && wert !== null) {
      nachher.antworten[a.id] = { bewertung: 'nicht_relevant', begruendung: vorfrageBegruendung(vorfrage.frage, wert), nachweis: '', uebernommen: false }
    } else if (warAus) {
      nachher.antworten[a.id] = { ...LEERE_ANTWORT }
    }
  }
  return { ...p, ...nachher, geaendert: zeit(jetzt) }
}

/** Bringt Antworten nach einer Katalogänderung in Einklang mit den Vorfragen (z. B. bei der Wiederholung). */
export function gleicheVorfragenAb(p: Pruefung, k: Katalog): Pruefung {
  const antworten = { ...p.antworten }
  for (const a of k.anforderungen) {
    antworten[a.id] ??= { ...LEERE_ANTWORT }
    if (a.relevanz.art !== 'vorfrage') continue
    const { vorfrageId } = a.relevanz
    const wert = p.vorfragen[vorfrageId] ?? null
    if (durchVorfrageAusgeblendet(a, p) && wert !== null) {
      const vorfrage = k.vorfragen.find((v) => v.id === vorfrageId)
      antworten[a.id] = { bewertung: 'nicht_relevant', begruendung: vorfrageBegruendung(vorfrage?.frage ?? vorfrageId, wert), nachweis: '', uebernommen: false }
    } else if (antworten[a.id].bewertung === 'nicht_relevant') {
      antworten[a.id] = { ...LEERE_ANTWORT }
    }
  }
  return { ...p, antworten }
}

/* ---------- Abschluss (6.2) ---------- */

export type MeldungCode = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'W1' | 'W2' | 'W3' | 'R1'
export type MeldungSchritt = 'vorgespraech' | 'interview' | 'aussen'

export interface Meldung {
  code: MeldungCode
  text: string
  /** Schritt, in dem sich die Ursache beheben lässt (Sprungmarke) */
  schritt: MeldungSchritt
  /** bei Meldungen zu einer Anforderung: die erste betroffene */
  anforderungId?: string
}

const anzahl = (n: number, eins: string, viele: string) => (n === 1 ? `1 ${eins}` : `${n} ${viele}`)

export const TEXT_OHNE_GESCHAEFTSFUEHRUNG = 'Die Geschäftsführung nahm nicht teil. Das weicht von der DIN SPEC ab.'

/** Sperrende Fehler und Warnungen vor dem Abschließen. */
export function pruefeAbschluss(k: Katalog, p: Pruefung): { fehler: Meldung[]; warnungen: Meldung[] } {
  const fehler: Meldung[] = []
  const warnungen: Meldung[] = []

  if (!istDatum(p.datum)) fehler.push({ code: 'A1', text: 'Datum des Interviews fehlt.', schritt: 'vorgespraech' })

  const offeneVorfragen = k.vorfragen.filter((v) => (p.vorfragen[v.id] ?? null) === null)
  if (offeneVorfragen.length > 0) {
    fehler.push({ code: 'A2', text: `${anzahl(offeneVorfragen.length, 'Vorfrage ist', 'Vorfragen sind')} offen.`, schritt: 'vorgespraech' })
  }

  const offen = k.anforderungen.filter((a) => istRelevant(a, p) && wirksameBewertung(a, p) === 'offen')
  if (offen.length > 0) {
    fehler.push({ code: 'A3', text: `${anzahl(offen.length, 'Anforderung ist', 'Anforderungen sind')} offen.`, schritt: 'interview', anforderungId: offen[0].id })
  }

  for (const a of k.anforderungen) {
    const antwort = antwortVon(p, a.id)
    if (antwort.bewertung !== 'offen' && !begruendungReicht(antwort)) {
      fehler.push({ code: 'A4', text: `Begründung fehlt bei Anforderung ${a.normNr}.`, schritt: 'interview', anforderungId: a.id })
    }
  }

  const unbestaetigt = k.anforderungen.filter((a) => antwortVon(p, a.id).uebernommen && !durchVorfrageAusgeblendet(a, p))
  if (unbestaetigt.length > 0) {
    fehler.push({
      code: 'A5',
      text: `${anzahl(unbestaetigt.length, 'übernommene Antwort ist', 'übernommene Antworten sind')} noch nicht bestätigt.`,
      schritt: 'interview',
      anforderungId: unbestaetigt[0].id,
    })
  }

  for (const m of relevanzMeldungen(k, p)) warnungen.push({ ...m, schritt: 'interview' })

  if (!p.teilnehmende.some((t) => t.rolle === 'geschaeftsfuehrung')) warnungen.push({ code: 'W1', text: TEXT_OHNE_GESCHAEFTSFUEHRUNG, schritt: 'vorgespraech' })

  if (!p.aussen) {
    warnungen.push({ code: 'W2', text: 'Keine Außenprüfung: Teil B des Berichts entfällt.', schritt: 'aussen' })
  } else if (istDatum(p.datum)) {
    const tagAussen = p.aussen.gestartet.slice(0, 10)
    if (istDatum(tagAussen) && tageZwischen(tagAussen, p.datum) > 30) {
      warnungen.push({ code: 'W3', text: `Die Außenprüfung vom ${datumDeutsch(tagAussen)} liegt mehr als 30 Tage vor dem Interview.`, schritt: 'aussen' })
    }
  }
  return { fehler, warnungen }
}

export type AbschlussErgebnis = { ok: true; pruefung: Pruefung } | { ok: false; fehler: Meldung[] }

/**
 * Berechnet das Ergebnis, friert es ein und setzt den Status (6.2). Danach sind Antworten,
 * Vorfragen und Außenprüfung schreibgeschützt. Den Maßnahmenabgleich (6.8) ergänzt Phase 4.1.
 */
export function abschliessen(k: Katalog, p: Pruefung, jetzt: Date): AbschlussErgebnis {
  if (p.status === 'abgeschlossen') return { ok: true, pruefung: p }
  const { fehler } = pruefeAbschluss(k, p)
  if (fehler.length > 0) return { ok: false, fehler }
  return {
    ok: true,
    pruefung: { ...p, status: 'abgeschlossen', ergebnis: berechneErgebnis(k, p), abgeschlossenAm: zeit(jetzt), geaendert: zeit(jetzt) },
  }
}

export function wiederOeffnen(p: Pruefung, jetzt: Date): Pruefung {
  if (p.status === 'entwurf') return p
  return { ...p, status: 'entwurf', ergebnis: null, abgeschlossenAm: null, geaendert: zeit(jetzt) }
}

/* ---------- Wiederholungsprüfung (6.10) ---------- */

export function kannWiederholen(b: Betrieb): boolean {
  return letzteAbgeschlossene(b) !== null
}

/**
 * Legt eine Wiederholungsprüfung an. Übernommen werden Teilnehmende, Vorfragen,
 * Förderhinweise, Vorbereitung, Antworten (als „übernommen“, nur Anforderungen des aktuellen
 * Katalogs) und Maßnahmen mit Status offen oder in Arbeit (mit neuer id).
 * Antworten, die eine Vorfrage ausblendet, gelten nicht als übernommen: Sie erscheinen im
 * Interview nicht und ließen sich dort nicht bestätigen.
 */
export function wiederholungspruefung(
  b: Betrieb,
  k: Katalog,
  berater: string,
  heute: Datum,
  jetzt: Date,
  id: NeueId = neueId,
): { betrieb: Betrieb; pruefung: Pruefung } | null {
  const vorher = letzteAbgeschlossene(b)
  if (!vorher) return null

  const vorfragen: Record<string, boolean | null> = {}
  for (const v of k.vorfragen) vorfragen[v.id] = vorher.vorfragen[v.id] ?? null

  const antworten: Record<string, Antwort> = {}
  for (const a of k.anforderungen) {
    const alt = vorher.antworten[a.id]
    antworten[a.id] = alt
      ? { bewertung: alt.bewertung, begruendung: alt.begruendung, nachweis: alt.nachweis, uebernommen: alt.bewertung !== 'offen' }
      : { ...LEERE_ANTWORT }
  }

  const vorbereitung: Record<string, boolean> = {}
  for (const v of k.vorbereitung) vorbereitung[v.id] = vorher.vorbereitung[v.id] ?? false

  const massnahmen: Massnahme[] = vorher.massnahmen.filter((m) => m.status === 'offen' || m.status === 'in_arbeit').map((m) => ({ ...m, id: id() }))

  let pruefung: Pruefung = {
    id: id(),
    nr: naechsteNr(b),
    status: 'entwurf',
    katalogVersion: k.version,
    datum: heute,
    vorgaengerId: vorher.id,
    berater,
    teilnehmende: vorher.teilnehmende.map((t): Teilnahme => ({ ...t })),
    vorfragen,
    antworten,
    vorbereitung,
    aussen: null,
    massnahmen,
    foerderhinweise: vorher.foerderhinweise,
    ergebnis: null,
    abgeschlossenAm: null,
    angelegt: zeit(jetzt),
    geaendert: zeit(jetzt),
  }
  pruefung = gleicheVorfragenAb(pruefung, k)
  return { betrieb: mitPruefung(b, pruefung, jetzt), pruefung }
}

/** Antwort der Vorgängerprüfung zu einer Anforderung (Kasten „Letztes Mal“) */
export function vorgaengerAntwort(b: Betrieb, p: Pruefung, anforderungId: string): Antwort | null {
  if (!p.vorgaengerId) return null
  const vorher = b.pruefungen.find((x) => x.id === p.vorgaengerId)
  return vorher?.antworten[anforderungId] ?? null
}
