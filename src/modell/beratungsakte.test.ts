import { describe, expect, it } from 'vitest'
import { dateinameBeratungsakte, leseBeratungsakte, pruefeBeratungsakte, serialisiereBeratungsakte, type Beratungsakte } from '../beratungsakte/beratungsakte'
import { SCHEMA } from '../beratungsakte/schema'
import { KATALOG } from '../katalog'
import { befund } from '../pruefung/stufen'
import { HEUTE, JETZT as TEST_JETZT, pruefungMit } from '../testhilfen/pruefung'
import { beispielBetrieb } from './beispiel'
import { ANFORDERUNG_IN_AKTE, APP_KENNUNG, beratungsakteAusPruefung, mandantAusBetrieb, PRIORITAET_IN_AKTE, STUFE_IN_AKTE } from './beratungsakte'
import { gleicheMassnahmenAb, setzePrioritaet } from './massnahmen'
import { neuePruefung, neuerBetrieb } from './operationen'
import type { Betrieb, Pruefung } from './typen'

// Testdaten als Text über Vite (src hat keine Node-Typen)
const TESTDATEN: Record<string, string> = import.meta.glob<string>('/testdaten/beratungsakte/**/*.json', { query: '?raw', import: 'default', eager: true })
const SCHEMA_DATEI = Object.values(import.meta.glob<string>('/src/beratungsakte/beratungsakte-v1.schema.json', { query: '?raw', import: 'default', eager: true }))[0]
const PAKET = Object.values(import.meta.glob<string>('/package.json', { query: '?raw', import: 'default', eager: true }))[0]
const umgebung = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}

// feste Zeit der Beispieldatei; der Beispielbetrieb selbst mit HEUTE wie in beispiel.test.ts (Interview 14.10.2026)
const JETZT = new Date(2026, 10, 13, 12, 0, 0)

function beispiel(): { betrieb: Betrieb; pruefung: Pruefung } {
  const betrieb = beispielBetrieb(KATALOG, HEUTE)
  return { betrieb, pruefung: betrieb.pruefungen[0] }
}

function akteDesBeispiels(): Beratungsakte {
  const { betrieb, pruefung } = beispiel()
  return beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: mandantAusBetrieb(betrieb) }, jetzt: JETZT })
}

function gueltigOhneHinweise(akte: Beratungsakte) {
  const ergebnis = pruefeBeratungsakte(JSON.parse(serialisiereBeratungsakte(akte)))
  expect(ergebnis.fehler).toEqual([])
  expect(ergebnis.hinweise).toEqual([])
  expect(ergebnis.gueltig).toBe(true)
}

const ns = (x: { erweiterungen?: Record<string, Record<string, unknown>> } | undefined) => x?.erweiterungen?.[APP_KENNUNG]
const wert = (akte: Beratungsakte, kennung: string) => akte.kennzahlen.find((k) => k.kennung === kennung)?.wert

