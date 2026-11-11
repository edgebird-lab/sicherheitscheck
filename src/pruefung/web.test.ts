import { describe, expect, it } from 'vitest'
import type { Befund, HttpAntwort, NetzFehler, TlsInfo } from '../modell/typen'
import { daten, http, servfail, type TestnetzDaten } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { JETZT } from '../testhilfen/pruefung'
import { bewerteHeader } from './header'
import { bewerteHsts } from './hsts'
import { bewerteSecurityTxt, securityTxtAdresse } from './sectxt'
import { WEBSITE_PRUEF_IDS } from './stufen'
import { bewerteHttps, bewerteWeiterleitung, folge, HEADER_PRUEF_IDS, type Kette } from './web'
import { pruefeWebsite } from './website'

const D = 'firma.test'
const W = 'www.firma.test'

/** Antworten für eine Kette ab `start` */
async function kette(start: string, antworten: Record<string, HttpAntwort | NetzFehler>) {
  const { netz, lauf } = testlauf({ modus: 'desktop', http: antworten })
  return { k: await folge(lauf, D, start), netz }
}

const weiter = (url: string, status: number, ziel: string) => http(url, status, [['location', ziel]])

/** Endantwort mit Kopfzeilen als fertige Kette (für HSTS und Header) */
function eine(kopfzeilen: [string, string][], status = 200, url = `https://${D}/`, text: string | null = null): Kette {
  return { urls: [url], antworten: [http(url, status, kopfzeilen, text)], ende: 'fertig' }
}

function header(kopfzeilen: [string, string][]): Record<string, Befund> {
  return Object.fromEntries(bewerteHeader(D, http(`https://${D}/`, 200, kopfzeilen)).map((b) => [b.pruefId, b]))
}

const a = (host: string) => daten(host, 'A', ['203.0.113.10'])

function tls(host: string, teil: Partial<TlsInfo> = {}, gueltigBis = '2027-02-01T00:00:00Z'): TlsInfo {
  return {
    host,
    version: 'TLS 1.3',
    suite: 'TLS_AES_128_GCM_SHA256',
    vertrauenswuerdig: true,
    namePasst: true,
    pruefFehler: null,
    zertifikat: { inhaber: `CN=${host}`, aussteller: 'C=US, O=Let’s Encrypt, CN=R11', sans: [D, W], gueltigAb: '2026-11-01T00:00:00Z', gueltigBis, schluessel: 'EC P-256', signatur: 'ecdsa-with-SHA256' },
    kettenlaenge: 2,
    ...teil,
  }
}

async function website(d: TestnetzDaten, mitMtaSts = false) {
  const { netz, lauf } = testlauf({ modus: 'desktop', ...d })
  const befunde = await pruefeWebsite(lauf, D, { mitMtaSts, jetzt: () => JETZT, melde: () => {} })
  const finde = (pruefId: string, ziel: string) => befunde.find((b) => b.pruefId === pruefId && b.ziel === ziel)
  return { befunde, netz, lauf, finde }
}

