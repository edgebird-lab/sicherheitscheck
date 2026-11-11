import { describe, expect, it } from 'vitest'
import { leer, servfail, txt, type DnsEintrag } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { pruefeTlsRpt } from './tlsrpt'

const D = 'firma.test'

async function rpt(antwort: DnsEintrag, stsVorhanden = false) {
  const { lauf, netz } = testlauf({ dns: { 'TXT _smtp._tls.firma.test': antwort } })
  return { befund: await pruefeTlsRpt(lauf, D, stsVorhanden), netz }
}
const eintrag = (...werte: string[]) => txt(`_smtp._tls.${D}`, ...werte)

describe('TLS-RPT (6.5)', () => {
  it('T-RP01: kein Eintrag ohne MTA-STS → RPT-01 info; mit MTA-STS → RPT-02 hinweis', async () => {
    const ohne = await rpt(leer())
    expect(kurz(ohne.befund)).toEqual({ regel: 'RPT-01', stufe: 'info', weitere: [] })
    expect(ohne.netz.aufrufe).toEqual(['DNS TXT _smtp._tls.firma.test'])
    expect(kurz((await rpt(leer(), true)).befund)).toEqual({ regel: 'RPT-02', stufe: 'hinweis', weitere: ['RPT-01'] })
  })

  it('T-RP02: v=TLSRPTv1 mit mailto → RPT-04 ok', async () => {
    const { befund } = await rpt(eintrag('v=TLSRPTv1; rua=mailto:tls@firma.test'))
    expect(kurz(befund)).toEqual({ regel: 'RPT-04', stufe: 'ok', weitere: [] })
    expect(befund.werte.rua).toBe('mailto:tls@firma.test')
  })

  it('T-RP03: rua mit ftp → RPT-03 hinweis', async () => {
    expect(kurz((await rpt(eintrag('v=TLSRPTv1; rua=ftp://x.firma.test'))).befund)).toEqual({ regel: 'RPT-03', stufe: 'hinweis', weitere: [] })
  })

  it('https-Adresse ist gültig; fehlendes rua und mehrere Einträge → RPT-03', async () => {
    expect(kurz((await rpt(eintrag('v=TLSRPTv1; rua=mailto:a@firma.test,https://berichte.firma.test/tls'))).befund).regel).toBe('RPT-04')
    expect(kurz((await rpt(eintrag('v=TLSRPTv1;'))).befund).regel).toBe('RPT-03')
    expect(kurz((await rpt(eintrag('v=TLSRPTv1; rua=mailto:a@firma.test', 'v=TLSRPTv1; rua=mailto:b@firma.test'))).befund).regel).toBe('RPT-03')
  })

  it('gescheiterte Abfrage → RPT-00 fehler', async () => {
    expect(kurz((await rpt(servfail())).befund)).toEqual({ regel: 'RPT-00', stufe: 'fehler', weitere: [] })
  })
})
