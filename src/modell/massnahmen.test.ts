import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { JETZT, pruefungMit, zaehler } from '../testhilfen/pruefung'
import { aendereMassnahme, FEHLT_BEGRUENDUNG_PRIORITAET, gleicheMassnahmenAb, setzePrioritaet, sollMassnahmen, sortiereMassnahmen, wirksamePrioritaet } from './massnahmen'
import { abschliessen, setzeAntwort, setzeAussenpruefung } from './operationen'
import type { Aussenpruefung, Befund, Massnahme, Pruefung, Stufe } from './typen'

const K = KATALOG
const SPAETER = new Date('2026-11-20T09:00:00.000Z')

function aussen(befunde: Befund[], abgebrochen = false): Aussenpruefung {
  return {
    domain: 'example.com',
    dkimSelektoren: [],
    modus: 'browser',
    dohAnbieter: 'cloudflare',
    bestaetigung: { name: 'Robin', rolle: 'beauftragt', text: '…', zeit: '2026-11-11T10:00:00.000Z' },
    gestartet: '2026-11-11T10:00:00.000Z',
    beendet: '2026-11-11T10:00:05.000Z',
    abgebrochen,
    befunde,
    protokoll: [],
  }
}

function befund(pruefId: Befund['pruefId'], stufe: Stufe, regel: string, ziel = 'example.com'): Befund {
  return { pruefId, ziel, stufe, regel, weitere: [], messwert: '', werte: {} }
}

/** Alles erfüllt außer den genannten Anforderungen */
const nurNicht = (...ids: string[]) => pruefungMit(K, (a) => (ids.includes(a.id) ? 'nicht_erfuellt' : 'erfuellt'))

const abgleich = (p: Pruefung, id = zaehler('m')) => gleicheMassnahmenAb(K, p, JETZT, id)
const kurz = (m: Massnahme) => [m.titel, m.prioritaet, m.frist]

describe('Maßnahmen ableiten (6.8)', () => {
  it('T-P01: TOP nicht erfüllt, Datum 2026-11-11 → Priorität 1, Frist 2026-11-25', () => {
    const p = abgleich(nurNicht('A02'))
    expect(p.massnahmen.map(kurz)).toEqual([['Beschäftigte erkennen Phishing und Betrugsversuche', 1, '2026-11-25']])
    expect(p.massnahmen[0]).toMatchObject({ id: 'm-1', quelle: { art: 'anforderung', anforderungId: 'A02' }, status: 'offen', prioritaetManuell: null, ursacheEntfallen: false })
  })

  it('T-P02: Basis nicht erfüllt → Priorität 2, Frist 2027-02-09', () => {
    expect(abgleich(nurNicht('A04')).massnahmen.map(kurz)).toEqual([['Notfallplan für IT-Ausfälle und Angriffe', 2, '2027-02-09']])
  })

  it('T-P03: Befund kritisch / warnung / hinweis / info → 1 (2026-11-25) / 2 (2027-02-09) / 3 (2027-05-10) / keine Maßnahme', () => {
    const p = abgleich({
      ...nurNicht(),
      aussen: aussen([befund('spf', 'kritisch', 'SPF-03'), befund('dmarc', 'warnung', 'DMARC-05'), befund('caa', 'hinweis', 'CAA-01'), befund('mx', 'info', 'MX-03'), befund('hsts', 'nicht_geprueft', 'BROWSER-01')]),
    })
    expect(p.massnahmen.map(kurz)).toEqual([
      ['SPF erlaubt jedem Server das Senden (example.com)', 1, '2026-11-25'],
      ['DMARC beobachtet nur, ohne Berichte (example.com)', 2, '2027-02-09'],
      ['Keine CAA-Einträge (example.com)', 3, '2027-05-10'],
    ])
    expect(p.massnahmen[0].quelle).toEqual({ art: 'befund', pruefId: 'spf', ziel: 'example.com' })
  })

  it('nicht relevante und offene Anforderungen ergeben keine Maßnahme', () => {
    let p = pruefungMit(K, (a) => (a.id === 'A11' ? 'nicht_relevant' : a.id === 'A12' ? 'offen' : 'erfuellt'))
    expect(sollMassnahmen(K, p)).toEqual([])
    p = { ...p, vorfragen: { ...p.vorfragen, wlan: false } }
    p = setzeAntwort(p, K, 'A23', { bewertung: 'nicht_erfuellt' }, JETZT)
    expect(sollMassnahmen(K, p)).toEqual([])
  })

  it('ohne gültiges Datum zählt die Frist ab heute', () => {
    const p = abgleich({ ...nurNicht('A02'), datum: '' })
    expect(p.massnahmen[0].frist).toBe('2026-11-25')
  })
})