describe('Beratungsakte aus dem Beispielbetrieb', () => {
  it('ist gültig, ohne Hinweise, mit App, Version, Art und Stand = Tag des Interviews', () => {
    const akte = akteDesBeispiels()
    gueltigOhneHinweise(akte)
    const paket = JSON.parse(PAKET) as { version: string }
    expect(akte.erzeugtVon).toEqual({ app: 'sicherheitscheck', name: 'Sicherheitscheck', version: paket.version })
    expect(akte.erzeugtAm).toMatch(/^2026-11-13T12:00:00[+-]\d\d:\d\d$/)
    expect(akte.mandant).toEqual({ name: 'Tischlerei Beispiel GmbH (fiktiv)' })
    expect(akte.analyse).toEqual({ art: 'sicherheitscheck', titel: 'Sicherheitscheck Tischlerei Beispiel GmbH (fiktiv), Prüfung 1', stand: '2026-10-14' })
    expect(ns(akte)).toEqual({
      pruefungNr: 1,
      status: 'abgeschlossen',
      katalogVersion: KATALOG.version,
      katalogAbgeglichen: false,
      ohneGeschaeftsfuehrung: false,
      aussenpruefung: { domain: 'example.com', modus: 'browser', datum: '2026-10-13', abgebrochen: false },
    })
  })

  it('Kennzahlen: 18 von 37 Punkten (49 %), Themen 2/10, 3/5, 4/6, 5/5, −1/5, 5/6 wie in der README', () => {
    const akte = akteDesBeispiels()
    expect(akte.kennzahlen.map((k) => [k.kennung, k.wert, k.einheit])).toEqual([
      ['statuswert', 18, 'Punkte'],
      ['statuswert-maximal', 37, 'Punkte'],
      ['statuswert-prozent', 49, '%'],
      ['thema-organisation', 20, '%'],
      ['thema-identitaet', 60, '%'],
      ['thema-datensicherung', 67, '%'],
      ['thema-patch', 100, '%'],
      ['thema-schadprogramme', 0, '%'],
      ['thema-systeme', 83, '%'],
      ['anforderungen-nicht-erfuellt', 9, 'Anzahl'],
      ['top-nicht-erfuellt', 2, 'Anzahl'],
      ['anforderungen-nicht-relevant', 0, 'Anzahl'],
      // Außenprüfung je Stufe wie in der Auswertung: 2 Warnungen, 2 Hinweise, 4 Informationen, 13 nur im Programm
      ['aussen-warnung', 2, 'Anzahl'],
      ['aussen-hinweis', 2, 'Anzahl'],
      ['aussen-info', 4, 'Anzahl'],
      ['aussen-nicht-geprueft', 13, 'Anzahl'],
      // 13 Maßnahmen: eine erledigt, 12 offen, 2 überfällig (Frist 28.10.2026)
      ['massnahmen-offen', 12, 'Anzahl'],
      ['massnahmen-erledigt', 1, 'Anzahl'],
      ['massnahmen-ueberfaellig', 2, 'Anzahl'],
    ])
    expect(akte.kennzahlen.find((k) => k.kennung === 'thema-schadprogramme')).toMatchObject({ name: 'Themenbereich 5: Schutz vor Schadprogrammen', erweiterungen: { sicherheitscheck: { punkte: -1, maximal: 5 } } })
    expect(ns(akte.kennzahlen[0])).toEqual({ rohpunkte: 18 })
    expect(ns(akte.kennzahlen.find((k) => k.kennung === 'top-nicht-erfuellt'))).toEqual({ normNr: ['1.2', '5.1'] })
    expect(akte.kennzahlen.find((k) => k.kennung === 'aussen-warnung')?.name).toBe('Außenprüfung: Warnung')
  })

  it('Befunde: 9 nicht erfüllte Anforderungen (TOP hoch, Basis mittel) und 4 Befunde der Außenprüfung', () => {
    const akte = akteDesBeispiels()
    expect(akte.befunde.map((b) => [b.kennung, b.schwere])).toEqual([
      ['anforderung:A02', 'hoch'],
      ['anforderung:A04', 'mittel'],
      ['anforderung:A06', 'mittel'],
      ['anforderung:A09', 'mittel'],
      ['anforderung:A10', 'mittel'],
      ['anforderung:A14', 'mittel'],
      ['anforderung:A15', 'mittel'],
      ['anforderung:A19', 'hoch'],
      ['anforderung:A24', 'mittel'],
      ['aussen:spf:example.com', 'mittel'],
      ['aussen:dmarc:example.com', 'mittel'],
      ['aussen:dnssec:example.com', 'niedrig'],
      ['aussen:caa:example.com', 'niedrig'],
    ])
    const a02 = KATALOG.anforderungen.find((a) => a.id === 'A02')!
    expect(akte.befunde[0]).toEqual({
      kennung: 'anforderung:A02',
      schwere: 'hoch',
      text: `Nicht erfüllt (TOP-Anforderung): ${a02.titel}. Im Interview: bisher keine Schulung; Phishing nur aus den Medien bekannt; keine Meldestelle festgelegt.`,
      fundstelle: `Interview, Anforderung ${a02.normNr} (Organisation & Sensibilisierung)`,
      erweiterungen: { sicherheitscheck: { anforderung: 'A02', normNr: a02.normNr, thema: 'organisation', top: true } },
    })
    expect(akte.befunde[9]).toMatchObject({
      text: expect.stringMatching(/^SPF: SPF ohne klare Regel für fremde Server\. /),
      fundstelle: 'Außenprüfung, E-Mail: SPF · example.com',
      erweiterungen: { sicherheitscheck: { pruefId: 'spf', ziel: 'example.com', stufe: 'warnung', regel: 'SPF-04', messwert: 'v=spf1 mx a ?all (2 DNS-Abfragen)' } },
    })
    expect(akte.befunde[11].fundstelle).toBe('Außenprüfung, Domain: DNSSEC · example.com')
    // Befunde ohne Handlungsbedarf (info) und nicht geprüfte Website-Teile sind keine Befunde
    expect(akte.befunde.some((b) => /mx|dkim|mta_sts|tls_rpt|https/.test(b.kennung))).toBe(false)
  })

  it('Maßnahmen: der Maßnahmenplan in seiner Reihenfolge, mit Priorität, Frist und Bezug auf den Befund', () => {
    const akte = akteDesBeispiels()
    expect(akte.massnahmen.map((m) => [m.kennung, m.prioritaet, m.frist, m.befunde])).toEqual([
      ['anforderung:A02', 'hoch', '2026-10-28', ['anforderung:A02']],
      ['anforderung:A19', 'hoch', '2026-10-28', ['anforderung:A19']],
      ['anforderung:A04', 'mittel', '2027-01-12', ['anforderung:A04']],
      ['anforderung:A06', 'mittel', '2027-01-12', ['anforderung:A06']],
      ['anforderung:A09', 'mittel', '2027-01-12', ['anforderung:A09']],
      ['anforderung:A10', 'mittel', '2027-01-12', ['anforderung:A10']],
      ['anforderung:A14', 'mittel', '2027-01-12', ['anforderung:A14']],
      ['anforderung:A15', 'mittel', '2027-01-12', ['anforderung:A15']],
      ['anforderung:A24', 'mittel', '2027-01-12', ['anforderung:A24']],
      ['aussen:spf:example.com', 'mittel', '2027-01-12', ['aussen:spf:example.com']],
      ['aussen:dmarc:example.com', 'mittel', '2027-01-12', ['aussen:dmarc:example.com']],
      ['aussen:dnssec:example.com', 'niedrig', '2027-04-12', ['aussen:dnssec:example.com']],
      ['aussen:caa:example.com', 'niedrig', '2027-04-12', ['aussen:caa:example.com']],
    ])
    expect(akte.massnahmen.every((m) => m.aufwand === 'nicht geschätzt')).toBe(true)
    const a02 = KATALOG.anforderungen.find((a) => a.id === 'A02')!
    expect(akte.massnahmen[0].text).toBe(`Beschäftigte erkennen Phishing und Betrugsversuche. ${a02.massnahme}`)
    expect(ns(akte.massnahmen[0])).toEqual({ prioritaet: 1, prioritaetText: 'Sofort', status: 'in_arbeit', verantwortlich: 'Erika Beispiel' })
    // A14 ist erledigt (zehn Tage vor HEUTE)
    expect(akte.massnahmen[6].text).toMatch(/ Bereits erledigt am 01\.11\.2026\.$/)
    expect(ns(akte.massnahmen[6])).toMatchObject({ status: 'erledigt', erledigtAm: '2026-11-01', verantwortlich: 'IT-Service Muster' })
    expect(ns(akte.massnahmen[9])).toEqual({ prioritaet: 2, prioritaetText: 'Zeitnah', status: 'offen', verantwortlich: 'IT-Service Muster' })
    // jede Maßnahme verweist auf einen Befund der Akte
    const kennungen = new Set(akte.befunde.map((b) => b.kennung))
    expect(akte.massnahmen.every((m) => m.befunde.length === 1 && kennungen.has(m.befunde[0]))).toBe(true)
  })
})

