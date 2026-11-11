import { describe, expect, it } from 'vitest'
import { nxdomain, servfail, txt, type TestnetzDaten } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { pruefeSpf } from './spf'

const D = 'firma.test'

async function spf(dns: TestnetzDaten['dns']) {
  const t = testlauf({ dns })
  const befund = await pruefeSpf(t.lauf, D)
  return { befund, netz: t.netz }
}

describe('SPF (6.5, RFC 7208)', () => {
  it('T-S01: v=spf1 -all → SPF-06 ok, 0 Lookups', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-06', stufe: 'ok', weitere: [] })
    expect(befund.werte).toMatchObject({ lookups: 0, qualifier: '-all', eintrag: 'v=spf1 -all' })
  })

  it('T-S02: include auf einen Eintrag mit -all, selbst ~all → SPF-05 ok, 1 Lookup', async () => {
    const { befund } = await spf({
      'TXT firma.test': txt(D, 'v=spf1 include:_spf.example.net ~all'),
      'TXT _spf.example.net': txt('_spf.example.net', 'v=spf1 ip4:192.0.2.0/24 -all'),
    })
    expect(kurz(befund)).toEqual({ regel: 'SPF-05', stufe: 'ok', weitere: [] })
    expect(befund.werte).toMatchObject({ lookups: 1, qualifier: '~all' })
    expect(befund.messwert).toBe('v=spf1 include:_spf.example.net ~all (1 DNS-Abfrage)')
  })

  it('T-S03: +all und all ohne Qualifier → SPF-03 kritisch', async () => {
    for (const eintrag of ['v=spf1 +all', 'v=spf1 all']) {
      const { befund } = await spf({ 'TXT firma.test': txt(D, eintrag) })
      expect(kurz(befund), eintrag).toEqual({ regel: 'SPF-03', stufe: 'kritisch', weitere: [] })
    }
  })

  it('T-S04: v=spf1 mx → SPF-04 warnung, 1 Lookup, mx wird nicht aufgelöst', async () => {
    const { befund, netz } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 mx') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-04', stufe: 'warnung', weitere: [] })
    expect(befund.werte).toMatchObject({ lookups: 1, qualifier: 'kein all' })
    expect(netz.aufrufe).toEqual(['DNS TXT firma.test'])
  })

  it('?all → SPF-04 warnung', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 ip4:192.0.2.1 ?all') })
    expect(kurz(befund).regel).toBe('SPF-04')
  })

  it('T-S05: zwei SPF-Einträge → SPF-02 warnung', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 -all', 'v=spf1 mx -all', 'google-site-verification=abc') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-02', stufe: 'warnung', weitere: [] })
  })

  it('T-S06: 11 include-Begriffe → SPF-07 warnung, 11 Lookups, die 11. Abfrage entfällt', async () => {
    const dns: Record<string, ReturnType<typeof txt>> = { 'TXT firma.test': txt(D, `v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:s${i + 1}.example.net`).join(' ')} -all`) }
    for (let i = 1; i <= 11; i++) dns[`TXT s${i}.example.net`] = txt(`s${i}.example.net`, 'v=spf1 -all')
    const { befund, netz } = await spf(dns)
    expect(kurz(befund)).toEqual({ regel: 'SPF-07', stufe: 'warnung', weitere: [] })
    expect(befund.werte).toMatchObject({ lookups: 11, qualifier: null })
    expect(netz.aufrufe).toHaveLength(11)
    expect(netz.aufrufe).not.toContain('DNS TXT s11.example.net')
  })

  it('T-S07: include auf einen Namen ohne SPF → SPF-08 warnung', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 include:leer.example.net -all'), 'TXT leer.example.net': txt('leer.example.net', 'etwas anderes') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-08', stufe: 'warnung', weitere: [] })
    expect(befund.messwert).toContain('leer.example.net hat keinen SPF-Eintrag')
  })

  it('include auf eine Domain, die es nicht gibt (NXDOMAIN) → SPF-08', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 include:weg.example.net -all'), 'TXT weg.example.net': nxdomain() })
    expect(kurz(befund).regel).toBe('SPF-08')
  })

  it('T-S08: v=spf1 ptr -all → Stufe hinweis, Regel SPF-09, weitere SPF-06', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 ptr -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-09', stufe: 'hinweis', weitere: ['SPF-06'] })
    expect(befund.werte.lookups).toBe(1)
  })

  it('T-S09: nur v=spf10 -all → SPF-01 warnung', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf10 -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-01', stufe: 'warnung', weitere: [] })
  })

  it('T-S10: V=SPF1 -ALL → SPF-06 ok', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'V=SPF1 -ALL') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-06', stufe: 'ok', weitere: [] })
  })

  it('T-S11: redirect auf einen Eintrag mit -all → SPF-06 ok, 1 Lookup', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 redirect=_spf.example.net'), 'TXT _spf.example.net': txt('_spf.example.net', 'v=spf1 -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-06', stufe: 'ok', weitere: [] })
    expect(befund.werte).toMatchObject({ lookups: 1, qualifier: '-all' })
  })

  it('redirect gilt nur ohne all im Eintrag', async () => {
    const { befund, netz } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 ~all redirect=_spf.example.net') })
    expect(kurz(befund).regel).toBe('SPF-05')
    expect(befund.werte.lookups).toBe(0)
    expect(netz.aufrufe).toEqual(['DNS TXT firma.test'])
  })

  it('T-S12: exists mit Makro → Stufe hinweis (SPF-11), weitere SPF-06, 1 Lookup, keine Abfrage für exists', async () => {
    const { befund, netz } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 exists:%{i}._spf.example.net -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-11', stufe: 'hinweis', weitere: ['SPF-06'] })
    expect(befund.werte.lookups).toBe(1)
    expect(netz.aufrufe).toEqual(['DNS TXT firma.test'])
  })

  it('T-S13: v=spf1 foo:bar -all → SPF-10 warnung', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 foo:bar -all') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-10', stufe: 'warnung', weitere: [] })
    expect(befund.messwert).toContain('„foo:bar“')
  })

  it('T-S14: include-Schleife a → b → a → SPF-07 warnung', async () => {
    const { befund } = await spf({
      'TXT firma.test': txt(D, 'v=spf1 include:a.example.net -all'),
      'TXT a.example.net': txt('a.example.net', 'v=spf1 include:b.example.net -all'),
      'TXT b.example.net': txt('b.example.net', 'v=spf1 include:a.example.net -all'),
    })
    expect(kurz(befund)).toEqual({ regel: 'SPF-07', stufe: 'warnung', weitere: [] })
    expect(befund.messwert).toContain('Schleife: firma.test → a.example.net → b.example.net → a.example.net')
  })

  it('T-S15: derselbe Name in zwei Zweigen ist keine Schleife: SPF-06 ok, 4 Lookups, c nur einmal abgefragt', async () => {
    const { befund, netz } = await spf({
      'TXT firma.test': txt(D, 'v=spf1 include:a.example.net include:b.example.net -all'),
      'TXT a.example.net': txt('a.example.net', 'v=spf1 include:c.example.net -all'),
      'TXT b.example.net': txt('b.example.net', 'v=spf1 include:c.example.net -all'),
      'TXT c.example.net': txt('c.example.net', 'v=spf1 -all'),
    })
    expect(kurz(befund)).toEqual({ regel: 'SPF-06', stufe: 'ok', weitere: [] })
    expect(befund.werte.lookups).toBe(4)
    expect(netz.aufrufe.filter((a) => a === 'DNS TXT c.example.net')).toHaveLength(1)
  })

  it('T-S16: include-Ziel liefert Status 2 → SPF-00 fehler, keine Bewertung des Qualifiers', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 ptr include:kaputt.example.net +all'), 'TXT kaputt.example.net': servfail() })
    expect(kurz(befund)).toEqual({ regel: 'SPF-00', stufe: 'fehler', weitere: [] })
    expect(befund.werte.qualifier).toBeNull()
    expect(befund.messwert).toBe('DNS-Abfrage gescheitert (SERVFAIL) für kaputt.example.net')
  })

  it('gescheiterte Hauptabfrage → nur SPF-00', async () => {
    const { befund } = await spf({ 'TXT firma.test': { fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' } })
    expect(kurz(befund)).toEqual({ regel: 'SPF-00', stufe: 'fehler', weitere: [] })
    expect(befund.messwert).toBe('DNS-Abfrage gescheitert (Zeitüberschreitung)')
  })

  it('redirect doppelt ist ungültig; vor dem Fehler gefundenes ptr bleibt als weitere Regel', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 ptr redirect=a.example.net redirect=b.example.net') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-10', stufe: 'warnung', weitere: ['SPF-09'] })
  })

  it('redirect auf ein Ziel mit Makro: wirksames all unbekannt, nur SPF-11', async () => {
    const { befund } = await spf({ 'TXT firma.test': txt(D, 'v=spf1 redirect=%{d}._spf.example.net') })
    expect(kurz(befund)).toEqual({ regel: 'SPF-11', stufe: 'hinweis', weitere: [] })
    expect(befund.werte.qualifier).toBeNull()
  })
})
