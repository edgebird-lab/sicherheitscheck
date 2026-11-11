import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { HEUTE, JETZT, pruefungMit } from '../testhilfen/pruefung'
import { berechneErgebnis, istBeantwortet, istRelevant, punkte, relevanzMeldungen, wirksameBewertung } from './bewertung'
import { neuePruefung, neuerBetrieb, setzeVorfrage } from './operationen'
import type { Anforderung, Katalog } from './typen'

const K = KATALOG
const top = K.anforderungen.filter((a) => a.top)
const basis = K.anforderungen.filter((a) => !a.top)

describe('Statuswert (Spezifikation 9.1, Werte von Hand nachgerechnet)', () => {
  it('T-B01: alle erfüllt → 37 von 37, 100 %', () => {
    const e = berechneErgebnis(K, pruefungMit(K, () => 'erfuellt'))
    expect(e).toMatchObject({ rohpunkte: 37, statuswert: 37, maximal: 37, prozent: 100, topNichtErfuellt: [], nichtRelevant: [] })
    for (const t of Object.values(e.jeThema)) expect(t.anteil).toBe(1)
  })

  it('T-B02: alle nicht erfüllt → roh −15, 0 von 37, 0 %', () => {
    const e = berechneErgebnis(K, pruefungMit(K, () => 'nicht_erfuellt'))
    // 5 TOP × −3 = −15, 22 Basis × 0
    expect(e).toMatchObject({ rohpunkte: -15, statuswert: 0, maximal: 37, prozent: 0 })
    expect(e.topNichtErfuellt).toEqual(top.map((a) => a.id))
  })

  it('T-B03: nur die 5 TOP erfüllt → 15 von 37, 41 %', () => {
    // 15 / 37 = 0,4054 → 41 %
    const e = berechneErgebnis(K, pruefungMit(K, (a) => (a.top ? 'erfuellt' : 'nicht_erfuellt')))
    expect(e).toMatchObject({ rohpunkte: 15, statuswert: 15, prozent: 41 })
  })

  it('T-B04: nur die 22 Basis erfüllt → roh 22 − 15 = 7, 19 %', () => {
    // 7 / 37 = 0,1892 → 19 %
    const e = berechneErgebnis(K, pruefungMit(K, (a) => (a.top ? 'nicht_erfuellt' : 'erfuellt')))
    expect(e).toMatchObject({ rohpunkte: 7, statuswert: 7, prozent: 19 })
  })

  it('T-B05: alles außer einer TOP erfüllt → 31 von 37, 84 %', () => {
    // 4 × 3 + 22 − 3 = 31; 31 / 37 = 0,8378 → 84 %
    const e = berechneErgebnis(K, pruefungMit(K, (a) => (a.id === top[0].id ? 'nicht_erfuellt' : 'erfuellt')))
    expect(e).toMatchObject({ rohpunkte: 31, statuswert: 31, maximal: 37, prozent: 84, topNichtErfuellt: [top[0].id] })
  })

  it('T-B06: eine Basis nicht relevant, Rest erfüllt → 36 von 36, 100 %', () => {
    const begruendet = K.anforderungen.find((a) => a.relevanz.art === 'begruendet')!
    const e = berechneErgebnis(K, pruefungMit(K, (a) => (a.id === begruendet.id ? 'nicht_relevant' : 'erfuellt')))
    expect(e).toMatchObject({ rohpunkte: 36, statuswert: 36, maximal: 36, prozent: 100, nichtRelevant: [begruendet.id] })
  })

  it('T-B06 auch über eine Vorfrage', () => {
    const p = pruefungMit(K, () => 'erfuellt')
    const nachher = setzeVorfrage(p, K, 'wlan', false, JETZT)
    expect(berechneErgebnis(K, nachher)).toMatchObject({ statuswert: 36, maximal: 36, prozent: 100, nichtRelevant: ['A23'] })
  })

  it('T-B07: 24 von 37 → 65 % (64,86 gerundet)', () => {
    // 5 TOP (15) + 9 Basis = 24
    const erfuellt = new Set([...top, ...basis.slice(0, 9)].map((a) => a.id))
    const e = berechneErgebnis(K, pruefungMit(K, (a) => (erfuellt.has(a.id) ? 'erfuellt' : 'nicht_erfuellt')))
    expect(e).toMatchObject({ statuswert: 24, maximal: 37, prozent: 65 })
  })

  it('T-B08: alle offen zählen wie nicht erfüllt → roh −15, Statuswert 0', () => {
    const e = berechneErgebnis(K, pruefungMit(K, () => 'offen'))
    expect(e).toMatchObject({ rohpunkte: -15, statuswert: 0, maximal: 37, prozent: 0 })
  })

  it('prozent ist 0, wenn nichts relevant ist', () => {
    const leer: Katalog = { ...K, anforderungen: [] }
    expect(berechneErgebnis(leer, pruefungMit(leer, () => 'erfuellt'))).toMatchObject({ statuswert: 0, maximal: 0, prozent: 0 })
  })
})