describe('Abbildung der Stufen', () => {
  it('Tabellen: Anforderungen, Stufen der Außenprüfung und Prioritäten', () => {
    expect(ANFORDERUNG_IN_AKTE).toEqual({ top: 'hoch', basis: 'mittel' })
    expect(STUFE_IN_AKTE).toEqual({ kritisch: 'kritisch', warnung: 'mittel', hinweis: 'niedrig', fehler: 'hinweis' })
    expect(PRIORITAET_IN_AKTE).toEqual({ 1: 'hoch', 2: 'mittel', 3: 'niedrig' })
  })

  it('jede Stufe der Außenprüfung: kritisch, warnung, hinweis und nicht prüfbar werden Befunde; ok, info und nicht geprüft nicht', () => {
    const { betrieb, pruefung } = beispiel()
    const D = 'example.com'
    const befunde = [
      befund('mx', D, ['MX-03'], ''), // info
      befund('spf', D, ['SPF-03'], ''), // kritisch
      befund('dmarc', D, ['DMARC-01'], ''), // warnung
      befund('dkim', D, ['DKIM-00'], ''), // fehler (nicht prüfbar)
      befund('dnssec', D, ['DNSSEC-02'], ''), // hinweis
      befund('caa', D, ['CAA-02'], ''), // ok
      befund('https_erreichbar', D, ['BROWSER-01'], ''), // nicht geprüft
    ]
    expect(befunde.map((b) => b.stufe)).toEqual(['info', 'kritisch', 'warnung', 'fehler', 'hinweis', 'ok', 'nicht_geprueft'])
    const p = gleicheMassnahmenAb(KATALOG, { ...pruefung, aussen: { ...pruefung.aussen!, befunde } }, TEST_JETZT)
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung: p, mandant: { name: 'M' }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    expect(akte.befunde.filter((b) => b.kennung.startsWith('aussen:')).map((b) => [b.kennung, ns(b)?.stufe, b.schwere])).toEqual([
      ['aussen:spf:example.com', 'kritisch', 'kritisch'],
      ['aussen:dmarc:example.com', 'warnung', 'mittel'],
      ['aussen:dkim:example.com', 'fehler', 'hinweis'],
      ['aussen:dnssec:example.com', 'hinweis', 'niedrig'],
    ])
    // Maßnahmen gibt es nur ab Stufe hinweis; die CAA-Maßnahme des Beispiels widerlegt der Lauf mit „ok“. Kritisch → Priorität hoch, warnung → mittel, hinweis → niedrig
    const aussenMassnahmen = akte.massnahmen.filter((m) => m.kennung.startsWith('aussen:'))
    expect(aussenMassnahmen.map((m) => [m.kennung, m.prioritaet, m.befunde])).toEqual([
      ['aussen:spf:example.com', 'hoch', ['aussen:spf:example.com']],
      ['aussen:dmarc:example.com', 'mittel', ['aussen:dmarc:example.com']],
      ['aussen:dnssec:example.com', 'niedrig', ['aussen:dnssec:example.com']],
    ])
    expect(akte.kennzahlen.filter((k) => k.kennung?.startsWith('aussen-')).map((k) => [k.name, k.wert])).toEqual([
      ['Außenprüfung: kritisch', 1],
      ['Außenprüfung: Warnung', 1],
      ['Außenprüfung: Hinweis', 1],
      ['Außenprüfung: nicht prüfbar', 1],
      ['Außenprüfung: Information', 1],
      ['Außenprüfung: in Ordnung', 1],
      ['Außenprüfung: nicht geprüft', 1],
    ])
  })

  it('Priorität von Hand geht vor; die automatische steht im Namensraum', () => {
    const { betrieb, pruefung } = beispiel()
    const m = pruefung.massnahmen.find((x) => x.quelle.art === 'anforderung' && x.quelle.anforderungId === 'A24')!
    const r = setzePrioritaet(pruefung, m.id, 3, 'Fernwartung wird ohnehin im Frühjahr ersetzt', TEST_JETZT)
    if (!r.ok) throw new Error(r.fehler)
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung: r.pruefung, mandant: { name: 'M' }, jetzt: JETZT })
    const a24 = akte.massnahmen.find((x) => x.kennung === 'anforderung:A24')!
    expect(a24.prioritaet).toBe('niedrig')
    expect(ns(a24)).toMatchObject({ prioritaet: 3, prioritaetText: 'Geplant', prioritaetAutomatisch: 2, begruendungPrioritaet: 'Fernwartung wird ohnehin im Frühjahr ersetzt' })
    // nach Priorität sortiert wie im Maßnahmenplan: A24 jetzt hinter den Maßnahmen mit Priorität 2
    expect(akte.massnahmen.map((x) => x.prioritaet).join(',')).toBe('hoch,hoch,mittel,mittel,mittel,mittel,mittel,mittel,mittel,mittel,niedrig,niedrig,niedrig')
  })
})