describe('Sortierung (6.8)', () => {
  it('T-P04: Befund kritisch, TOP aus Thema 3, TOP aus Thema 1 → TOP Thema 1, TOP Thema 3, Befund', () => {
    // A12 ist die TOP-Anforderung im Thema Datensicherung (3), A02 im Thema Organisation (1)
    const p = abgleich({ ...nurNicht('A12', 'A02'), aussen: aussen([befund('dnssec', 'kritisch', 'DNSSEC-03')]) })
    expect(K.anforderungen.find((a) => a.id === 'A12')).toMatchObject({ top: true, thema: 'datensicherung' })
    expect(sortiereMassnahmen(K, p.massnahmen.toReversed()).map((m) => m.titel)).toEqual([
      'Beschäftigte erkennen Phishing und Betrugsversuche',
      K.anforderungen.find((a) => a.id === 'A12')!.titel,
      'DNSSEC fehlerhaft: Domain teilweise nicht erreichbar (example.com)',
    ])
  })

  it('Befunde gleicher Priorität: schwerste Stufe, dann Reihenfolge der Prüfung, dann Ziel', () => {
    const p = abgleich({
      ...nurNicht(),
      aussen: aussen([
        befund('dkim', 'warnung', 'DKIM-02', 'z._domainkey.example.com'),
        befund('dkim', 'warnung', 'DKIM-02', 'a._domainkey.example.com'),
        befund('spf', 'warnung', 'SPF-04'),
        befund('caa', 'hinweis', 'CAA-01'),
      ]),
    })
    const prio = (m: Massnahme, n: 1 | 2 | 3) => ({ ...m, prioritaetManuell: n, begruendungManuell: 'Test' })
    // CAA (hinweis) von Hand auf 2: steht in der Gruppe 2 hinter den Warnungen
    const liste = p.massnahmen.map((m) => (m.titel.startsWith('Keine CAA') ? prio(m, 2) : m))
    expect(sortiereMassnahmen(K, liste).map((m) => (m.quelle.art === 'befund' ? `${m.quelle.pruefId} ${m.quelle.ziel}` : ''))).toEqual([
      'spf example.com',
      'dkim a._domainkey.example.com',
      'dkim z._domainkey.example.com',
      'caa example.com',
    ])
  })

  it('T-P05: Priorität von Hand ohne Begründung → Fehler; mit Begründung wirksam, Sortierung danach', () => {
    const p = abgleich(nurNicht('A02', 'A04'))
    const a04 = p.massnahmen.find((m) => m.titel.startsWith('Notfallplan'))!
    expect(setzePrioritaet(p, a04.id, 1, '  ', SPAETER)).toEqual({ ok: false, fehler: FEHLT_BEGRUENDUNG_PRIORITAET })
    const r = setzePrioritaet(p, a04.id, 1, 'Versicherung verlangt Notfallplan bis Jahresende', SPAETER)
    if (!r.ok) throw new Error(r.fehler)
    const geaendert = r.pruefung.massnahmen.find((m) => m.id === a04.id)!
    expect(geaendert).toMatchObject({ prioritaet: 2, prioritaetManuell: 1, begruendungManuell: 'Versicherung verlangt Notfallplan bis Jahresende' })
    expect(wirksamePrioritaet(geaendert)).toBe(1)
    // beide Priorität 1: TOP (A02) vor Basis (A04)
    expect(sortiereMassnahmen(K, r.pruefung.massnahmen).map((m) => m.titel.slice(0, 11))).toEqual(['Beschäftigt', 'Notfallplan'])
    // zurück auf automatisch
    const zurueck = setzePrioritaet(r.pruefung, a04.id, null, '', SPAETER)
    expect(zurueck.ok && zurueck.pruefung.massnahmen.find((m) => m.id === a04.id)).toMatchObject({ prioritaetManuell: null, begruendungManuell: '' })
  })
})