describe('Themenbereiche', () => {
  const a = (id: string, thema: Anforderung['thema'], top: boolean, relevanz: Anforderung['relevanz'] = { art: 'immer' }): Anforderung => ({
    id,
    normNr: id,
    thema,
    top,
    titel: id,
    frage: `${id}?`,
    hilfe: '',
    massnahme: '',
    relevanz,
    grundschutz: [],
  })
  const testkatalog: Katalog = {
    ...K,
    vorfragen: [{ id: 'v', frage: 'Gibt es v?', hilfe: '' }],
    anforderungen: [
      a('T1', 'organisation', true),
      a('T2', 'organisation', false),
      a('T3', 'organisation', false),
      a('T4', 'systeme', false, { art: 'vorfrage', vorfrageId: 'v', relevantWenn: true }),
      a('T5', 'systeme', false, { art: 'vorfrage', vorfrageId: 'v', relevantWenn: true }),
    ],
  }

  it('T-B09: Thema mit 1 TOP nicht erfüllt und 2 Basis erfüllt → roh −1, maximal 5, anteil 0', () => {
    const p = pruefungMit(testkatalog, (x) => (x.id === 'T1' ? 'nicht_erfuellt' : 'erfuellt'))
    const e = berechneErgebnis(testkatalog, p)
    // −3 + 1 + 1 = −1; maximal 3 + 1 + 1 = 5; max(0, −1) / 5 = 0
    expect(e.jeThema.organisation).toEqual({ roh: -1, maximal: 5, anteil: 0 })
  })

  it('T-B10: Thema vollständig nicht relevant → anteil null', () => {
    const p = setzeVorfrage(pruefungMit(testkatalog, () => 'erfuellt'), testkatalog, 'v', false, JETZT)
    const e = berechneErgebnis(testkatalog, p)
    expect(e.jeThema.systeme).toEqual({ roh: 0, maximal: 0, anteil: null })
    expect(e.nichtRelevant).toEqual(['T4', 'T5'])
    // Themen ohne Anforderungen im Testkatalog
    expect(e.jeThema.patch.anteil).toBeNull()
  })

  it('anteil ist der Anteil an den Höchstpunkten des Themas', () => {
    const p = pruefungMit(K, (x) => (x.thema === 'datensicherung' && !x.top ? 'nicht_erfuellt' : 'erfuellt'))
    // Datensicherung: TOP 3 von 6 Punkten
    expect(berechneErgebnis(K, p).jeThema.datensicherung).toEqual({ roh: 3, maximal: 6, anteil: 0.5 })
  })
})