describe('Mandant, Dateiname und Grenzfälle', () => {
  it('belegt den Mandanten mit dem Namen des Betriebs vor', () => {
    expect(mandantAusBetrieb(beispiel().betrieb)).toBe('Tischlerei Beispiel GmbH (fiktiv)')
    expect(mandantAusBetrieb({ name: '  Bäckerei Probe ' })).toBe('Bäckerei Probe')
  })

  it('Dateiname mit Umlauten und Mandantennummer', () => {
    const { betrieb, pruefung } = beispiel()
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: ' Bäckerei Groß & Söhne GbR ', kennung: ' K-0815 ' }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    expect(akte.mandant).toEqual({ name: 'Bäckerei Groß & Söhne GbR', kennung: 'K-0815' })
    expect(dateinameBeratungsakte(akte)).toBe('Bäckerei-Groß-&-Söhne-GbR-sicherheitscheck-2026-11-13.beratungsakte.json')
    expect(dateinameBeratungsakte(akteDesBeispiels())).toBe('Tischlerei-Beispiel-GmbH-(fiktiv)-sicherheitscheck-2026-11-13.beratungsakte.json')
  })

  it('leere Mandantennummer fehlt in der Akte', () => {
    const { betrieb, pruefung } = beispiel()
    expect(beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: 'M', kennung: '  ' }, jetzt: JETZT }).mandant).toEqual({ name: 'M' })
  })

  it('eine neue, leere Prüfung (Entwurf ohne Antworten und Außenprüfung) ergibt eine gültige Akte', () => {
    const b0 = neuerBetrieb('Bäckerei Probe', TEST_JETZT, 'b-1')
    const { betrieb, pruefung } = neuePruefung(b0, KATALOG, '', '', TEST_JETZT, 'p-1')
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: mandantAusBetrieb(betrieb) }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    expect(akte.analyse).toEqual({ art: 'sicherheitscheck', titel: 'Sicherheitscheck Bäckerei Probe, Prüfung 1 (Entwurf)', stand: '2026-11-13' })
    expect(akte.befunde).toEqual([])
    expect(akte.massnahmen).toEqual([])
    expect(wert(akte, 'statuswert')).toBe(0)
    expect(akte.kennzahlen.some((k) => k.kennung?.startsWith('aussen-'))).toBe(false)
    expect(ns(akte)).not.toHaveProperty('aussenpruefung')
  })

  it('Entwurf mit Antworten: Ergebnis wie im Bericht berechnet; Themen ohne Höchstwert sind „nicht bewertet“', () => {
    // alle Anforderungen nicht relevant, wo erlaubt; sonst erfüllt
    const p = pruefungMit(KATALOG, (a) => (a.relevanz.art === 'begruendet' ? 'nicht_relevant' : 'erfuellt'))
    const betrieb = { ...neuerBetrieb('Testbetrieb', TEST_JETZT, 'b-1'), pruefungen: [p] }
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung: p, mandant: { name: 'M' }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    expect(akte.befunde).toEqual([])
    expect(wert(akte, 'anforderungen-nicht-relevant')).toBeGreaterThan(0)
    for (const k of akte.kennzahlen.filter((x) => x.kennung?.startsWith('thema-'))) {
      if (k.wert === 'nicht bewertet') expect(k.einheit).toBe('')
      else expect(k.einheit).toBe('%')
    }
  })

  it('lehnt einen leeren Mandanten ab', () => {
    const { betrieb, pruefung } = beispiel()
    expect(() => beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: '' }, jetzt: JETZT })).toThrow('Bitte den Mandanten angeben.')
    expect(() => beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: '   ' }, jetzt: JETZT })).toThrow('Bitte den Mandanten angeben.')
  })

  it('lange Ziele (DKIM-Selektor) ergeben gültige, eindeutige Kennungen höchstens 64 Zeichen', () => {
    const { betrieb, pruefung } = beispiel()
    const lang = `${'s'.repeat(60)}._domainkey.example.com`
    const befunde = [befund('dkim', `${lang}`, ['DKIM-02'], ''), befund('dkim', `${lang}.x`, ['DKIM-02'], '')]
    const p = gleicheMassnahmenAb(KATALOG, { ...pruefung, aussen: { ...pruefung.aussen!, befunde } }, TEST_JETZT)
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung: p, mandant: { name: 'M' }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    const dkim = akte.befunde.filter((b) => b.kennung.startsWith('aussen:dkim'))
    expect(dkim).toHaveLength(2)
    expect(new Set(dkim.map((b) => b.kennung)).size).toBe(2)
    expect(dkim.every((b) => b.kennung.length <= 64)).toBe(true)
  })

  it('Maßnahme aus einem Befund der Vorgängerprüfung (ohne neuen Lauf) hat keinen Bezug', () => {
    const { betrieb, pruefung } = beispiel()
    const ohneLauf = { ...pruefung, aussen: null }
    const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung: ohneLauf, mandant: { name: 'M' }, jetzt: JETZT })
    gueltigOhneHinweise(akte)
    expect(akte.massnahmen.find((m) => m.kennung === 'aussen:spf:example.com')?.befunde).toEqual([])
    expect(akte.befunde.some((b) => b.kennung.startsWith('aussen:'))).toBe(false)
  })
})

