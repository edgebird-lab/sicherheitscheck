import { expect, it } from 'vitest'
import { testnetz } from '../netz/testnetz'
import { aussenpruefung } from '../pruefung/ablauf'
import { beispielZone } from '../testhilfen/netz'
import { KATALOG } from '../katalog'
import { pruefeDatenbestand } from '../speicher/pruefen'
import { HEUTE } from '../testhilfen/pruefung'
import { beispielBetrieb } from './beispiel'
import { berechneErgebnis } from './bewertung'
import { sortiereMassnahmen, zaehleMassnahmen } from './massnahmen'
import { pruefeAbschluss } from './operationen'
import { FORMAT_VERSION } from './typen'

it('Beispielbetrieb: 3 TOP und 15 Basis erfüllt → 18 von 37 Punkten (49 %), wie in der README', () => {
  const b = beispielBetrieb(KATALOG, HEUTE)
  const p = b.pruefungen[0]
  const zaehle = (top: boolean, bewertung: string) => KATALOG.anforderungen.filter((a) => a.top === top && p.antworten[a.id].bewertung === bewertung).length
  expect([zaehle(true, 'erfuellt'), zaehle(true, 'nicht_erfuellt'), zaehle(false, 'erfuellt'), zaehle(false, 'nicht_erfuellt')]).toEqual([3, 2, 15, 7])
  // 3 × 3 − 2 × 3 + 15 = 18; 18 / 37 = 0,486 → 49 %
  expect(p.ergebnis).toMatchObject({ rohpunkte: 18, statuswert: 18, maximal: 37, prozent: 49, ohneGeschaeftsfuehrung: false })
  expect(p.ergebnis).toEqual(berechneErgebnis(KATALOG, p))
  expect(p.status).toBe('abgeschlossen')
  expect(p.datum).toBe('2026-10-14')
})

it('Beispielbetrieb ist ein gültiger, vollständiger Datenbestand', () => {
  const b = beispielBetrieb(KATALOG, HEUTE)
  const daten = { formatVersion: FORMAT_VERSION, einstellungen: { berater: { name: '', firma: '', email: '', telefon: '' }, dohAnbieter: 'cloudflare', darstellung: 'system', letzteSicherung: null }, betriebe: [b] }
  expect(pruefeDatenbestand(daten, KATALOG).meldungen).toEqual([])
  expect(pruefeAbschluss(KATALOG, b.pruefungen[0]).fehler).toEqual([])
  expect(b.domain).toBe('example.com')
})

it('die fiktive Außenprüfung entspricht dem, was der Ablauf aus der Beispielzone ermittelt', async () => {
  const p = beispielBetrieb(KATALOG, HEUTE).pruefungen[0]
  const r = await aussenpruefung(
    { domain: 'example.com', dkimSelektoren: [], dohAnbieter: 'cloudflare', bestaetigung: { name: 'Beraterin Beispiel', rolle: 'beauftragt', zugestimmt: true } },
    testnetz({ dns: beispielZone() }),
    { warte: async () => {} },
  )
  if (!r.ok) throw new Error(r.fehler)
  expect(p.aussen?.befunde).toEqual(r.aussen.befunde)
  expect(p.aussen?.protokoll.map((a) => [a.anfrage, a.ergebnis])).toEqual(r.aussen.protokoll.map((a) => [a.anfrage, a.ergebnis]))
  expect(p.aussen?.bestaetigung.text).toBe(r.aussen.bestaetigung.text)
  // am Tag vor dem Interview: keine Warnung W3
  expect(p.aussen?.gestartet.slice(0, 10)).toBe('2026-10-13')
  expect(pruefeAbschluss(KATALOG, p).warnungen).toEqual([])
})

it('Maßnahmen des Beispiels: 2 TOP, 7 Basis, 4 aus der Außenprüfung; eine erledigt, eine in Arbeit', () => {
  const p = beispielBetrieb(KATALOG, HEUTE).pruefungen[0]
  const sortiert = sortiereMassnahmen(KATALOG, p.massnahmen)
  expect(sortiert.map((m) => [m.prioritaet, m.quelle.art === 'anforderung' ? m.quelle.anforderungId : m.quelle.pruefId])).toEqual([
    [1, 'A02'],
    [1, 'A19'],
    [2, 'A04'],
    [2, 'A06'],
    [2, 'A09'],
    [2, 'A10'],
    [2, 'A14'],
    [2, 'A15'],
    [2, 'A24'],
    [2, 'spf'],
    [2, 'dmarc'],
    [3, 'dnssec'],
    [3, 'caa'],
  ])
  // Fristen ab dem Interview am 14.10.2026: +14, +90, +180 Tage
  expect(sortiert[0].frist).toBe('2026-10-28')
  expect(sortiert[2].frist).toBe('2027-01-12')
  expect(sortiert[12].frist).toBe('2027-04-12')
  expect(zaehleMassnahmen(p.massnahmen, HEUTE)).toEqual({ alle: 13, offen: 12, erledigt: 1, ueberfaellig: 2 })
  expect(p.massnahmen.find((m) => m.status === 'in_arbeit')).toMatchObject({ verantwortlich: 'Erika Beispiel', titel: 'Beschäftigte erkennen Phishing und Betrugsversuche' })
})