describe('Relevanz', () => {
  it('T-B11: Vorfrage auf „Nein“, dann zurück auf „Ja“', () => {
    const { pruefung } = neuePruefung(neuerBetrieb('Test', JETZT, 'b'), K, 'Robin', HEUTE, JETZT, 'p')
    const nein = setzeVorfrage(pruefung, K, 'fernzugriff', false, JETZT)
    const a24 = K.anforderungen.find((a) => a.id === 'A24')!
    expect(istRelevant(a24, nein)).toBe(false)
    expect(nein.antworten.A24).toEqual({
      bewertung: 'nicht_relevant',
      begruendung: 'Vorfrage „Greift jemand von außen auf Rechner oder Daten im Betrieb zu, etwa per Fernwartung oder VPN?“: Nein',
      nachweis: '',
      uebernommen: false,
    })
    expect(istBeantwortet(a24, nein)).toBe(true)

    const ja = setzeVorfrage(nein, K, 'fernzugriff', true, JETZT)
    expect(istRelevant(a24, ja)).toBe(true)
    expect(ja.antworten.A24).toEqual({ bewertung: 'offen', begruendung: '', nachweis: '', uebernommen: false })
    // andere Anforderungen bleiben unberührt
    expect(ja.antworten.A23).toEqual(pruefung.antworten.A23)
  })

  it('eine unbeantwortete Vorfrage lässt die Anforderung relevant', () => {
    const { pruefung } = neuePruefung(neuerBetrieb('Test', JETZT, 'b'), K, 'Robin', HEUTE, JETZT, 'p')
    const a23 = K.anforderungen.find((a) => a.id === 'A23')!
    expect(pruefung.vorfragen.wlan).toBeNull()
    expect(istRelevant(a23, pruefung)).toBe(true)
    // Ja und dann wieder unbeantwortet: bleibt relevant und unverändert
    const ja = setzeVorfrage(pruefung, K, 'wlan', true, JETZT)
    expect(setzeVorfrage(ja, K, 'wlan', null, JETZT).antworten.A23.bewertung).toBe('offen')
  })

  it('„Nein“ zurück auf „unbeantwortet“ öffnet die Anforderung wieder', () => {
    const { pruefung } = neuePruefung(neuerBetrieb('Test', JETZT, 'b'), K, 'Robin', HEUTE, JETZT, 'p')
    const nein = setzeVorfrage(pruefung, K, 'wlan', false, JETZT)
    expect(setzeVorfrage(nein, K, 'wlan', null, JETZT).antworten.A23.bewertung).toBe('offen')
  })

  it('T-B12: „nicht relevant“ bei Relevanz „immer“ zählt als offen und erzeugt eine Prüfmeldung', () => {
    const a01 = K.anforderungen.find((a) => a.id === 'A01')!
    const p = pruefungMit(K, (a) => (a.id === 'A01' ? 'nicht_relevant' : 'erfuellt'))
    expect(istRelevant(a01, p)).toBe(true)
    expect(wirksameBewertung(a01, p)).toBe('offen')
    expect(punkte(a01, p)).toBe(-3)
    // 37 − 3 (A01 fehlt) − 3 (zählt negativ) = 31
    expect(berechneErgebnis(K, p)).toMatchObject({ statuswert: 31, maximal: 37, topNichtErfuellt: ['A01'], nichtRelevant: [] })
    expect(relevanzMeldungen(K, p)).toEqual([{ code: 'R1', anforderungId: 'A01', text: 'Anforderung 1.1: „Nicht relevant“ ist hier nicht vorgesehen; die Antwort zählt als offen.' }])
  })

  it('„nicht relevant“ bei Relevanz „begründet“ ist erlaubt und erzeugt keine Meldung', () => {
    const p = pruefungMit(K, (a) => (a.id === 'A11' ? 'nicht_relevant' : 'erfuellt'))
    expect(relevanzMeldungen(K, p)).toEqual([])
  })
})

describe('Geschäftsführung', () => {
  it('ohneGeschaeftsfuehrung, wenn niemand mit dieser Rolle teilnimmt', () => {
    const mit = pruefungMit(K, () => 'erfuellt')
    expect(berechneErgebnis(K, mit).ohneGeschaeftsfuehrung).toBe(false)
    const ohne = { ...mit, teilnehmende: [{ name: 'Max Muster', rolle: 'it_extern' as const }] }
    expect(berechneErgebnis(K, ohne).ohneGeschaeftsfuehrung).toBe(true)
  })
})