describe('Kopie der Bibliothek (src/beratungsakte)', () => {
  const dateien = (art: string) => Object.entries(TESTDATEN).filter(([pfad]) => pfad.startsWith(`/testdaten/beratungsakte/${art}/`))

  it('liest alle gültigen Beispiele', () => {
    expect(dateien('gueltig').length).toBeGreaterThan(0)
    for (const [pfad, text] of dateien('gueltig')) expect(leseBeratungsakte(text).ok, pfad).toBe(true)
  })

  it('lehnt alle ungültigen Beispiele ab', () => {
    expect(dateien('ungueltig').length).toBeGreaterThan(0)
    for (const [pfad, text] of dateien('ungueltig')) expect(leseBeratungsakte(text).ok, pfad).toBe(false)
  })

  it('meldet eine neuere Hauptversion', () => {
    const r = leseBeratungsakte(TESTDATEN['/testdaten/beratungsakte/ungueltig/neuere-hauptversion.json'])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fehler.map((f) => f.code)).toContain('neuere-hauptversion')
  })

  it('schema.ts entspricht der Schema-Datei', () => {
    expect(SCHEMA).toEqual(JSON.parse(SCHEMA_DATEI))
  })
})

// Mit BERATUNGSAKTE_AUSGABE=<Ordner> schreibt der Test die Akte des Beispielbetriebs dorthin (Beispieldatei des Formats).
it.runIf(!!umgebung.BERATUNGSAKTE_AUSGABE)('schreibt die Akte des Beispielbetriebs', async () => {
  const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { mkdirSync(p: string, o: { recursive: boolean }): void; writeFileSync(p: string, t: string, k: 'utf8'): void }
  const ziel = umgebung.BERATUNGSAKTE_AUSGABE!.replace(/[/\\]+$/, '')
  const akte = akteDesBeispiels()
  fs.mkdirSync(ziel, { recursive: true })
  fs.writeFileSync(`${ziel}/${dateinameBeratungsakte(akte)}`, serialisiereBeratungsakte(akte), 'utf8')
})
