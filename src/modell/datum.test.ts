import { describe, expect, it } from 'vitest'
import { datumDeutsch, heuteLokal, istDatum, istZeitpunkt, plusTage, tageZwischen } from './datum'

describe('Kalendertage', () => {
  it('rechnet Fristen wie in Spezifikation 6.8 (von Hand nachgerechnet)', () => {
    // November hat 30 Tage: 11 + 14 = 25
    expect(plusTage('2026-11-11', 14)).toBe('2026-11-25')
    // 19 Tage bis Monatsende November, 31 Dezember, 31 Januar = 81, dann 9 Tage Februar
    expect(plusTage('2026-11-11', 90)).toBe('2027-02-09')
    // + 180: 2027-02-09 + 90 = 2027-05-10 (Feb 19 + März 31 + April 30 = 80, + 10)
    expect(plusTage('2026-11-11', 180)).toBe('2027-05-10')
  })

  it('verschiebt über die Zeitumstellung keinen Tag', () => {
    // In Deutschland endet die Sommerzeit am 25.10.2026
    expect(plusTage('2026-10-24', 2)).toBe('2026-10-26')
    expect(plusTage('2027-03-27', 2)).toBe('2027-03-29')
    expect(tageZwischen('2026-10-24', '2026-10-26')).toBe(2)
  })

  it('kennt Schaltjahre', () => {
    expect(plusTage('2028-02-28', 1)).toBe('2028-02-29')
    expect(plusTage('2027-02-28', 1)).toBe('2027-03-01')
    expect(istDatum('2028-02-29')).toBe(true)
    expect(istDatum('2027-02-29')).toBe(false)
  })

  it('prüft die Form', () => {
    expect(istDatum('2026-11-11')).toBe(true)
    expect(istDatum('2026-13-01')).toBe(false)
    expect(istDatum('11.11.2026')).toBe(false)
    expect(istDatum('')).toBe(false)
    expect(istDatum(null)).toBe(false)
  })

  it('nimmt für „heute“ die Ortszeit', () => {
    // 11.11.2026 kurz nach Mitternacht Ortszeit
    expect(heuteLokal(new Date(2026, 10, 12, 0, 30))).toBe('2026-11-12')
  })

  it('zeigt deutsche Schreibweise', () => {
    expect(datumDeutsch('2026-11-25')).toBe('25.11.2026')
  })

  it('erkennt Zeitpunkte in UTC', () => {
    expect(istZeitpunkt('2026-11-11T13:05:00.000Z')).toBe(true)
    expect(istZeitpunkt('2026-11-11T13:05:00Z')).toBe(true)
    expect(istZeitpunkt('2026-11-11 13:05')).toBe(false)
  })
})
