import { expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { pruefeDatenbestand } from '../speicher/pruefen'
import { HEUTE } from '../testhilfen/pruefung'
import { beispielBetrieb } from './beispiel'
import { berechneErgebnis } from './bewertung'
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