describe('Abgleich (6.8)', () => {
  it('T-P06: Anforderung inzwischen erfüllt: unberührte Maßnahme wird entfernt, bearbeitete bleibt mit „Ursache entfallen“', () => {
    const vorher = abgleich(nurNicht('A04', 'A06'))
    const bearbeitet = aendereMassnahme(vorher, vorher.massnahmen.find((m) => m.titel.startsWith('Notfallplan'))!.id, { verantwortlich: 'Erika' }, JETZT)
    let p = setzeAntwort(bearbeitet, K, 'A04', { bewertung: 'erfuellt' }, SPAETER)
    p = setzeAntwort(p, K, 'A06', { bewertung: 'erfuellt' }, SPAETER)
    const nachher = gleicheMassnahmenAb(K, p, SPAETER, zaehler('x'))
    expect(nachher.massnahmen.map((m) => [m.titel.slice(0, 11), m.ursacheEntfallen])).toEqual([['Notfallplan', true]])
    // wieder nicht erfüllt: Ursache besteht wieder
    const wieder = gleicheMassnahmenAb(K, setzeAntwort(nachher, K, 'A04', { bewertung: 'nicht_erfuellt' }, SPAETER), SPAETER, zaehler('y'))
    expect(wieder.massnahmen).toMatchObject([{ verantwortlich: 'Erika', ursacheEntfallen: false }])
  })

  it('T-P07: zweimal hintereinander → keine Doppelten, beim zweiten Mal unverändert', () => {
    const einmal = abgleich({ ...nurNicht('A02', 'A04'), aussen: aussen([befund('spf', 'warnung', 'SPF-04')]) })
    const zweimal = gleicheMassnahmenAb(K, einmal, SPAETER, zaehler('z'))
    expect(zweimal).toBe(einmal)
    expect(zweimal.massnahmen).toHaveLength(3)
  })

  it('aktualisiert Titel und Priorität, die Frist bleibt', () => {
    const p = abgleich(nurNicht('A04'))
    const alt = { ...p, massnahmen: [{ ...p.massnahmen[0], titel: 'Alter Titel', prioritaet: 3 as const, frist: '2026-12-24' }] }
    expect(gleicheMassnahmenAb(K, alt, SPAETER).massnahmen[0]).toMatchObject({ titel: 'Notfallplan für IT-Ausfälle und Angriffe', prioritaet: 2, frist: '2026-12-24' })
  })

  it('T-P08: übernommene, unberührte Maßnahme aus Befund (hsts, www.example.com): ohne Außenprüfung bleibt / Lauf mit Befund fehler bleibt / Lauf mit Befund ok entfernt', () => {
    const uebernommen: Massnahme = {
      id: 'm-alt',
      quelle: { art: 'befund', pruefId: 'hsts', ziel: 'www.example.com' },
      titel: 'HSTS fehlt (www.example.com)',
      prioritaet: 2,
      prioritaetManuell: null,
      begruendungManuell: '',
      frist: '2027-01-10',
      verantwortlich: '',
      status: 'offen',
      notiz: '',
      erledigtAm: null,
      ursacheEntfallen: false,
    }
    const wiederholung = { ...nurNicht(), massnahmen: [uebernommen], aussen: null }
    expect(abgleich(wiederholung).massnahmen).toEqual([uebernommen])
    const mitFehler = { ...wiederholung, aussen: aussen([befund('hsts', 'fehler', 'WEB-14', 'www.example.com')]) }
    expect(abgleich(mitFehler).massnahmen).toEqual([uebernommen])
    const nichtGeprueft = { ...wiederholung, aussen: aussen([befund('hsts', 'nicht_geprueft', 'BROWSER-01', 'example.com')]) }
    expect(abgleich(nichtGeprueft).massnahmen).toEqual([uebernommen])
    const abgebrochen = { ...wiederholung, aussen: aussen([befund('hsts', 'ok', 'HSTS-04', 'www.example.com')], true) }
    expect(abgleich(abgebrochen).massnahmen).toEqual([uebernommen])
    const behoben = { ...wiederholung, aussen: aussen([befund('hsts', 'ok', 'HSTS-04', 'www.example.com')]) }
    expect(abgleich(behoben).massnahmen).toEqual([])
    // bearbeitet: bleibt, Ursache entfallen
    const bearbeitet = { ...behoben, massnahmen: [{ ...uebernommen, notiz: 'Hoster angeschrieben' }] }
    expect(abgleich(bearbeitet).massnahmen).toEqual([{ ...uebernommen, notiz: 'Hoster angeschrieben', ursacheEntfallen: true }])
  })

  it('läuft beim Abschließen und nach jeder Außenprüfung', () => {
    const r = abschliessen(K, nurNicht('A02'), JETZT, zaehler('a'))
    expect(r.ok && r.pruefung.massnahmen.map((m) => [m.id, m.titel.slice(0, 11)])).toEqual([['a-1', 'Beschäftigt']])
    const p = setzeAussenpruefung(K, nurNicht(), aussen([befund('dmarc', 'warnung', 'DMARC-01')]), JETZT, zaehler('b'))
    expect(p.massnahmen.map((m) => [m.id, m.titel])).toEqual([['b-1', 'Kein DMARC-Eintrag (example.com)']])
  })
})

describe('Maßnahme bearbeiten', () => {
  it('„erledigt“ setzt das Erledigungsdatum, ein anderer Status löscht es; ungültige Fristen bleiben unbeachtet', () => {
    const p = abgleich(nurNicht('A04'))
    const id = p.massnahmen[0].id
    const erledigt = aendereMassnahme(p, id, { status: 'erledigt' }, SPAETER)
    expect(erledigt.massnahmen[0]).toMatchObject({ status: 'erledigt', erledigtAm: '2026-11-20' })
    expect(aendereMassnahme(erledigt, id, { status: 'in_arbeit' }, SPAETER).massnahmen[0]).toMatchObject({ status: 'in_arbeit', erledigtAm: null })
    expect(aendereMassnahme(p, id, { frist: '2027-02-30' }, SPAETER)).toBe(p)
    expect(aendereMassnahme(p, id, { frist: '2027-03-01', notiz: 'Vorlage geschickt' }, SPAETER).massnahmen[0]).toMatchObject({ frist: '2027-03-01', notiz: 'Vorlage geschickt' })
  })

  it('bleibt nach dem Abschluss bearbeitbar', () => {
    const r = abschliessen(K, nurNicht('A04'), JETZT, zaehler())
    if (!r.ok) throw new Error('nicht abgeschlossen')
    const id = r.pruefung.massnahmen[0].id
    expect(aendereMassnahme(r.pruefung, id, { status: 'erledigt' }, SPAETER).massnahmen[0].status).toBe('erledigt')
  })
})
