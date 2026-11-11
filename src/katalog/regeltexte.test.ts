import { describe, expect, it } from 'vitest'
import type { PruefId } from '../modell/typen'
import { PRUEF_IDS, REGEL_NICHT_PRUEFBAR, REGEL_WEBSITE_NICHT_PRUEFBAR, WEBSITE_PRUEF_IDS } from '../pruefung/stufen'
import { mitDomain, REGELTEXTE, regeltext } from './regeltexte'

const PRAEFIX: Record<string, PruefId[]> = {
  MX: ['mx'],
  SPF: ['spf'],
  DMARC: ['dmarc'],
  DKIM: ['dkim'],
  STS: ['mta_sts'],
  RPT: ['tls_rpt'],
  DNSSEC: ['dnssec'],
  CAA: ['caa'],
  WEB: ['http_weiterleitung', 'https_erreichbar'],
  CERT: ['zertifikat'],
  TLS: ['tls_version'],
  HSTS: ['hsts'],
  CSP: ['csp'],
  XCTO: ['x_content_type_options'],
  FRAME: ['clickjacking'],
  REF: ['referrer_policy'],
  XXSS: ['x_xss_protection'],
  SRV: ['server_angaben'],
  COOKIE: ['cookies'],
  SECTXT: ['security_txt'],
}
/** Regeln für mehrere Prüfungen */
const FUER_MEHRERE = ['WEB-09', 'WEB-15', 'HDR-00', 'BROWSER-01']

describe('Regeltexte (6.5)', () => {
  it('jede Regel steht genau einmal da, mit Titel und Erklärung', () => {
    const regeln = REGELTEXTE.map((r) => r.regel)
    expect(new Set(regeln).size).toBe(regeln.length)
    for (const r of REGELTEXTE) {
      expect(r.titel.length, r.regel).toBeGreaterThan(3)
      expect(r.titel.length, r.regel).toBeLessThanOrEqual(60)
      expect(r.erklaerung.length, r.regel).toBeGreaterThan(20)
    }
  })

  it('eine Maßnahme gibt es genau bei hinweis, warnung und kritisch', () => {
    for (const r of REGELTEXTE) {
      const braucht = r.stufe === 'hinweis' || r.stufe === 'warnung' || r.stufe === 'kritisch'
      expect(r.massnahme !== null, r.regel).toBe(braucht)
    }
  })

  it('das Präfix passt zur Prüfung; jede DNS-Prüfung hat eine Regel für „nicht prüfbar“ mit Stufe fehler', () => {
    for (const r of REGELTEXTE) {
      if (FUER_MEHRERE.includes(r.regel)) expect(r.pruefId, r.regel).toBeNull()
      else expect(PRAEFIX[r.regel.split('-')[0]], r.regel).toContain(r.pruefId)
    }
    for (const [pruefId, regel] of Object.entries(REGEL_NICHT_PRUEFBAR)) {
      expect(regeltext(regel)).toMatchObject({ pruefId, stufe: 'fehler' })
    }
    expect(Object.keys(REGEL_NICHT_PRUEFBAR)).toEqual(PRUEF_IDS.slice(0, 8))
  })

  it('Website (6.6): jede Prüfung hat Regeln; Grenze und Abbruch ergeben WEB-15 mit Stufe fehler', () => {
    for (const p of WEBSITE_PRUEF_IDS) expect(REGELTEXTE.some((r) => r.pruefId === p), p).toBe(true)
    expect(regeltext(REGEL_WEBSITE_NICHT_PRUEFBAR)).toMatchObject({ pruefId: null, stufe: 'fehler' })
    const stufen = Object.fromEntries(REGELTEXTE.map((r) => [r.regel, r.stufe]))
    expect(stufen).toMatchObject({
      'WEB-00': 'info',
      'WEB-01': 'ok',
      'WEB-02': 'hinweis',
      'WEB-03': 'hinweis',
      'WEB-04': 'warnung',
      'WEB-05': 'info',
      'WEB-06': 'warnung',
      'WEB-07': 'info',
      'WEB-08': 'fehler',
      'WEB-09': 'fehler',
      'WEB-10': 'ok',
      'WEB-11': 'hinweis',
      'WEB-12': 'warnung',
      'WEB-13': 'kritisch',
      'WEB-14': 'fehler',
      'CERT-01': 'kritisch',
      'CERT-02': 'kritisch',
      'CERT-03': 'kritisch',
      'CERT-04': 'warnung',
      'CERT-05': 'hinweis',
      'CERT-06': 'ok',
      'CERT-07': 'warnung',
      'CERT-08': 'fehler',
      'TLS-01': 'ok',
      'TLS-02': 'hinweis',
      'TLS-03': 'kritisch',
      'TLS-04': 'fehler',
      'HSTS-01': 'warnung',
      'HSTS-02': 'warnung',
      'HSTS-03': 'hinweis',
      'HSTS-04': 'ok',
      'HSTS-05': 'warnung',
      'HDR-00': 'nicht_geprueft',
      'CSP-01': 'ok',
      'CSP-02': 'hinweis',
      'CSP-03': 'hinweis',
      'XCTO-01': 'ok',
      'XCTO-02': 'hinweis',
      'FRAME-01': 'ok',
      'FRAME-02': 'hinweis',
      'REF-01': 'ok',
      'REF-02': 'info',
      'REF-03': 'hinweis',
      'XXSS-01': 'ok',
      'XXSS-02': 'hinweis',
      'SRV-01': 'ok',
      'SRV-02': 'hinweis',
      'COOKIE-00': 'info',
      'COOKIE-01': 'ok',
      'COOKIE-02': 'hinweis',
      'SECTXT-01': 'info',
      'SECTXT-02': 'ok',
      'SECTXT-03': 'hinweis',
      'SECTXT-04': 'hinweis',
    })
  })

  it('Stufen wie in den Tabellen der Spezifikation', () => {
    const stufen = Object.fromEntries(REGELTEXTE.map((r) => [r.regel, r.stufe]))
    expect(stufen).toMatchObject({
      'MX-01': 'fehler',
      'SPF-03': 'kritisch',
      'SPF-04': 'warnung',
      'SPF-09': 'hinweis',
      'DMARC-04': 'hinweis',
      'DMARC-05': 'warnung',
      'DMARC-11': 'info',
      'DKIM-05': 'warnung',
      'DKIM-06': 'hinweis',
      'STS-10': 'kritisch',
      'STS-11': 'nicht_geprueft',
      'RPT-02': 'hinweis',
      'DNSSEC-03': 'kritisch',
      'DNSSEC-04': 'fehler',
      'CAA-01': 'hinweis',
      'CAA-04': 'warnung',
      'BROWSER-01': 'nicht_geprueft',
    })
  })

  it('unbekannte Regeln sind ein Programmfehler; ‹Domain› wird ersetzt', () => {
    expect(() => regeltext('XYZ-99')).toThrow('Unbekannte Regel XYZ-99')
    expect(mitDomain('_smtp._tls.‹Domain›', 'firma.de')).toBe('_smtp._tls.firma.de')
  })
})
