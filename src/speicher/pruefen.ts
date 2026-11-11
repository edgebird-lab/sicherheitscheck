/**
 * Prüft geladene Daten (IndexedDB oder Datei), damit beschädigte oder fremde Daten keinen
 * Absturz auslösen (Muster: src/modell/speicher.ts im Prozesslotsen). Fehlerhafte Betriebe
 * werden beim Laden übersprungen und gemeldet, nicht stillschweigend gelöscht (7.4).
 */
import { LEERE_ANTWORT } from '../modell/bewertung'
import { istDatum, istZeitpunkt } from '../modell/datum'
import { FORMAT_VERSION, type Betrieb, type Datenbestand, type Einstellungen, type Katalog, type Pruefung } from '../modell/typen'
import { PRUEF_IDS, STUFEN } from '../pruefung/stufen'

export class Formatfehler extends Error {}

type Obj = Record<string, unknown>

export function istObj(x: unknown): x is Obj {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function fordere(bedingung: unknown, meldung: string): asserts bedingung {
  if (!bedingung) throw new Formatfehler(meldung)
}

const istText = (x: unknown): x is string => typeof x === 'string'
const istZahl = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const istGanzzahl = (x: unknown): x is number => Number.isInteger(x)
const istTextliste = (x: unknown): x is string[] => Array.isArray(x) && x.every(istText)
const einerVon = <T extends string>(x: unknown, werte: readonly T[]): x is T => typeof x === 'string' && (werte as readonly string[]).includes(x)

const BEWERTUNGEN = ['offen', 'erfuellt', 'nicht_erfuellt', 'nicht_relevant'] as const
const ROLLEN = ['geschaeftsfuehrung', 'it_intern', 'it_extern', 'sonstige'] as const
const MASSNAHME_STATUS = ['offen', 'in_arbeit', 'erledigt', 'verworfen'] as const

export function standardEinstellungen(): Einstellungen {
  return {
    berater: { name: '', firma: '', email: '', telefon: '' },
    dohAnbieter: 'cloudflare',
    darstellung: 'system',
    letzteSicherung: null,
  }
}

export function leererBestand(): Datenbestand {
  return { formatVersion: FORMAT_VERSION, einstellungen: standardEinstellungen(), betriebe: [] }
}

function pruefeEinstellungen(x: unknown): asserts x is Einstellungen {
  fordere(istObj(x), 'Einstellungen fehlen.')
  const b = x.berater
  fordere(istObj(b) && istText(b.name) && istText(b.firma) && istText(b.email) && istText(b.telefon), 'Einstellungen: Angaben zum Berater fehlen.')
  fordere(einerVon(x.dohAnbieter, ['cloudflare', 'google'] as const), 'Einstellungen: unbekannter DNS-Anbieter.')
  fordere(einerVon(x.darstellung, ['system', 'hell', 'dunkel'] as const), 'Einstellungen: unbekannte Darstellung.')
  fordere(x.letzteSicherung === null || istZeitpunkt(x.letzteSicherung), 'Einstellungen: Zeitpunkt der letzten Sicherung ungültig.')
}

function pruefeAntworten(x: unknown, wo: string): void {
  fordere(istObj(x), `${wo}: Antworten fehlen.`)
  for (const [id, a] of Object.entries(x)) {
    fordere(
      istObj(a) && einerVon(a.bewertung, BEWERTUNGEN) && istText(a.begruendung) && istText(a.nachweis) && typeof a.uebernommen === 'boolean',
      `${wo}: Antwort zu ${id} ungültig.`,
    )
  }
}

function pruefeMassnahmen(x: unknown, wo: string): void {
  fordere(Array.isArray(x), `${wo}: Maßnahmenliste fehlt.`)
  x.forEach((m, i) => {
    const w = `${wo}, Maßnahme ${i + 1}`
    fordere(istObj(m) && istText(m.id) && istText(m.titel), `${w}: Angaben fehlen.`)
    const q = m.quelle
    fordere(
      istObj(q) && ((q.art === 'anforderung' && istText(q.anforderungId)) || (q.art === 'befund' && einerVon(q.pruefId, PRUEF_IDS) && istText(q.ziel))),
      `${w}: Ursache ungültig.`,
    )
    fordere([1, 2, 3].includes(m.prioritaet as number) && (m.prioritaetManuell === null || [1, 2, 3].includes(m.prioritaetManuell as number)), `${w}: Priorität ungültig.`)
    fordere(istText(m.begruendungManuell) && istText(m.verantwortlich) && istText(m.notiz), `${w}: Angaben fehlen.`)
    fordere(istDatum(m.frist) && (m.erledigtAm === null || istDatum(m.erledigtAm)), `${w}: Datum ungültig.`)
    fordere(einerVon(m.status, MASSNAHME_STATUS) && typeof m.ursacheEntfallen === 'boolean', `${w}: Status ungültig.`)
  })
}

const istWert = (x: unknown) => x === null || typeof x === 'string' || typeof x === 'boolean' || istZahl(x)

function pruefeBefund(f: unknown): boolean {
  if (!istObj(f) || !einerVon(f.pruefId, PRUEF_IDS) || !istText(f.ziel) || !einerVon(f.stufe, STUFEN) || !istText(f.regel) || !istText(f.messwert)) return false
  if (!Array.isArray(f.weitere) || !f.weitere.every((w) => istObj(w) && istText(w.regel) && einerVon(w.stufe, STUFEN))) return false
  return istObj(f.werte) && Object.values(f.werte).every(istWert)
}

function pruefeAussen(x: unknown, wo: string): void {
  if (x === null) return
  fordere(istObj(x) && istText(x.domain) && istTextliste(x.dkimSelektoren), `${wo}: Außenprüfung ungültig.`)
  fordere(einerVon(x.modus, ['browser', 'desktop'] as const) && einerVon(x.dohAnbieter, ['cloudflare', 'google'] as const), `${wo}: Außenprüfung ungültig.`)
  const b = x.bestaetigung
  fordere(istObj(b) && istText(b.name) && istText(b.text) && istZeitpunkt(b.zeit) && einerVon(b.rolle, ['verantwortlich', 'beauftragt'] as const), `${wo}: Bestätigung der Außenprüfung ungültig.`)
  fordere(istZeitpunkt(x.gestartet) && (x.beendet === null || istZeitpunkt(x.beendet)) && typeof x.abgebrochen === 'boolean', `${wo}: Zeiten der Außenprüfung ungültig.`)
  fordere(Array.isArray(x.befunde) && x.befunde.every(pruefeBefund), `${wo}: Befunde ungültig.`)
  fordere(
    Array.isArray(x.protokoll) &&
      x.protokoll.every((a) => istObj(a) && istZeitpunkt(a.zeit) && einerVon(a.art, ['dns', 'http', 'tls'] as const) && istText(a.anfrage) && istText(a.ergebnis) && istZahl(a.dauerMs)),
    `${wo}: Abrufprotokoll ungültig.`,
  )
}

function pruefeErgebnis(x: unknown, wo: string): void {
  if (x === null) return
  fordere(istObj(x), `${wo}: Ergebnis ungültig.`)
  fordere(istZahl(x.rohpunkte) && istZahl(x.statuswert) && istZahl(x.maximal) && istZahl(x.prozent), `${wo}: Ergebnis ungültig.`)
  fordere(istObj(x.jeThema) && istTextliste(x.topNichtErfuellt) && istTextliste(x.nichtRelevant) && typeof x.ohneGeschaeftsfuehrung === 'boolean', `${wo}: Ergebnis ungültig.`)
}

function pruefePruefung(x: unknown, wo: string): asserts x is Pruefung {
  fordere(istObj(x), `${wo}: keine Prüfung.`)
  fordere(istText(x.id) && x.id !== '', `${wo}: Kennung fehlt.`)
  fordere(istGanzzahl(x.nr) && x.nr >= 1, `${wo}: Nummer ungültig.`)
  fordere(einerVon(x.status, ['entwurf', 'abgeschlossen'] as const), `${wo}: Status ungültig.`)
  fordere(istText(x.katalogVersion), `${wo}: Katalogversion fehlt.`)
  fordere(x.datum === '' || istDatum(x.datum), `${wo}: Datum ungültig.`)
  fordere(x.vorgaengerId === null || istText(x.vorgaengerId), `${wo}: Vorgänger ungültig.`)
  fordere(istText(x.berater) && istText(x.foerderhinweise), `${wo}: Angaben fehlen.`)
  fordere(Array.isArray(x.teilnehmende) && x.teilnehmende.every((t) => istObj(t) && istText(t.name) && einerVon(t.rolle, ROLLEN)), `${wo}: Teilnehmende ungültig.`)
  fordere(istObj(x.vorfragen) && Object.values(x.vorfragen).every((v) => v === null || typeof v === 'boolean'), `${wo}: Vorfragen ungültig.`)
  pruefeAntworten(x.antworten, wo)
  fordere(istObj(x.vorbereitung) && Object.values(x.vorbereitung).every((v) => typeof v === 'boolean'), `${wo}: Vorbereitung ungültig.`)
  pruefeAussen(x.aussen, wo)
  pruefeMassnahmen(x.massnahmen, wo)
  pruefeErgebnis(x.ergebnis, wo)
  fordere(x.status === 'entwurf' || x.ergebnis !== null, `${wo}: abgeschlossen, aber ohne Ergebnis.`)
  fordere(x.abgeschlossenAm === null || istZeitpunkt(x.abgeschlossenAm), `${wo}: Abschlusszeitpunkt ungültig.`)
  fordere(istZeitpunkt(x.angelegt) && istZeitpunkt(x.geaendert), `${wo}: Zeitstempel ungültig.`)
}

/** Prüft einen Betrieb; wirft Formatfehler mit Meldung wie „Betrieb 2: Name fehlt.“ */
export function pruefeBetrieb(x: unknown, wo: string): asserts x is Betrieb {
  fordere(istObj(x), `${wo}: kein Betrieb.`)
  fordere(istText(x.id) && x.id !== '', `${wo}: Kennung fehlt.`)
  fordere(istText(x.name) && x.name.trim() !== '', `${wo}: Name fehlt.`)
  fordere(istText(x.branche) && istText(x.anschrift) && istText(x.notiz), `${wo}: Angaben fehlen.`)
  fordere(x.beschaeftigte === null || (istGanzzahl(x.beschaeftigte) && x.beschaeftigte >= 0), `${wo}: Zahl der Beschäftigten ungültig.`)
  fordere(
    Array.isArray(x.ansprechpartner) && x.ansprechpartner.every((p) => istObj(p) && istText(p.name) && istText(p.funktion) && istText(p.email) && istText(p.telefon)),
    `${wo}: Ansprechpartner ungültig.`,
  )
  fordere(x.domain === null || istText(x.domain), `${wo}: Domain ungültig.`)
  fordere(istTextliste(x.dkimSelektoren), `${wo}: DKIM-Selektoren ungültig.`)
  fordere(istZeitpunkt(x.angelegt) && istZeitpunkt(x.geaendert), `${wo}: Zeitstempel ungültig.`)
  fordere(Array.isArray(x.pruefungen), `${wo}: Prüfungsliste fehlt.`)
  const ids = new Set<string>()
  x.pruefungen.forEach((p, i) => {
    pruefePruefung(p, `${wo}, Prüfung ${i + 1}`)
    fordere(!ids.has(p.id), `${wo}, Prüfung ${i + 1}: Kennung doppelt.`)
    ids.add(p.id)
  })
}

/**
 * Ergänzt fehlende Antworten eines Entwurfs um offene Antworten, z. B. nach einer
 * Katalogerweiterung („antworten enthält immer alle Anforderungen des Katalogs“).
 * Abgeschlossene Prüfungen bleiben unverändert.
 */
function ergaenzeAntworten(b: Betrieb, k: Katalog): Betrieb {
  let geaendert = false
  const pruefungen = b.pruefungen.map((p) => {
    if (p.status !== 'entwurf') return p
    const fehlend = k.anforderungen.filter((a) => !p.antworten[a.id])
    if (fehlend.length === 0) return p
    geaendert = true
    return { ...p, antworten: { ...p.antworten, ...Object.fromEntries(fehlend.map((a) => [a.id, { ...LEERE_ANTWORT }])) } }
  })
  return geaendert ? { ...b, pruefungen } : b
}

export interface Pruefbericht {
  bestand: Datenbestand
  /** übersprungene Betriebe und ersetzte Einstellungen, z. B. „Betrieb 2: Name fehlt.“ */
  meldungen: string[]
}

export interface PruefOptionen {
  /** 'daten' (IndexedDB) oder 'datei' (Import); bestimmt den Wortlaut der Meldungen */
  quelle?: 'daten' | 'datei'
  /** Bei true bricht jeder Fehler ab (Import); sonst werden fehlerhafte Betriebe übersprungen (Laden). */
  streng?: boolean
}

const TEXTE = {
  daten: {
    kein: 'Die Daten enthalten keinen Sicherheitscheck-Datenbestand.',
    ohneVersion: 'Die Daten haben keine Formatversion.',
    neuer: 'Die Daten stammen aus einer neueren Version.',
    ohneListe: 'Die Daten enthalten keine Betriebsliste.',
  },
  datei: {
    kein: 'Die Datei enthält keinen Sicherheitscheck-Datenbestand.',
    ohneVersion: 'Die Datei hat keine Formatversion.',
    neuer: 'Die Datei stammt aus einer neueren Version.',
    ohneListe: 'Die Datei enthält keine Betriebsliste.',
  },
}

/**
 * Prüft einen Datenbestand (nach der Migration). Wirft Formatfehler, wenn er insgesamt
 * unbrauchbar ist, etwa aus einer neueren Version stammt.
 */
export function pruefeDatenbestand(daten: unknown, k: Katalog, optionen: PruefOptionen = {}): Pruefbericht {
  const { quelle = 'daten', streng = false } = optionen
  const t = TEXTE[quelle]
  fordere(istObj(daten), t.kein)
  fordere(istZahl(daten.formatVersion), t.ohneVersion)
  fordere(daten.formatVersion <= FORMAT_VERSION, t.neuer)
  fordere(daten.formatVersion === FORMAT_VERSION, `Datenformat ${daten.formatVersion} wird nicht unterstützt.`)
  fordere(Array.isArray(daten.betriebe), t.ohneListe)

  const meldungen: string[] = []
  let einstellungen: Einstellungen
  try {
    pruefeEinstellungen(daten.einstellungen)
    einstellungen = daten.einstellungen
  } catch (e) {
    if (streng || !(e instanceof Formatfehler)) throw e
    meldungen.push(`${e.message} Standardwerte verwendet.`)
    einstellungen = standardEinstellungen()
  }

  const betriebe: Betrieb[] = []
  const ids = new Set<string>()
  daten.betriebe.forEach((b, i) => {
    const wo = `Betrieb ${i + 1}`
    try {
      pruefeBetrieb(b, wo)
      fordere(!ids.has(b.id), `${wo}: Kennung doppelt.`)
      ids.add(b.id)
      betriebe.push(ergaenzeAntworten(b, k))
    } catch (e) {
      if (streng || !(e instanceof Formatfehler)) throw e
      meldungen.push(e.message)
    }
  })
  return { bestand: { formatVersion: FORMAT_VERSION, einstellungen, betriebe }, meldungen }
}
