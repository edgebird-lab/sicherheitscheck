import { describe, expect, it } from 'vitest'
import { PRUEF_IDS, REGEL_NICHT_PRUEFBAR } from '../pruefung/stufen'
import { mitDomain, REGELTEXTE, regeltext } from './regeltexte'

const PRAEFIX: Record<string, string> = { MX: 'mx', SPF: 'spf', DMARC: 'dmarc', DKIM: 'dkim', STS: 'mta_sts', RPT: 'tls_rpt', DNSSEC: 'dnssec', CAA: 'caa' }

describe('Regeltexte (6.5)', () => {
  it('jede Regel steht genau einmal da, mit Titel und Erklärung', () => {
    const regeln = REGELTEXTE.map((r) => r.regel)
    expect(new Set(regeln).size).toBe(regeln.length)
    for (const r of REGELTEXTE) {
      expect(r.titel.length, r.regel).toBeGreaterThan(3)
      expect(r.titel.length, r.regel).toBeLessThanOrEqual(60)
      expect(r.erklaerung.length, r.regel).toBeGreaterThan(20)
    }
  })

  it('eine Maßnahme gibt es genau bei hinweis, warnung und kritisch', () => {
    for (const r of REGELTEXTE) {
      const braucht = r.stufe === 'hinweis' || r.stufe === 'warnung' || r.stufe === 'kritisch'
      expect(r.massnahme !== null, r.regel).toBe(braucht)
    }
  })

  it('das Präfix passt zur Prüfung; jede DNS-Prüfung hat eine Regel für „nicht prüfbar“ mit Stufe fehler', () => {
    for (const r of REGELTEXTE) {
      const praefix = r.regel.split('-')[0]
      if (praefix === 'BROWSER') expect(r.pruefId).toBeNull()
      else expect(r.pruefId, r.regel).toBe(PRAEFIX[praefix])
    }
    for (const [pruefId, regel] of Object.entries(REGEL_NICHT_PRUEFBAR)) {
      expect(regeltext(regel)).toMatchObject({ pruefId, stufe: 'fehler' })
    }
    expect(Object.keys(REGEL_NICHT_PRUEFBAR)).toEqual(PRUEF_IDS.slice(0, 8))
  })

  it('Stufen wie in den Tabellen der Spezifikation', () => {
    const stufen = Object.fromEntries(REGELTEXTE.map((r) => [r.regel, r.stufe]))
    expect(stufen).toMatchObject({
      'MX-01': 'fehler',
      'SPF-03': 'kritisch',
      'SPF-04': 'warnung',
      'SPF-09': 'hinweis',
      'DMARC-04': 'hinweis',
      'DMARC-05': 'warnung',
      'DMARC-11': 'info',
      'DKIM-05': 'warnung',
      'DKIM-06': 'hinweis',
      'STS-10': 'kritisch',
      'STS-11': 'nicht_geprueft',
      'RPT-02': 'hinweis',
      'DNSSEC-03': 'kritisch',
      'DNSSEC-04': 'fehler',
      'CAA-01': 'hinweis',
      'CAA-04': 'warnung',
      'BROWSER-01': 'nicht_geprueft',
    })
  })

  it('unbekannte Regeln sind ein Programmfehler; ‹Domain› wird ersetzt', () => {
    expect(() => regeltext('XYZ-99')).toThrow('Unbekannte Regel XYZ-99')
    expect(mitDomain('_smtp._tls.‹Domain›', 'firma.de')).toBe('_smtp._tls.firma.de')
  })
})
