import { describe, expect, it } from 'vitest'
import type { HttpAntwort } from '../modell/typen'
import { http, servfail, txt } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { bewerteMtaSts, bewerteStsEintraege, holeRichtlinie, leseRichtlinie, leseStsEintrag, mxPasst, richtlinienAdresse, stsVorhanden, type StsEintrag } from './mtasts'

const D = 'firma.test'
const GUELTIG: StsEintrag = { art: 'gueltig', eintrag: 'v=STSv1; id=20261111T1;', id: '20261111T1' }
const URL = richtlinienAdresse(D)

function richtlinie(text: string, typ = 'text/plain; charset=utf-8'): HttpAntwort {
  return http(URL, 200, [['content-type', typ]], text)
}
const ENFORCE = 'version: STSv1\r\nmode: enforce\r\nmx: *.mail.firma.test\r\nmax_age: 604800\r\n'

describe('MTA-STS-Eintrag (6.5)', () => {
  it('T-T01: v=STSv1; id=20261111T1; ist gültig', () => {
    expect(bewerteStsEintraege(['v=STSv1; id=20261111T1;'])).toEqual(GUELTIG)
  })

  it('T-T02: id mit Bindestrichen → STS-02 warnung', () => {
    const e = bewerteStsEintraege(['v=STSv1; id=2026-11-11;'])
    expect(e).toMatchObject({ art: 'ungueltig' })
    expect(kurz(bewerteMtaSts(D, e, 'desktop', null, []))).toEqual({ regel: 'STS-02', stufe: 'warnung', weitere: [] })
  })

  it('mehrere Kandidaten → STS-02; kein Kandidat → STS-01 info; nur genau „v=STSv1;“ zählt', () => {
    expect(kurz(bewerteMtaSts(D, bewerteStsEintraege(['v=STSv1; id=1;', 'v=STSv1; id=2;']), 'browser', null, [])).regel).toBe('STS-02')
    const kein = bewerteStsEintraege(['v=stsv1; id=1;', 'etwas anderes'])
    expect(kein).toEqual({ art: 'kein' })
    expect(kurz(bewerteMtaSts(D, kein, 'browser', null, []))).toEqual({ regel: 'STS-01', stufe: 'info', weitere: [] })
    expect(stsVorhanden(kein)).toBe(false)
    expect(stsVorhanden(bewerteStsEintraege(['v=STSv1; id=-;']))).toBe(true)
  })

  it('T-T09: Browser-Modus mit gültigem Eintrag → STS-11 nicht_geprueft, ohne Abruf', async () => {
    const { lauf, netz } = testlauf({ dns: { 'TXT _mta-sts.firma.test': txt('_mta-sts.firma.test', 'v=STSv1; id=20261111T1;') } })
    const e = await leseStsEintrag(lauf, D)
    expect(kurz(bewerteMtaSts(D, e, 'browser', null, ['mx1.mail.firma.test']))).toEqual({ regel: 'STS-11', stufe: 'nicht_geprueft', weitere: [] })
    expect(netz.aufrufe).toEqual(['DNS TXT _mta-sts.firma.test'])
  })

  it('gescheiterte Abfrage → STS-00 fehler', async () => {
    const { lauf } = testlauf({ dns: { 'TXT _mta-sts.firma.test': servfail() } })
    expect(kurz(bewerteMtaSts(D, await leseStsEintrag(lauf, D), 'browser', null, null)).regel).toBe('STS-00')
  })
})

