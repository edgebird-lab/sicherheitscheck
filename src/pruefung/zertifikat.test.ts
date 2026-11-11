import { describe, expect, it } from 'vitest'
import type { TlsInfo } from '../modell/typen'
import { kurz } from '../testhilfen/netz'
import { JETZT } from '../testhilfen/pruefung'
import { bewerteTlsVersion, bewerteZertifikat, restTage } from './zertifikat'

// jetzt = 2026-11-11T12:00:00Z (Spezifikation 9.5)
const H = 'firma.test'

function info(gueltigBis: string, teil: Partial<TlsInfo> = {}): TlsInfo {
  return {
    host: H,
    version: 'TLS 1.3',
    suite: 'TLS_AES_256_GCM_SHA384',
    vertrauenswuerdig: true,
    namePasst: true,
    pruefFehler: null,
    zertifikat: { inhaber: 'CN=firma.test', aussteller: 'C=US, O=Let’s Encrypt, CN=R11', sans: ['firma.test'], gueltigAb: '2026-09-01T00:00:00Z', gueltigBis, schluessel: 'RSA 2048', signatur: 'sha256WithRSAEncryption' },
    kettenlaenge: 2,
    ...teil,
  }
}

describe('Zertifikat (6.6)', () => {
  it('T-Z01: gültig bis 2026-11-15: 3 Tage, CERT-04 warnung', () => {
    expect(restTage('2026-11-15T00:00:00Z', JETZT)).toBe(3)
    const b = bewerteZertifikat(H, info('2026-11-15T00:00:00Z'), JETZT)
    expect(kurz(b)).toEqual({ regel: 'CERT-04', stufe: 'warnung', weitere: [] })
    expect(b.messwert).toBe('gültig bis 15.11.2026 (noch 3 Tage), Aussteller C=US, O=Let’s Encrypt, CN=R11')
    expect(b.werte.tage).toBe(3)
  })

  it('T-Z02: gültig bis 2026-11-21: 9 Tage, CERT-05 hinweis', () => {
    expect(restTage('2026-11-21T00:00:00Z', JETZT)).toBe(9)
    expect(kurz(bewerteZertifikat(H, info('2026-11-21T00:00:00Z'), JETZT))).toEqual({ regel: 'CERT-05', stufe: 'hinweis', weitere: [] })
  })

  it('T-Z03: 2026-11-25T11:59:59Z / 12:00:00Z: 13 Tage CERT-05 / 14 Tage CERT-06', () => {
    expect(restTage('2026-11-25T11:59:59Z', JETZT)).toBe(13)
    expect(bewerteZertifikat(H, info('2026-11-25T11:59:59Z'), JETZT).regel).toBe('CERT-05')
    expect(restTage('2026-11-25T12:00:00Z', JETZT)).toBe(14)
    expect(bewerteZertifikat(H, info('2026-11-25T12:00:00Z'), JETZT)).toMatchObject({ regel: 'CERT-06', stufe: 'ok' })
  })

  it('T-Z04: gültig bis 2026-11-10: CERT-03 kritisch, Code abgelaufen ergibt kein CERT-01', () => {
    const b = bewerteZertifikat(H, info('2026-11-10T00:00:00Z', { vertrauenswuerdig: false, pruefFehler: { code: 'abgelaufen', text: 'certificate expired' } }), JETZT)
    expect(kurz(b)).toEqual({ regel: 'CERT-03', stufe: 'kritisch', weitere: [] })
    expect(b.messwert).toContain('seit 2 Tagen abgelaufen')
  })

  it('T-Z05: nicht vertrauenswürdig (unbekannte Stelle) und Name passt nicht: ein Befund CERT-01, weitere CERT-02', () => {
    const b = bewerteZertifikat(H, info('2027-02-01T00:00:00Z', { vertrauenswuerdig: false, namePasst: false, pruefFehler: { code: 'unbekannte_stelle', text: 'UnknownIssuer' } }), JETZT)
    expect(kurz(b)).toEqual({ regel: 'CERT-01', stufe: 'kritisch', weitere: ['CERT-02'] })
    expect(b.messwert).toContain('Namen im Zertifikat: firma.test')
  })

  it('noch nicht gültig: CERT-07 warnung (Code noch_nicht_gueltig ergibt kein CERT-01); NetzFehler: CERT-08 fehler', () => {
    const b = bewerteZertifikat(H, info('2027-02-01T00:00:00Z', { vertrauenswuerdig: false, pruefFehler: { code: 'noch_nicht_gueltig', text: 'not valid yet' }, zertifikat: { ...info('').zertifikat, gueltigAb: '2026-11-12T00:00:00Z', gueltigBis: '2027-02-01T00:00:00Z' } }), JETZT)
    expect(kurz(b)).toEqual({ regel: 'CERT-07', stufe: 'warnung', weitere: [] })
    expect(kurz(bewerteZertifikat(H, { fehler: 'verbindung', text: 'Keine Verbindung' }, JETZT))).toEqual({ regel: 'CERT-08', stufe: 'fehler', weitere: [] })
  })
})

describe('TLS-Version (6.6)', () => {
  it('T-Z06: TLS 1.3 / TLS 1.2: TLS-01 ok / TLS-02 hinweis', () => {
    expect(kurz(bewerteTlsVersion(H, info('2027-02-01T00:00:00Z')))).toEqual({ regel: 'TLS-01', stufe: 'ok', weitere: [] })
    const b = bewerteTlsVersion(H, info('2027-02-01T00:00:00Z', { version: 'TLS 1.2', suite: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256' }))
    expect(kurz(b)).toEqual({ regel: 'TLS-02', stufe: 'hinweis', weitere: [] })
    expect(b.messwert).toBe('TLS 1.2, TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256')
  })

  it('T-Z07: NetzFehler tls_version: TLS-03 kritisch; anderer NetzFehler: TLS-04 fehler', () => {
    expect(kurz(bewerteTlsVersion(H, { fehler: 'tls_version', text: 'Weder TLS 1.3 noch TLS 1.2 möglich' }))).toEqual({ regel: 'TLS-03', stufe: 'kritisch', weitere: [] })
    expect(kurz(bewerteTlsVersion(H, { fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' }))).toEqual({ regel: 'TLS-04', stufe: 'fehler', weitere: [] })
  })
})
