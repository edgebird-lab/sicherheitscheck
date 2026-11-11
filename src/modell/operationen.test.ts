import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { betriebMit, HEUTE, JETZT, pruefungMit, zaehler } from '../testhilfen/pruefung'
import {
  abschliessen,
  aendereBetrieb,
  aenderePruefung,
  bestaetigeAntwort,
  kannWiederholen,
  neuePruefung,
  neuerBetrieb,
  pruefeAbschluss,
  setzeAntwort,
  setzeVorfrage,
  vorgaengerAntwort,
  wiederholungspruefung,
  wiederOeffnen,
} from './operationen'
import type { Katalog, Massnahme, Pruefung } from './typen'

const K = KATALOG
const SPAETER = new Date('2026-11-12T08:00:00.000Z')

function massnahme(id: string, status: Massnahme['status']): Massnahme {
  return {
    id,
    quelle: { art: 'anforderung', anforderungId: 'A04' },
    titel: 'Notfallplan für IT-Ausfälle und Angriffe',
    prioritaet: 2,
    prioritaetManuell: null,
    begruendungManuell: '',
    frist: '2027-02-09',
    verantwortlich: 'Erika',
    status,
    notiz: 'Vorlage geschickt',
    erledigtAm: status === 'erledigt' ? '2026-11-20' : null,
    ursacheEntfallen: false,
  }
}

function abgeschlossen(p: Pruefung): Pruefung {
  const r = abschliessen(K, p, JETZT)
  if (!r.ok) throw new Error(r.fehler.map((f) => f.text).join(' '))
  return r.pruefung
}

describe('Betrieb und Prüfung anlegen', () => {
  it('legt einen Betrieb mit leeren Angaben an', () => {
    const b = neuerBetrieb('  Tischlerei Beispiel  ', JETZT, 'b-1')
    expect(b).toMatchObject({ id: 'b-1', name: 'Tischlerei Beispiel', domain: null, pruefungen: [], angelegt: '2026-11-11T12:00:00.000Z' })
  })

  it('neue Prüfung enthält alle Anforderungen offen und alle Vorfragen unbeantwortet', () => {
    const { betrieb, pruefung } = neuePruefung(neuerBetrieb('X', JETZT, 'b-1'), K, 'Robin Olbricht', HEUTE, JETZT, 'p-1')
    expect(pruefung).toMatchObject({ nr: 1, status: 'entwurf', datum: HEUTE, berater: 'Robin Olbricht', katalogVersion: K.version, vorgaengerId: null })
    expect(Object.keys(pruefung.antworten)).toHaveLength(27)
    expect(Object.values(pruefung.antworten).every((a) => a.bewertung === 'offen')).toBe(true)
    expect(Object.values(pruefung.vorfragen).every((v) => v === null)).toBe(true)
    expect(Object.keys(pruefung.vorbereitung)).toEqual(K.vorbereitung.map((v) => v.id))
    expect(betrieb.pruefungen).toEqual([pruefung])
    // zweite Prüfung bekommt die nächste Nummer
    expect(neuePruefung(betrieb, K, 'Robin', HEUTE, JETZT, 'p-2').pruefung.nr).toBe(2)
  })

  it('ändert Felder und setzt den Änderungszeitpunkt', () => {
    const b = aendereBetrieb(neuerBetrieb('X', JETZT, 'b'), { branche: 'Handwerk', beschaeftigte: 12 }, SPAETER)
    expect(b).toMatchObject({ branche: 'Handwerk', beschaeftigte: 12, geaendert: SPAETER.toISOString(), angelegt: JETZT.toISOString() })
  })
})