describe('MTA-STS-Richtlinie (nur Windows-Programm)', () => {
  it('T-T03: enforce, mx *.mail.firma.test passt auf mx1.mail.firma.test → STS-09 ok', () => {
    const b = bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie(ENFORCE), ['mx1.mail.firma.test'])
    expect(kurz(b)).toEqual({ regel: 'STS-09', stufe: 'ok', weitere: [] })
    expect(b.werte).toMatchObject({ id: '20261111T1', mode: 'enforce', max_age: 604800, mx: '*.mail.firma.test' })
  })

  it('T-T04: wie T-T03 mit MX mail.firma.test → STS-10 kritisch', () => {
    const b = bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie(ENFORCE), ['mail.firma.test'])
    expect(kurz(b)).toEqual({ regel: 'STS-10', stufe: 'kritisch', weitere: [] })
    expect(b.messwert).toContain('nicht abgedeckt: mail.firma.test')
  })

  it('T-T05: max_age 31557601 → STS-05 warnung', () => {
    const r = leseRichtlinie('version: STSv1\nmode: enforce\nmx: mail.firma.test\nmax_age: 31557601\n')
    expect(r.gueltig).toBe(false)
    expect(leseRichtlinie('version: STSv1\nmode: enforce\nmx: mail.firma.test\nmax_age: 31557600\n').gueltig).toBe(true)
    const b = bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie('version: STSv1\nmode: enforce\nmx: mail.firma.test\nmax_age: 31557601\n'), ['mail.firma.test'])
    expect(kurz(b)).toEqual({ regel: 'STS-05', stufe: 'warnung', weitere: [] })
  })

  it('T-T06: Abruf liefert 301 → STS-03 warnung, kein zweiter Abruf', async () => {
    const { lauf, netz } = testlauf({ modus: 'desktop', http: { [URL]: http(URL, 301, [['location', 'https://www.firma.test/']]) } })
    const abruf = await holeRichtlinie(lauf, D)
    const b = bewerteMtaSts(D, GUELTIG, 'desktop', abruf, ['mx1.mail.firma.test'])
    expect(kurz(b)).toEqual({ regel: 'STS-03', stufe: 'warnung', weitere: [] })
    expect(b.messwert).toBe('Richtlinie nicht abrufbar: Status 301 (Weiterleitung auf https://www.firma.test/)')
    expect(netz.aufrufe).toEqual([`HTTP ${URL}`])
  })

  it('Verbindungs- oder TLS-Fehler → STS-03', () => {
    expect(kurz(bewerteMtaSts(D, GUELTIG, 'desktop', { fehler: 'tls', text: 'Zertifikat abgelaufen' }, [])).regel).toBe('STS-03')
  })

  it('T-T07: testing, alle MX passen → STS-07 hinweis; einer passt nicht → STS-08 warnung', () => {
    const testing = 'version: STSv1\nmode: testing\nmx: mx1.firma.test\nmx: *.mail.firma.test\nmax_age: 86400\n'
    expect(kurz(bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie(testing), ['mx1.firma.test', 'a.mail.firma.test']))).toEqual({ regel: 'STS-07', stufe: 'hinweis', weitere: [] })
    expect(kurz(bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie(testing), ['mx2.firma.test'])).regel).toBe('STS-08')
  })

  it('T-T08: LF-Zeilenenden und unbekanntes Feld foo: bar → gültig', () => {
    const r = leseRichtlinie('version: STSv1\nfoo: bar\nmode: enforce\nmx: mail.firma.test\nmax_age: 604800\n')
    expect(r).toEqual({ gueltig: true, richtlinie: { version: 'STSv1', mode: 'enforce', maxAge: '604800', mx: ['mail.firma.test'] } })
  })

  it('bei doppelten Feldern außer mx gilt das erste; mode none → STS-06 info', () => {
    const r = leseRichtlinie('version: STSv1\nmode: none\nmode: enforce\nmax_age: 1\n')
    expect(r).toMatchObject({ gueltig: true, richtlinie: { mode: 'none', mx: [] } })
    expect(kurz(bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie('version: STSv1\nmode: none\nmax_age: 1\n'), ['mx.firma.test'])).regel).toBe('STS-06')
  })

  it('ungültige Felder: version, mode, fehlendes mx, falsches mx-Muster', () => {
    expect(leseRichtlinie('version: STSv2\nmode: enforce\nmx: a.firma.test\nmax_age: 1').gueltig).toBe(false)
    expect(leseRichtlinie('version: STSv1\nmode: streng\nmx: a.firma.test\nmax_age: 1').gueltig).toBe(false)
    expect(leseRichtlinie('version: STSv1\nmode: enforce\nmax_age: 1').gueltig).toBe(false)
    expect(leseRichtlinie('version: STSv1\nmode: enforce\nmx: localhost\nmax_age: 1').gueltig).toBe(false)
    expect(leseRichtlinie('version: STSv1\nmode: enforce\nmx: a.firma.test\nmax_age: 1 Woche').gueltig).toBe(false)
  })

  it('falscher Dateityp → STS-04 hinweis als weitere Regel neben der Bewertung des Modus', () => {
    const b = bewerteMtaSts(D, GUELTIG, 'desktop', richtlinie(ENFORCE, 'text/html'), ['a.mail.firma.test'])
    expect(kurz(b)).toEqual({ regel: 'STS-04', stufe: 'hinweis', weitere: ['STS-09'] })
  })

  it('T-T10: a.b.mail.firma.test passt nicht auf *.mail.firma.test; Groß/klein egal', () => {
    expect(mxPasst('a.b.mail.firma.test', '*.mail.firma.test')).toBe(false)
    expect(mxPasst('MX1.Mail.Firma.Test', '*.mail.firma.test')).toBe(true)
    expect(mxPasst('mail.firma.test', '*.mail.firma.test')).toBe(false)
    expect(mxPasst('mail.firma.test', 'mail.firma.test')).toBe(true)
  })
})