describe('Weiterleitung auf HTTPS (6.6)', () => {
  it('T-W01: 301 auf https, dann 200: WEB-01 ok', async () => {
    const { k } = await kette(`http://${D}/`, { [`http://${D}/`]: weiter(`http://${D}/`, 301, `https://${D}/`), [`https://${D}/`]: http(`https://${D}/`, 200) })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-01', stufe: 'ok', weitere: [] })
    expect(bewerteWeiterleitung(D, k).messwert).toBe('http://firma.test/ 301 → https://firma.test/ 200')
  })

  it('T-W02: dasselbe mit 302: WEB-02 hinweis', async () => {
    const { k } = await kette(`http://${D}/`, { [`http://${D}/`]: weiter(`http://${D}/`, 302, `https://${D}/`), [`https://${D}/`]: http(`https://${D}/`, 200) })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-02', stufe: 'hinweis', weitere: [] })
  })

  it('T-W03: http antwortet direkt mit 200: WEB-04 warnung', async () => {
    const { k } = await kette(`http://${D}/`, { [`http://${D}/`]: http(`http://${D}/`, 200) })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-04', stufe: 'warnung', weitere: [] })
  })

  it('T-W04: erst auf http://www, dann auf https://www: WEB-03 hinweis', async () => {
    const { k, netz } = await kette(`http://${D}/`, {
      [`http://${D}/`]: weiter(`http://${D}/`, 301, `http://${W}/`),
      [`http://${W}/`]: weiter(`http://${W}/`, 301, `https://${W}/`),
      [`https://${W}/`]: http(`https://${W}/`, 200),
    })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-03', stufe: 'hinweis', weitere: [] })
    expect(netz.zaehle('HTTP')).toBe(3)
  })

  it('T-W05: Weiterleitung auf eine fremde Domain: WEB-05 info, genau 1 Abruf', async () => {
    const { k, netz } = await kette(`http://${D}/`, { [`http://${D}/`]: weiter(`http://${D}/`, 301, 'https://shop.anbieter.example/') })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-05', stufe: 'info', weitere: ['WEB-01'] })
    expect(netz.aufrufe).toEqual([`HTTP http://${D}/`])
    expect(k.fremd).toBe('https://shop.anbieter.example/')
  })

  it('T-W06: 6 Weiterleitungen in Folge: WEB-06 warnung, genau 6 Abrufe', async () => {
    const antworten: Record<string, HttpAntwort> = {}
    for (let i = 0; i < 10; i++) antworten[`http://${D}/${i || ''}`] = weiter(`http://${D}/${i || ''}`, 301, `/${i + 1}`)
    const { k, netz } = await kette(`http://${D}/`, antworten)
    expect(k.ende).toBe('zu_lang')
    expect(netz.zaehle('HTTP')).toBe(6)
    expect(bewerteWeiterleitung(D, k)).toMatchObject({ regel: 'WEB-06', stufe: 'warnung' })
  })

  it('relative Ziele werden gegen die Adresse aufgelöst; Verbindungsfehler auf Port 80: WEB-07 info', async () => {
    const { k } = await kette(`http://${D}/`, { [`http://${D}/`]: { fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' } })
    expect(kurz(bewerteWeiterleitung(D, k))).toEqual({ regel: 'WEB-07', stufe: 'info', weitere: [] })
    const { k: k2 } = await kette(`http://${D}/a/`, { [`http://${D}/a/`]: weiter(`http://${D}/a/`, 308, `https://${D}/b`), [`https://${D}/b`]: http(`https://${D}/b`, 200) })
    expect(k2.urls).toEqual([`http://${D}/a/`, `https://${D}/b`])
    expect(bewerteWeiterleitung(D, k2).regel).toBe('WEB-01')
  })
})

describe('HTTPS erreichbar (6.6)', () => {
  it('Endstatus 200 bis 399 oder fremd: WEB-10; 4xx und 5xx: WEB-11; Zeitüberschreitung: WEB-12; anderer Fehler: WEB-14', async () => {
    const start = `https://${D}/`
    expect(bewerteHttps(D, (await kette(start, { [start]: http(start, 200) })).k).regel).toBe('WEB-10')
    expect(bewerteHttps(D, (await kette(start, { [start]: weiter(start, 301, 'https://anderswo.example/') })).k).regel).toBe('WEB-10')
    expect(bewerteHttps(D, (await kette(start, { [start]: http(start, 503) })).k)).toMatchObject({ regel: 'WEB-11', stufe: 'hinweis' })
    expect(bewerteHttps(D, (await kette(start, { [start]: { fehler: 'verbindung', text: 'Keine Verbindung' } })).k)).toMatchObject({ regel: 'WEB-12', stufe: 'warnung' })
    expect(bewerteHttps(D, (await kette(start, { [start]: { fehler: 'antwort', text: 'Ungültige Antwort' } })).k)).toMatchObject({ regel: 'WEB-14', stufe: 'fehler' })
    expect(bewerteHttps(D, (await kette(start, { [start]: { fehler: 'tls_version', text: 'kein TLS 1.2' } })).k)).toMatchObject({ regel: 'WEB-13', stufe: 'kritisch' })
  })

  it('T-W07: HTTPS mit NetzFehler tls: WEB-13 kritisch; HSTS und alle Header nicht geprüft', async () => {
    const { finde, befunde } = await website({
      dns: { [`A ${D}`]: a(D) },
      tls: { [D]: tls(D) },
      http: {
        [`http://${D}/`]: weiter(`http://${D}/`, 301, `https://${D}/`),
        [`https://${D}/`]: { fehler: 'tls', text: 'TLS-Fehler: invalid peer certificate' },
        [securityTxtAdresse(D)]: { fehler: 'tls', text: 'TLS-Fehler: invalid peer certificate' },
      },
    })
    expect(finde('https_erreichbar', D)).toMatchObject({ regel: 'WEB-13', stufe: 'kritisch' })
    expect(finde('hsts', D)).toMatchObject({ regel: 'HDR-00', stufe: 'nicht_geprueft' })
    for (const p of HEADER_PRUEF_IDS) expect(finde(p, D), p).toMatchObject({ regel: 'HDR-00', stufe: 'nicht_geprueft' })
    expect(finde('security_txt', D)).toMatchObject({ regel: 'SECTXT-00', stufe: 'fehler' })
    expect(befunde.filter((b) => b.ziel === W)).toEqual([])
  })
})

describe('HSTS (6.6)', () => {
  it('T-W08: max-age=63072000; includeSubDomains; preload: HSTS-04 ok mit includeSubDomains und preload', () => {
    const b = bewerteHsts(D, eine([['strict-transport-security', 'max-age=63072000; includeSubDomains; preload']]))
    expect(b).toMatchObject({ regel: 'HSTS-04', stufe: 'ok', werte: { maxAge: 63_072_000, includeSubDomains: true, preload: true } })
  })

  it('T-W09: max-age=86400: HSTS-03 hinweis', () => {
    expect(bewerteHsts(D, eine([['strict-transport-security', 'max-age=86400']]))).toMatchObject({ regel: 'HSTS-03', stufe: 'hinweis', werte: { includeSubDomains: false } })
  })

  it('T-W10: fehlt / max-age=0 / doppelt / in Anführungszeichen', () => {
    expect(bewerteHsts(D, eine([])).regel).toBe('HSTS-01')
    expect(bewerteHsts(D, eine([['strict-transport-security', 'max-age=0']])).regel).toBe('HSTS-02')
    expect(bewerteHsts(D, eine([['strict-transport-security', 'max-age=31536000; max-age=1']])).regel).toBe('HSTS-05')
    expect(bewerteHsts(D, eine([['strict-transport-security', 'max-age="31536000"']])).regel).toBe('HSTS-04')
    // ohne max-age oder keine Ziffernfolge
    expect(bewerteHsts(D, eine([['strict-transport-security', 'includeSubDomains']])).regel).toBe('HSTS-05')
    expect(bewerteHsts(D, eine([['strict-transport-security', 'max-age=1y']])).regel).toBe('HSTS-05')
    // Groß/klein der Namen egal, leere Direktiven übersprungen
    expect(bewerteHsts(D, eine([['strict-transport-security', ' MAX-AGE=31536000 ;; INCLUDESUBDOMAINS']]))).toMatchObject({ regel: 'HSTS-04', werte: { includeSubDomains: true } })
  })

  it('gilt an der ersten HTTPS-Antwort, auch wenn sie weiterleitet; ohne HTTPS-Antwort HDR-00', () => {
    const k: Kette = {
      urls: [`https://${D}/`, `https://${W}/`],
      antworten: [http(`https://${D}/`, 301, [['location', `https://${W}/`], ['strict-transport-security', 'max-age=31536000']]), http(`https://${W}/`, 200)],
      ende: 'fertig',
    }
    expect(bewerteHsts(D, k).regel).toBe('HSTS-04')
    expect(bewerteHsts(D, { urls: [`https://${D}/`], antworten: [], ende: 'fehler', fehler: { fehler: 'verbindung', text: 'Keine Verbindung' } })).toMatchObject({ regel: 'HDR-00', stufe: 'nicht_geprueft' })
  })
})

describe('Sicherheits-Header (6.6)', () => {
  it('T-W11: keine CSP / nur Report-Only: CSP-03 / CSP-02, beide hinweis', () => {
    expect(header([]).csp).toMatchObject({ regel: 'CSP-03', stufe: 'hinweis' })
    expect(header([['content-security-policy-report-only', "default-src 'self'"]]).csp).toMatchObject({ regel: 'CSP-02', stufe: 'hinweis' })
    expect(header([['content-security-policy', "default-src 'self'"]]).csp).toMatchObject({ regel: 'CSP-01', stufe: 'ok' })
    expect(header([['content-security-policy', '  ']]).csp.regel).toBe('CSP-03')
  })

  it("T-W12: CSP frame-ancestors 'none' ohne XFO / XFO ALLOWALL ohne CSP: FRAME-01 / FRAME-02", () => {
    expect(header([['content-security-policy', "default-src 'self'; Frame-Ancestors 'none'"]]).clickjacking).toMatchObject({ regel: 'FRAME-01', stufe: 'ok' })
    expect(header([['x-frame-options', 'ALLOWALL']]).clickjacking).toMatchObject({ regel: 'FRAME-02', stufe: 'hinweis' })
    expect(header([['x-frame-options', 'sameorigin']]).clickjacking.regel).toBe('FRAME-01')
    // frame-ancestors nur im Report-Only schützt nicht
    expect(header([['content-security-policy-report-only', "frame-ancestors 'none'"]]).clickjacking.regel).toBe('FRAME-02')
  })

  it('T-W13: Server mit Version / ohne / X-Powered-By: SRV-02 / SRV-01 / SRV-02', () => {
    expect(header([['server', 'Apache/2.4.41 (Ubuntu)']]).server_angaben).toMatchObject({ regel: 'SRV-02', stufe: 'hinweis' })
    expect(header([['server', 'nginx']]).server_angaben).toMatchObject({ regel: 'SRV-01', stufe: 'ok' })
    expect(header([['x-powered-by', 'PHP/8.3.1']]).server_angaben).toMatchObject({ regel: 'SRV-02', messwert: 'X-Powered-By: PHP/8.3.1' })
  })

  it('T-W14: Cookie ohne Secure: COOKIE-02 hinweis, Messwert „sid“, kein Cookie-Wert im Befund', () => {
    const b = header([['set-cookie', 'sid=…; HttpOnly']]).cookies
    expect(b).toMatchObject({ regel: 'COOKIE-02', stufe: 'hinweis' })
    expect(b.messwert).toContain('sid')
    expect(JSON.stringify(b)).not.toContain('=…')
    expect(header([]).cookies.regel).toBe('COOKIE-00')
    expect(header([['set-cookie', 'a=…; Secure; HttpOnly'], ['set-cookie', 'b=…; secure']]).cookies).toMatchObject({ regel: 'COOKIE-01', stufe: 'ok' })
    // „Secure“ nur als Attribut, nicht als Teil des Namens
    expect(header([['set-cookie', 'secure=…; Path=/']]).cookies.regel).toBe('COOKIE-02')
  })

  it('T-W16: Referrer-Policy fehlt / unsafe-url; X-XSS-Protection 1; mode=block', () => {
    expect(header([]).referrer_policy).toMatchObject({ regel: 'REF-02', stufe: 'info' })
    expect(header([['referrer-policy', 'unsafe-url']]).referrer_policy).toMatchObject({ regel: 'REF-03', stufe: 'hinweis' })
    // der letzte Wert der Liste zählt
    expect(header([['referrer-policy', 'no-referrer-when-downgrade, strict-origin-when-cross-origin']]).referrer_policy.regel).toBe('REF-01')
    expect(header([['referrer-policy', 'no-referrer'], ['referrer-policy', 'unsafe-url']]).referrer_policy.regel).toBe('REF-03')
    expect(header([['x-xss-protection', '1; mode=block']]).x_xss_protection).toMatchObject({ regel: 'XXSS-02', stufe: 'hinweis' })
    expect(header([['x-xss-protection', '0']]).x_xss_protection.regel).toBe('XXSS-01')
    expect(header([]).x_xss_protection.regel).toBe('XXSS-01')
  })

  it('X-Content-Type-Options: nosniff ok, sonst hinweis', () => {
    expect(header([['x-content-type-options', ' NoSniff ']]).x_content_type_options.regel).toBe('XCTO-01')
    expect(header([]).x_content_type_options).toMatchObject({ regel: 'XCTO-02', stufe: 'hinweis' })
  })
})

describe('security.txt (6.6)', () => {
  const url = securityTxtAdresse(D)
  const datei = (expires: string) => `# Sicherheitskontakt\nContact: mailto:it@firma.test\nExpires: ${expires}\n`

  it('T-W15: gültig / abgelaufen / 404: SECTXT-02 / SECTXT-04 / SECTXT-01', () => {
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/plain; charset=utf-8']], 200, url, datei('2027-06-30T00:00:00Z')), JETZT)).toMatchObject({ regel: 'SECTXT-02', stufe: 'ok' })
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/plain']], 200, url, datei('2026-01-01T00:00:00Z')), JETZT)).toMatchObject({ regel: 'SECTXT-04', stufe: 'hinweis' })
    expect(bewerteSecurityTxt(D, eine([], 404, url), JETZT)).toMatchObject({ regel: 'SECTXT-01', stufe: 'info' })
  })

  it('falscher Typ, kein Contact oder nicht genau ein Expires: SECTXT-03', () => {
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/html']], 200, url, datei('2027-06-30T00:00:00Z')), JETZT).regel).toBe('SECTXT-03')
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/plain']], 200, url, 'Expires: 2027-06-30T00:00:00Z\n'), JETZT).regel).toBe('SECTXT-03')
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/plain']], 200, url, `${datei('2027-06-30T00:00:00Z')}EXPIRES: 2027-07-01T00:00:00Z\n`), JETZT).regel).toBe('SECTXT-03')
    expect(bewerteSecurityTxt(D, eine([['content-type', 'text/plain']], 200, url, datei('bald')), JETZT).regel).toBe('SECTXT-03')
  })
})

describe('Website im Ablauf (6.6, 6.7)', () => {
  it('T-W17: Weiterleitung auf einen anderen Port (nicht_erlaubt): http WEB-08, https WEB-14, Header nicht geprüft', async () => {
    const port = 'https://firma.test:8443/'
    const { finde } = await website({
      dns: { [`A ${D}`]: a(D) },
      tls: { [D]: tls(D) },
      http: {
        [`http://${D}/`]: weiter(`http://${D}/`, 301, port),
        [`https://${D}/`]: weiter(`https://${D}/`, 301, port),
        [port]: { fehler: 'nicht_erlaubt', text: 'Nur der Standardport, nicht 8443' },
        [securityTxtAdresse(D)]: http(securityTxtAdresse(D), 404),
      },
    })
    expect(finde('http_weiterleitung', D)).toMatchObject({ regel: 'WEB-08', stufe: 'fehler' })
    expect(finde('https_erreichbar', D)).toMatchObject({ regel: 'WEB-14', stufe: 'fehler' })
    for (const p of HEADER_PRUEF_IDS) expect(finde(p, D)?.regel, p).toBe('HDR-00')
  })

  it('T-W18: A und AAAA für www scheitern (Status 2): WEB-09 für www, kein HTTP- oder TLS-Abruf an www', async () => {
    const { finde, netz } = await website({
      dns: { [`A ${D}`]: a(D), [`A ${W}`]: servfail(), [`AAAA ${W}`]: servfail() },
      tls: { [D]: tls(D) },
      http: { [`http://${D}/`]: weiter(`http://${D}/`, 301, `https://${D}/`), [`https://${D}/`]: http(`https://${D}/`, 200), [securityTxtAdresse(D)]: http(securityTxtAdresse(D), 404) },
    })
    for (const p of ['http_weiterleitung', 'https_erreichbar', 'zertifikat', 'tls_version', 'hsts']) expect(finde(p, W), p).toMatchObject({ regel: 'WEB-09', stufe: 'fehler' })
    expect(netz.aufrufe.filter((x) => x.includes(W) && !x.startsWith('DNS'))).toEqual([])
    expect(finde('https_erreichbar', D)?.regel).toBe('WEB-10')
  })

  it('weder D noch W haben Adressen: WEB-00, keine Website-Abrufe', async () => {
    const { befunde, netz } = await website({ dns: {} })
    expect(befunde.map((b) => `${b.pruefId} ${b.ziel} ${b.regel} ${b.stufe}`)).toEqual([`https_erreichbar ${D} WEB-00 info`])
    expect(netz.aufrufe).toEqual([`DNS A ${D}`, `DNS AAAA ${D}`, `DNS A ${W}`, `DNS AAAA ${W}`])
  })

  it('MTA-STS-Eintrag: Zertifikat und TLS auch für mta-sts.D, auch ohne Website', async () => {
    const S = `mta-sts.${D}`
    const { finde, netz } = await website({ dns: {}, tls: { [S]: tls(S, { version: 'TLS 1.2', suite: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256' }) } }, true)
    expect(finde('zertifikat', S)?.regel).toBe('CERT-06')
    expect(finde('tls_version', S)?.regel).toBe('TLS-02')
    expect(netz.zaehle('TLS')).toBe(1)
  })

  it('gleiche Endadresse für D und W: Header nur einmal, Ziel ist der Host der Endadresse; Reihenfolge TLS vor HTTP', async () => {
    const ende = `https://${W}/`
    const { befunde, netz } = await website({
      dns: { [`A ${D}`]: a(D), [`AAAA ${W}`]: daten(W, 'AAAA', ['2001:470::1']) },
      tls: { [D]: tls(D), [W]: tls(W) },
      http: {
        [`http://${D}/`]: weiter(`http://${D}/`, 301, ende),
        [`http://${W}/`]: weiter(`http://${W}/`, 301, ende),
        [`https://${D}/`]: weiter(`https://${D}/`, 301, ende),
        [ende]: http(ende, 200, [['strict-transport-security', 'max-age=31536000'], ['x-content-type-options', 'nosniff']]),
        [securityTxtAdresse(D)]: http(securityTxtAdresse(D), 404),
      },
    })
    for (const p of HEADER_PRUEF_IDS) expect(befunde.filter((b) => b.pruefId === p).map((b) => b.ziel), p).toEqual([W])
    expect(befunde.find((b) => b.pruefId === 'x_content_type_options')?.regel).toBe('XCTO-01')
    // HSTS an der ersten HTTPS-Antwort: für D fehlt die Kopfzeile in der Weiterleitung
    expect(befunde.filter((b) => b.pruefId === 'hsts').map((b) => `${b.ziel} ${b.regel}`)).toEqual([`${D} HSTS-01`, `${W} HSTS-04`])
    const arten = netz.aufrufe.map((x) => x.split(' ')[0])
    expect(arten.lastIndexOf('DNS')).toBeLessThan(arten.indexOf('TLS'))
    expect(arten.lastIndexOf('TLS')).toBeLessThan(arten.indexOf('HTTP'))
    // jede Prüfung höchstens einmal je Ziel
    const schluessel = befunde.map((b) => `${b.pruefId} ${b.ziel}`)
    expect(new Set(schluessel).size).toBe(schluessel.length)
    expect(new Set(befunde.map((b) => b.pruefId))).toEqual(new Set(WEBSITE_PRUEF_IDS))
  })

  it('Grenze der HTTP-Abrufe: übrige Website-Prüfungen WEB-15 „Grenze erreicht“', async () => {
    const { netz, lauf } = testlauf(
      { modus: 'desktop', dns: { [`A ${D}`]: a(D) }, tls: { [D]: tls(D) }, http: { [`http://${D}/`]: weiter(`http://${D}/`, 301, `https://${D}/`), [`https://${D}/`]: http(`https://${D}/`, 200) } },
      { http: 1 },
    )
    const befunde = await pruefeWebsite(lauf, D, { mitMtaSts: false, jetzt: () => JETZT, melde: () => {} })
    expect(netz.zaehle('HTTP')).toBe(1)
    const nachRegel = (r: string) => befunde.filter((b) => b.regel === r).map((b) => b.pruefId)
    // die http-Kette scheitert am zweiten Abruf (https://D/), alle späteren gleich am ersten
    expect(nachRegel('WEB-15')).toEqual(['http_weiterleitung', 'https_erreichbar', 'hsts', ...HEADER_PRUEF_IDS, 'security_txt'])
    expect(befunde.filter((b) => b.regel === 'WEB-15').every((b) => b.messwert === 'Grenze erreicht' && b.stufe === 'fehler')).toBe(true)
    // TLS hat eine eigene Grenze und lief vorher
    expect(befunde.find((b) => b.pruefId === 'zertifikat')?.regel).toBe('CERT-06')
  })
})