describe('Antworten', () => {
  const leer = () => neuePruefung(neuerBetrieb('X', JETZT, 'b'), K, 'Robin', HEUTE, JETZT, 'p').pruefung

  it('setzt Bewertung, Begründung und Nachweis', () => {
    let p = setzeAntwort(leer(), K, 'A12', { bewertung: 'erfuellt' }, JETZT)
    p = setzeAntwort(p, K, 'A12', { begruendung: '- tägliche Sicherung auf NAS' }, JETZT)
    p = setzeAntwort(p, K, 'A12', { nachweis: 'Protokoll vom 03.11.2026 gesehen' }, JETZT)
    expect(p.antworten.A12).toEqual({ bewertung: 'erfuellt', begruendung: '- tägliche Sicherung auf NAS', nachweis: 'Protokoll vom 03.11.2026 gesehen', uebernommen: false })
  })

  it('erlaubt „nicht relevant“ nur bei Relevanz „begründet“', () => {
    expect(setzeAntwort(leer(), K, 'A01', { bewertung: 'nicht_relevant' }, JETZT).antworten.A01.bewertung).toBe('offen')
    expect(setzeAntwort(leer(), K, 'A23', { bewertung: 'nicht_relevant' }, JETZT).antworten.A23.bewertung).toBe('offen')
    expect(setzeAntwort(leer(), K, 'A11', { bewertung: 'nicht_relevant' }, JETZT).antworten.A11.bewertung).toBe('nicht_relevant')
  })

  it('ändert keine Anforderung, die eine Vorfrage ausblendet', () => {
    const p = setzeVorfrage(leer(), K, 'wlan', false, JETZT)
    expect(setzeAntwort(p, K, 'A23', { bewertung: 'erfuellt' }, JETZT)).toBe(p)
  })

  it('gibt bei unbekannter Anforderung dieselbe Prüfung zurück', () => {
    const p = leer()
    expect(setzeAntwort(p, K, 'A99', { bewertung: 'erfuellt' }, JETZT)).toBe(p)
  })

  it('ändert sich nichts, bleibt das Objekt gleich (kein unnötiges Speichern)', () => {
    const p = setzeAntwort(leer(), K, 'A01', { bewertung: 'erfuellt' }, JETZT)
    expect(setzeAntwort(p, K, 'A01', { bewertung: 'erfuellt' }, SPAETER)).toBe(p)
  })
})

