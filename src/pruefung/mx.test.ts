import { describe, expect, it } from 'vitest'
import { leer, mx, nxdomain, servfail } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { leseMx } from './dns'
import { pruefeMx } from './mx'

const D = 'firma.test'

describe('MX (6.5)', () => {
  it('T-MX01: MX „0 .“ ist ein Null-MX: MX-02 info', async () => {
    const { lauf } = testlauf({ dns: { 'MX firma.test': mx(D, '0 .') } })
    const r = await pruefeMx(lauf, D)
    expect(kurz(r.befund)).toEqual({ regel: 'MX-02', stufe: 'info', weitere: [] })
    expect(r.hosts).toEqual([])
  })

  it('T-MX02: zwei MX werden nach Priorität sortiert: MX-03, „10 a.firma.test, 20 b.firma.test“', async () => {
    const { lauf } = testlauf({ dns: { 'MX firma.test': mx(D, '20 b.firma.test.', '10 a.firma.test.') } })
    const r = await pruefeMx(lauf, D)
    expect(kurz(r.befund)).toEqual({ regel: 'MX-03', stufe: 'info', weitere: [] })
    expect(r.befund.messwert).toBe('10 a.firma.test, 20 b.firma.test')
    expect(r.befund.ziel).toBe(D)
    expect(r.hosts).toEqual(['a.firma.test', 'b.firma.test'])
  })

  it('T-N06 (Teil MX): Status 3 für die Domain ergibt MX-01 fehler und beendet den Lauf', async () => {
    const { lauf } = testlauf({ dns: { 'MX firma.test': nxdomain() } })
    const r = await pruefeMx(lauf, D)
    expect(kurz(r.befund)).toEqual({ regel: 'MX-01', stufe: 'fehler', weitere: [] })
    expect(r.abbruch).toBe(true)
  })

  it('ohne MX: MX-04 info; gescheiterte Abfrage: MX-00 fehler', async () => {
    expect(kurz((await pruefeMx(testlauf({ dns: { 'MX firma.test': leer() } }).lauf, D)).befund).regel).toBe('MX-04')
    const r = await pruefeMx(testlauf({ dns: { 'MX firma.test': servfail() } }).lauf, D)
    expect(kurz(r.befund)).toEqual({ regel: 'MX-00', stufe: 'fehler', weitere: [] })
    expect(r.befund.messwert).toBe('DNS-Abfrage gescheitert (SERVFAIL)')
    expect(r.hosts).toBeNull()
    expect(r.abbruch).toBe(false)
  })

  it('liest MX-Daten: Priorität und Host ohne Punkt am Ende', () => {
    expect(leseMx('10 mx1.firma.de.')).toEqual({ prioritaet: 10, host: 'mx1.firma.de' })
    expect(leseMx('0 .')).toEqual({ prioritaet: 0, host: '.' })
    expect(leseMx('kaputt')).toBeNull()
  })
})
