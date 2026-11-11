import { describe, expect, it } from 'vitest'
import { leer, nxdomain, servfail, txt, type DnsEintrag } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { pruefeDmarc } from './dmarc'

const D = 'firma.test'

async function dmarc(antwort: DnsEintrag) {
  const { lauf, netz } = testlauf({ dns: { 'TXT _dmarc.firma.test': antwort } })
  const befund = await pruefeDmarc(lauf, D)
  return { befund, netz }
}
const eintrag = (...werte: string[]) => txt(`_dmarc.${D}`, ...werte)

describe('DMARC (6.5, RFC 7489)', () => {
  it('T-M01: p=reject mit Berichtsadresse → DMARC-07 ok', async () => {
    const { befund, netz } = await dmarc(eintrag('v=DMARC1; p=reject; rua=mailto:dmarc@firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-07', stufe: 'ok', weitere: [] })
    expect(befund).toMatchObject({ ziel: D, messwert: 'v=DMARC1; p=reject; rua=mailto:dmarc@firma.test', werte: { p: 'reject', rua: 'mailto:dmarc@firma.test' } })
    expect(netz.aufrufe).toEqual(['DNS TXT _dmarc.firma.test'])
  })

  it('T-M02: p=none ohne rua → DMARC-05 warnung', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=none'))).befund)).toEqual({ regel: 'DMARC-05', stufe: 'warnung', weitere: [] })
  })

  it('T-M03: p=none mit rua → DMARC-04 hinweis', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=none; rua=mailto:dmarc@firma.test'))).befund)).toEqual({ regel: 'DMARC-04', stufe: 'hinweis', weitere: [] })
  })

  it('T-M04: kein Eintrag → DMARC-01 warnung', async () => {
    const { befund } = await dmarc(leer())
    expect(kurz(befund)).toEqual({ regel: 'DMARC-01', stufe: 'warnung', weitere: [] })
    expect(befund.messwert).toBe('kein DMARC-Eintrag')
  })

  it('T-M05: zwei Einträge → DMARC-02 warnung', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=none', 'v=DMARC1; p=reject'))).befund)).toEqual({ regel: 'DMARC-02', stufe: 'warnung', weitere: [] })
  })

  it('T-M06: ohne p, mit rua → DMARC-03 warnung', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; rua=mailto:dmarc@firma.test'))).befund)).toEqual({ regel: 'DMARC-03', stufe: 'warnung', weitere: [] })
  })

  it('unbekannter Wert für p → DMARC-03', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=ablehnen; rua=mailto:d@firma.test'))).befund).regel).toBe('DMARC-03')
  })

  it('T-M07: quarantine mit pct=50 → Stufe hinweis, Regel DMARC-09, weitere enthält DMARC-06', async () => {
    const { befund } = await dmarc(eintrag('v=DMARC1; p=quarantine; pct=50; rua=mailto:d@firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-09', stufe: 'hinweis', weitere: ['DMARC-06'] })
  })

  it('pct=100 ist kein Hinweis', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=quarantine; pct=100; rua=mailto:d@firma.test'))).befund).regel).toBe('DMARC-06')
  })

  it('T-M08: reject mit sp=none → Stufe hinweis, Regel DMARC-10', async () => {
    const { befund } = await dmarc(eintrag('v=DMARC1; p=reject; sp=none; rua=mailto:d@firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-10', stufe: 'hinweis', weitere: ['DMARC-07'] })
  })

  it('T-M09: v=dmarc1 wird nicht erkannt → Stufe warnung, Regel DMARC-08, weitere DMARC-01', async () => {
    const { befund } = await dmarc(eintrag('v=dmarc1; p=reject; rua=mailto:d@firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-08', stufe: 'warnung', weitere: ['DMARC-01'] })
  })

  it('T-M12: „V = DMARC1“ mit Leerzeichen und großem V wird erkannt → DMARC-07 ok', async () => {
    expect(kurz((await dmarc(eintrag('V = DMARC1; p=reject; rua=mailto:d@firma.test'))).befund)).toEqual({ regel: 'DMARC-07', stufe: 'ok', weitere: [] })
  })

  it('T-M10: „p=reject; v=DMARC1“ → DMARC-01, Messwert nennt 1 verworfenen Eintrag', async () => {
    const { befund } = await dmarc(eintrag('p=reject; v=DMARC1'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-01', stufe: 'warnung', weitere: [] })
    expect(befund.messwert).toBe('kein gültiger DMARC-Eintrag; 1 verworfener Eintrag: „p=reject; v=DMARC1“')
  })

  it('T-M11: rua mit https → Stufe hinweis, Regel DMARC-12', async () => {
    const { befund } = await dmarc(eintrag('v=DMARC1; p=reject; rua=https://x.firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'DMARC-12', stufe: 'hinweis', weitere: ['DMARC-07'] })
  })

  it('reject ohne rua → DMARC-11 info als weitere Regel', async () => {
    expect(kurz((await dmarc(eintrag('v=DMARC1; p=reject'))).befund)).toEqual({ regel: 'DMARC-11', stufe: 'info', weitere: ['DMARC-07'] })
  })

  it('T-N08: Status 3 / Status 0 ohne Antwort / Status 2 → DMARC-01 / DMARC-01 / nur DMARC-00', async () => {
    expect(kurz((await dmarc(nxdomain())).befund).regel).toBe('DMARC-01')
    expect(kurz((await dmarc(leer())).befund).regel).toBe('DMARC-01')
    const { befund } = await dmarc(servfail())
    expect(kurz(befund)).toEqual({ regel: 'DMARC-00', stufe: 'fehler', weitere: [] })
    expect(befund.messwert).toBe('DNS-Abfrage gescheitert (SERVFAIL)')
  })
})
