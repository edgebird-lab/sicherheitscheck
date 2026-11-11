import { describe, expect, it } from 'vitest'
import { caa, nxdomain, servfail, type DnsEintrag } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { caaNamen, pruefeCaa } from './caa'

async function pruefe(D: string, dns: Record<string, DnsEintrag>) {
  const { lauf, netz } = testlauf({ dns })
  return { befund: await pruefeCaa(lauf, D), netz }
}

describe('CAA (6.5)', () => {
  it('fragt D und alle Elternnamen bis zur Top-Level-Domain', () => {
    expect(caaNamen('firma.co.uk')).toEqual(['firma.co.uk', 'co.uk', 'uk'])
    expect(caaNamen('firma.test')).toEqual(['firma.test', 'test'])
  })

  it('T-CA01: kein CAA für firma.test und test → CAA-01 hinweis, genau 2 Abfragen', async () => {
    const { befund, netz } = await pruefe('firma.test', { 'CAA test': nxdomain() })
    expect(kurz(befund)).toEqual({ regel: 'CAA-01', stufe: 'hinweis', weitere: [] })
    expect(netz.aufrufe).toEqual(['DNS CAA firma.test', 'DNS CAA test'])
  })

  it('T-CA02: 0 issue "letsencrypt.org" → CAA-02 ok, Messwert nennt die Stelle', async () => {
    const { befund, netz } = await pruefe('firma.test', { 'CAA firma.test': caa('firma.test', '0 issue "letsencrypt.org"') })
    expect(kurz(befund)).toEqual({ regel: 'CAA-02', stufe: 'ok', weitere: [] })
    expect(befund.messwert).toBe('erlaubt: letsencrypt.org')
    expect(netz.aufrufe).toHaveLength(1)
  })

  it('T-CA03: nur iodef → CAA-03 hinweis', async () => {
    const { befund } = await pruefe('firma.test', { 'CAA firma.test': caa('firma.test', '0 iodef "mailto:sec@firma.test"') })
    expect(kurz(befund)).toEqual({ regel: 'CAA-03', stufe: 'hinweis', weitere: [] })
  })

  it('T-CA04: 128 tbs "x" → CAA-04 warnung', async () => {
    const { befund } = await pruefe('firma.test', { 'CAA firma.test': caa('firma.test', '128 tbs "x"') })
    expect(kurz(befund)).toEqual({ regel: 'CAA-04', stufe: 'warnung', weitere: ['CAA-03'] })
  })

  it('Eintrag eines Elternnamens gilt; Parameter und „;“ werden lesbar', async () => {
    const { befund } = await pruefe('firma.co.uk', { 'CAA co.uk': caa('co.uk', '0 issue "pki.example; validationmethods=dns-01"', '0 issuewild ";"') })
    expect(kurz(befund).regel).toBe('CAA-02')
    expect(befund.messwert).toBe('erlaubt: pki.example, keine (Ausstellung verboten) (Eintrag von co.uk)')
    expect(befund.werte.name).toBe('co.uk')
  })

  it('bekannte Angabe mit Flag 128 ist kein Fehler; gescheiterte Abfrage → CAA-00', async () => {
    expect(kurz((await pruefe('firma.test', { 'CAA firma.test': caa('firma.test', '128 issue "pki.example"') })).befund).regel).toBe('CAA-02')
    const { befund } = await pruefe('firma.test', { 'CAA test': servfail() })
    expect(kurz(befund)).toEqual({ regel: 'CAA-00', stufe: 'fehler', weitere: [] })
    expect(befund.messwert).toBe('DNS-Abfrage gescheitert (SERVFAIL) für test')
  })
})
