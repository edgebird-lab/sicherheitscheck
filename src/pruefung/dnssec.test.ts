import { describe, expect, it } from 'vitest'
import type { DnsAntwort } from '../modell/typen'
import { ausDohJson } from '../netz/schnittstelle'
import { leer, servfail } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { pruefeDnssec } from './dnssec'

const muster = import.meta.glob<{ default: unknown }>('/testdaten/dns/*.json', { eager: true })
const ausMuster = (name: string) => ausDohJson(muster[`/testdaten/dns/${name}.json`].default) as DnsAntwort

describe('DNSSEC (6.5)', () => {
  it('T-DS01: Status 0 mit AD → DNSSEC-01 ok', async () => {
    const { lauf } = testlauf({ dns: { 'SOA firma.test': leer(true) } })
    expect(kurz(await pruefeDnssec(lauf, 'firma.test'))).toEqual({ regel: 'DNSSEC-01', stufe: 'ok', weitere: [] })
  })

  it('T-DS02: Status 0 ohne AD → DNSSEC-02 hinweis, keine zweite Abfrage', async () => {
    const { lauf, netz } = testlauf({ dns: { 'SOA firma.test': leer(false) } })
    expect(kurz(await pruefeDnssec(lauf, 'firma.test'))).toEqual({ regel: 'DNSSEC-02', stufe: 'hinweis', weitere: [] })
    expect(netz.aufrufe).toEqual(['DNS SOA firma.test'])
  })

  it('T-DS03: Status 2, mit cd=1 Status 0 (Formatmuster nach dnssec-failed.org) → DNSSEC-03 kritisch', async () => {
    const { lauf, netz } = testlauf({ dns: { 'SOA dnssec-kaputt.test': ausMuster('google-servfail-dnssec'), 'SOA dnssec-kaputt.test cd': ausMuster('google-soa-cd') } })
    const b = await pruefeDnssec(lauf, 'dnssec-kaputt.test')
    expect(kurz(b)).toEqual({ regel: 'DNSSEC-03', stufe: 'kritisch', weitere: [] })
    expect(b.messwert).toContain('DNSSEC validation failure')
    expect(netz.aufrufe).toEqual(['DNS SOA dnssec-kaputt.test', 'DNS SOA dnssec-kaputt.test cd'])
  })

  it('T-DS04: Status 2 auch mit cd=1 → DNSSEC-04 fehler', async () => {
    const { lauf } = testlauf({ dns: { 'SOA firma.test': ausMuster('cloudflare-servfail-dnssec'), 'SOA firma.test cd': servfail() } })
    expect(kurz(await pruefeDnssec(lauf, 'firma.test'))).toEqual({ regel: 'DNSSEC-04', stufe: 'fehler', weitere: [] })
  })

  it('Netzfehler oder anderer Status → DNSSEC-04 fehler', async () => {
    const netzfehler = testlauf({ dns: { 'SOA firma.test': { fehler: 'antwort', text: 'HTTP 400', httpStatus: 400 } } })
    expect(kurz(await pruefeDnssec(netzfehler.lauf, 'firma.test')).regel).toBe('DNSSEC-04')
    const refused = testlauf({ dns: { 'SOA firma.test': { status: 5, ad: false, antworten: [], kommentar: '' } } })
    expect((await pruefeDnssec(refused.lauf, 'firma.test')).messwert).toBe('DNS-Abfrage gescheitert (REFUSED)')
  })
})
