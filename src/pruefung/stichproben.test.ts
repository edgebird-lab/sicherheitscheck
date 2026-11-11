/**
 * Stichproben der Durchsicht vom 11.11.2026 zu Regeln der Außenprüfung, die die Tabellen der
 * Spezifikation nicht einzeln nennen. Zählungen und Hauptregeln von Hand nachvollzogen.
 */
import { describe, expect, it } from 'vitest'
import { txt } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { pruefeDmarc } from './dmarc'
import { pruefeSpf } from './spf'

const D = 'firma.test'

describe('Stichproben SPF', () => {
  it('include und redirect auf dasselbe Ziel: 4 Abfragen gezählt, das Ziel nur einmal abgefragt; oberstes ~all gilt', async () => {
    const { lauf, netz } = testlauf({
      dns: {
        'TXT firma.test': txt(D, 'v=spf1 include:a.test include:b.test ~all'),
        'TXT a.test': txt('a.test', 'v=spf1 include:c.test -all'),
        'TXT b.test': txt('b.test', 'v=spf1 redirect=c.test'),
        'TXT c.test': txt('c.test', 'v=spf1 ip4:192.0.2.1 -all'),
      },
    })
    const b = await pruefeSpf(lauf, D)
    // include a (1), darin include c (2), include b (3), darin redirect c (4)
    expect(kurz(b)).toEqual({ regel: 'SPF-05', stufe: 'ok', weitere: [] })
    expect(b.werte).toMatchObject({ lookups: 4, qualifier: '~all' })
    expect(netz.aufrufe.filter((a) => a === 'DNS TXT c.test')).toHaveLength(1)
  })

  it('redirect-Kette: das all des letzten Ziels gilt, jede Weiterleitung zählt', async () => {
    const { lauf } = testlauf({
      dns: {
        'TXT firma.test': txt(D, 'v=spf1 redirect=a.test'),
        'TXT a.test': txt('a.test', 'v=spf1 redirect=b.test'),
        'TXT b.test': txt('b.test', 'v=spf1 +all'),
      },
    })
    const b = await pruefeSpf(lauf, D)
    expect(kurz(b)).toEqual({ regel: 'SPF-03', stufe: 'kritisch', weitere: [] })
    expect(b.werte).toMatchObject({ lookups: 2, qualifier: '+all' })
  })

  it('redirect zurück auf die Domain ist eine Schleife → SPF-07, ohne Bewertung des Qualifiers', async () => {
    const { lauf } = testlauf({
      dns: {
        'TXT firma.test': txt(D, 'v=spf1 redirect=a.test'),
        'TXT a.test': txt('a.test', 'v=spf1 redirect=Firma.Test.'),
      },
    })
    const b = await pruefeSpf(lauf, D)
    expect(kurz(b)).toEqual({ regel: 'SPF-07', stufe: 'warnung', weitere: [] })
    expect(b.werte).toMatchObject({ qualifier: null })
    expect(b.messwert).toContain('firma.test → a.test → firma.test')
  })
})

describe('Stichproben DMARC', () => {
  it('Werte von p und sp ohne Groß/klein: „p=REJECT; sp=None“ → DMARC-10 hinweis, weitere DMARC-07', async () => {
    const { lauf } = testlauf({ dns: { 'TXT _dmarc.firma.test': txt('_dmarc.firma.test', 'v=DMARC1; p=REJECT; sp=None; rua=mailto:d@firma.test') } })
    expect(kurz(await pruefeDmarc(lauf, D))).toEqual({ regel: 'DMARC-10', stufe: 'hinweis', weitere: ['DMARC-07'] })
  })

  it('p=none mit https-Berichtsadresse: zwei Hinweise, DMARC-04 steht in der Tabelle vor DMARC-12', async () => {
    const { lauf } = testlauf({ dns: { 'TXT _dmarc.firma.test': txt('_dmarc.firma.test', 'v=DMARC1; p=none; rua=https://x.firma.test') } })
    expect(kurz(await pruefeDmarc(lauf, D))).toEqual({ regel: 'DMARC-04', stufe: 'hinweis', weitere: ['DMARC-12'] })
  })
})