describe('Abschließen (Spezifikation 6.2, 9.2)', () => {
  it('T-O01: drei offene Anforderungen → Fehler A3', () => {
    const offen = new Set(['A02', 'A10', 'A20'])
    const p = pruefungMit(K, (a) => (offen.has(a.id) ? 'offen' : 'erfuellt'))
    const r = abschliessen(K, p, JETZT)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fehler).toEqual([{ code: 'A3', text: '3 Anforderungen sind offen.', schritt: 'interview', anforderungId: 'A02' }])
  })

  it('T-O02: Begründung „ “ bei erfüllter Anforderung → Fehler A4 mit Nummer', () => {
    const p = pruefungMit(K, () => 'erfuellt')
    p.antworten.A13 = { ...p.antworten.A13, begruendung: ' ' }
    const { fehler } = pruefeAbschluss(K, p)
    expect(fehler).toEqual([{ code: 'A4', text: 'Begründung fehlt bei Anforderung 3.2.', schritt: 'interview', anforderungId: 'A13' }])
    // zwei Zeichen reichen nicht, drei schon
    p.antworten.A13 = { ...p.antworten.A13, begruendung: ' ja ' }
    expect(pruefeAbschluss(K, p).fehler.map((f) => f.code)).toEqual(['A4'])
    p.antworten.A13 = { ...p.antworten.A13, begruendung: 'NAS' }
    expect(pruefeAbschluss(K, p).fehler).toEqual([])
  })

  it('T-O03: übernommene, unbestätigte Antwort → Fehler A5', () => {
    const p = pruefungMit(K, () => 'erfuellt')
    p.antworten.A05 = { ...p.antworten.A05, uebernommen: true }
    expect(pruefeAbschluss(K, p).fehler).toEqual([{ code: 'A5', text: '1 übernommene Antwort ist noch nicht bestätigt.', schritt: 'interview', anforderungId: 'A05' }])
    expect(pruefeAbschluss(K, bestaetigeAntwort(p, 'A05', JETZT)).fehler).toEqual([])
  })

  it('T-O04: ohne Geschäftsführung → Abschluss möglich, ohneGeschaeftsfuehrung = true, Warnung W1', () => {
    const p = pruefungMit(K, () => 'erfuellt', { teilnehmende: [{ name: 'Max Muster', rolle: 'it_extern' }] })
    const { warnungen } = pruefeAbschluss(K, p)
    expect(warnungen.map((w) => w.code)).toEqual(['W1', 'W2'])
    expect(warnungen[0].text).toBe('Die Geschäftsführung nahm nicht teil. Das weicht von der DIN SPEC ab.')
    const r = abschliessen(K, p, JETZT)
    expect(r.ok && r.pruefung.ergebnis?.ohneGeschaeftsfuehrung).toBe(true)
  })

  it('T-O05: nach dem Abschluss geänderter Katalogtext ändert das gespeicherte Ergebnis nicht', () => {
    const p = abgeschlossen(pruefungMit(K, (a) => (a.top ? 'erfuellt' : 'nicht_erfuellt')))
    const vorher = structuredClone(p.ergebnis)
    const geaendert: Katalog = { ...K, version: '2027.1', anforderungen: K.anforderungen.map((a) => ({ ...a, titel: `Neu: ${a.titel}`, top: false })) }
    // das Ergebnis ist eingefroren und wird nicht neu berechnet
    expect(p.ergebnis).toEqual(vorher)
    expect(p.ergebnis).toMatchObject({ statuswert: 15, maximal: 37, prozent: 41 })
    // auch eine Änderung an der Prüfung über den neuen Katalog lässt es unverändert
    expect(setzeAntwort(p, geaendert, 'A01', { bewertung: 'nicht_erfuellt' }, SPAETER).ergebnis).toEqual(vorher)
  })

  it('meldet Datum (A1) und offene Vorfragen (A2)', () => {
    const p = pruefungMit(K, () => 'erfuellt', { datum: '' })
    p.vorfragen.wlan = null
    p.vorfragen.fernzugriff = null
    expect(pruefeAbschluss(K, p).fehler.map((f) => f.text)).toEqual(['Datum des Interviews fehlt.', '2 Vorfragen sind offen.'])
  })

  it('setzt Status, Ergebnis und Zeitpunkt; danach sind Antworten und Vorfragen schreibgeschützt', () => {
    const p = abgeschlossen(pruefungMit(K, () => 'erfuellt'))
    expect(p).toMatchObject({ status: 'abgeschlossen', abgeschlossenAm: JETZT.toISOString() })
    expect(p.ergebnis).toMatchObject({ statuswert: 37, maximal: 37, prozent: 100 })
    expect(setzeAntwort(p, K, 'A01', { bewertung: 'nicht_erfuellt' }, SPAETER)).toBe(p)
    expect(setzeVorfrage(p, K, 'wlan', false, SPAETER)).toBe(p)
    expect(aenderePruefung(p, { datum: '2026-12-01' }, SPAETER)).toBe(p)
    // Förderhinweise bleiben änderbar
    expect(aenderePruefung(p, { foerderhinweise: 'Digital Jetzt' }, SPAETER).foerderhinweise).toBe('Digital Jetzt')
  })

  it('wieder öffnen löscht Ergebnis und Zeitpunkt', () => {
    const p = wiederOeffnen(abgeschlossen(pruefungMit(K, () => 'erfuellt')), SPAETER)
    expect(p).toMatchObject({ status: 'entwurf', ergebnis: null, abgeschlossenAm: null })
  })

  it('W3: Außenprüfung mehr als 30 Tage vor dem Interview', () => {
    const aussen = {
      domain: 'example.com',
      dkimSelektoren: [],
      modus: 'browser' as const,
      dohAnbieter: 'cloudflare' as const,
      bestaetigung: { name: 'Robin', rolle: 'beauftragt' as const, text: '…', zeit: '2026-10-01T10:00:00.000Z' },
      gestartet: '2026-10-01T10:00:00.000Z',
      beendet: '2026-10-01T10:00:30.000Z',
      abgebrochen: false,
      befunde: [],
      protokoll: [],
    }
    const p = pruefungMit(K, () => 'erfuellt', { aussen })
    // 01.10. bis 11.11. = 41 Tage
    expect(pruefeAbschluss(K, p).warnungen).toEqual([{ code: 'W3', text: 'Die Außenprüfung vom 01.10.2026 liegt mehr als 30 Tage vor dem Interview.', schritt: 'aussen' }])
    expect(pruefeAbschluss(K, { ...p, aussen: { ...aussen, gestartet: '2026-10-12T10:00:00.000Z' } }).warnungen).toEqual([])
  })
})

describe('Wiederholungsprüfung (Spezifikation 6.10)', () => {
  it('T-O06: nr + 1, Vorgänger gesetzt, Antworten übernommen, offene Maßnahmen mit neuen Kennungen, keine Außenprüfung', () => {
    // Nur A04 ist nicht erfüllt: Der Abgleich beim Abschließen lässt die vier Maßnahmen zu A04 stehen
    const erste = abgeschlossen(
      pruefungMit(K, (a) => (a.id === 'A04' ? 'nicht_erfuellt' : 'erfuellt'), {
        massnahmen: [massnahme('m-1', 'offen'), massnahme('m-2', 'in_arbeit'), massnahme('m-3', 'erledigt'), massnahme('m-4', 'verworfen')],
        foerderhinweise: 'Digital Jetzt prüfen',
      }),
    )
    expect(erste.massnahmen.map((m) => m.id)).toEqual(['m-1', 'm-2', 'm-3', 'm-4'])
    erste.vorbereitung.notfallplan = true
    const b = betriebMit(erste)
    expect(kannWiederholen(b)).toBe(true)

    const r = wiederholungspruefung(b, K, 'Robin Olbricht', '2027-05-10', SPAETER, zaehler('neu'))!
    const p = r.pruefung
    expect(p).toMatchObject({
      nr: 2,
      status: 'entwurf',
      vorgaengerId: erste.id,
      datum: '2027-05-10',
      berater: 'Robin Olbricht',
      katalogVersion: K.version,
      aussen: null,
      ergebnis: null,
      abgeschlossenAm: null,
      foerderhinweise: 'Digital Jetzt prüfen',
    })
    expect(p.teilnehmende).toEqual(erste.teilnehmende)
    expect(p.vorfragen).toEqual(erste.vorfragen)
    expect(p.vorbereitung.notfallplan).toBe(true)
    expect(p.antworten.A01).toEqual({ bewertung: 'erfuellt', begruendung: 'Test', nachweis: '', uebernommen: true })
    expect(p.antworten.A04).toEqual({ bewertung: 'nicht_erfuellt', begruendung: 'Test', nachweis: '', uebernommen: true })
    // nur offene und laufende Maßnahmen, mit neuen Kennungen, sonst unverändert
    expect(p.massnahmen.map((m) => [m.id, m.status])).toEqual([
      ['neu-1', 'offen'],
      ['neu-2', 'in_arbeit'],
    ])
    expect(p.massnahmen[0]).toEqual({ ...massnahme('m-1', 'offen'), id: 'neu-1' })
    expect(p.id).toBe('neu-3')
    expect(r.betrieb.pruefungen.map((x) => x.nr)).toEqual([1, 2])
    // Abschluss erst nach Bestätigung aller übernommenen Antworten
    expect(pruefeAbschluss(K, p).fehler.map((f) => f.text)).toEqual(['27 übernommene Antworten sind noch nicht bestätigt.'])
  })

  it('braucht eine abgeschlossene Prüfung und nimmt die letzte davon', () => {
    const entwurf = pruefungMit(K, () => 'erfuellt')
    expect(wiederholungspruefung(betriebMit(entwurf), K, 'R', HEUTE, JETZT)).toBeNull()
    const eins = abgeschlossen({ ...pruefungMit(K, () => 'erfuellt'), id: 'p-1', nr: 1 })
    const zwei = abgeschlossen({ ...pruefungMit(K, () => 'nicht_erfuellt'), id: 'p-2', nr: 2 })
    const drei = { ...pruefungMit(K, () => 'offen'), id: 'p-3', nr: 3 }
    const r = wiederholungspruefung(betriebMit(eins, zwei, drei), K, 'R', HEUTE, JETZT, zaehler())!
    expect(r.pruefung).toMatchObject({ nr: 4, vorgaengerId: 'p-2' })
    expect(r.pruefung.antworten.A01.bewertung).toBe('nicht_erfuellt')
  })

  it('übernimmt nur Anforderungen des aktuellen Katalogs; neue beginnen offen', () => {
    const erste = abgeschlossen(pruefungMit(K, () => 'erfuellt'))
    erste.antworten.A99 = { bewertung: 'erfuellt', begruendung: 'alt', nachweis: '', uebernommen: false }
    const neuerKatalog: Katalog = {
      ...K,
      anforderungen: [...K.anforderungen, { ...K.anforderungen[2], id: 'A28', normNr: '1.7' }],
    }
    const p = wiederholungspruefung(betriebMit(erste), neuerKatalog, 'R', HEUTE, JETZT, zaehler())!.pruefung
    expect(p.antworten.A99).toBeUndefined()
    expect(p.antworten.A28).toEqual({ bewertung: 'offen', begruendung: '', nachweis: '', uebernommen: false })
  })

  it('Antworten, die eine Vorfrage ausblendet, gelten nicht als übernommen', () => {
    const erste = abgeschlossen(setzeVorfrage(pruefungMit(K, () => 'erfuellt'), K, 'wlan', false, JETZT))
    const p = wiederholungspruefung(betriebMit(erste), K, 'R', HEUTE, JETZT, zaehler())!.pruefung
    expect(p.antworten.A23).toMatchObject({ bewertung: 'nicht_relevant', uebernommen: false })
    expect(p.antworten.A22.uebernommen).toBe(true)
  })

  it('„Unverändert bestätigen“ und jede Änderung an Bewertung oder Begründung heben „übernommen“ auf', () => {
    const erste = abgeschlossen(pruefungMit(K, () => 'erfuellt'))
    let p = wiederholungspruefung(betriebMit(erste), K, 'R', HEUTE, JETZT, zaehler())!.pruefung
    p = bestaetigeAntwort(p, 'A01', JETZT)
    p = setzeAntwort(p, K, 'A02', { bewertung: 'nicht_erfuellt' }, JETZT)
    p = setzeAntwort(p, K, 'A03', { begruendung: 'Test, neu geprüft' }, JETZT)
    p = setzeAntwort(p, K, 'A04', { nachweis: 'Plan gesehen' }, JETZT)
    expect([p.antworten.A01, p.antworten.A02, p.antworten.A03, p.antworten.A04].map((a) => a.uebernommen)).toEqual([false, false, false, true])
  })

  it('zeigt die Antwort der Vorgängerprüfung', () => {
    const erste = abgeschlossen(pruefungMit(K, () => 'erfuellt'))
    const r = wiederholungspruefung(betriebMit(erste), K, 'R', HEUTE, JETZT, zaehler())!
    expect(vorgaengerAntwort(r.betrieb, r.pruefung, 'A01')).toEqual(erste.antworten.A01)
    expect(vorgaengerAntwort(r.betrieb, erste, 'A01')).toBeNull()
  })
})
