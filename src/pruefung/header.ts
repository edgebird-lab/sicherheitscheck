/**
 * Sicherheits-Header an der Endantwort einer HTTPS-Kette (Spezifikation 6.6): CSP,
 * X-Content-Type-Options, Schutz vor Clickjacking, Referrer-Policy, X-XSS-Protection,
 * Server-Angaben und Cookies. Ziel ist der Host der End-Adresse. Cookie-Werte kommen gar
 * nicht erst an (der Rust-Teil ersetzt sie durch „…“); der Messwert nennt nur Namen.
 */
import type { Befund, HttpAntwort } from '../modell/typen'
import { befund } from './stufen'
import { alleKopf, kopf } from './web'

const FEHLT = 'fehlt'

/** Namen der Direktiven einer CSP, klein */
function direktiven(csp: string): string[] {
  return csp
    .split(';')
    .map((d) => d.trim().split(/\s+/)[0]?.toLowerCase() ?? '')
    .filter((d) => d !== '')
}

function csp(ziel: string, r: HttpAntwort): Befund {
  const richtlinien = alleKopf(r, 'content-security-policy').filter((w) => w.trim() !== '')
  if (richtlinien.length > 0) return befund('csp', ziel, ['CSP-01'], richtlinien.join(' | '))
  const nurBericht = alleKopf(r, 'content-security-policy-report-only').filter((w) => w.trim() !== '')
  if (nurBericht.length > 0) return befund('csp', ziel, ['CSP-02'], `nur Report-Only: ${nurBericht.join(' | ')}`)
  return befund('csp', ziel, ['CSP-03'], FEHLT)
}

function xcto(ziel: string, r: HttpAntwort): Befund {
  const wert = kopf(r, 'x-content-type-options')
  return befund('x_content_type_options', ziel, [wert?.trim().toLowerCase() === 'nosniff' ? 'XCTO-01' : 'XCTO-02'], wert ?? FEHLT)
}

function clickjacking(ziel: string, r: HttpAntwort): Befund {
  const mitFrameAncestors = alleKopf(r, 'content-security-policy').some((c) => direktiven(c).includes('frame-ancestors'))
  const xfo = kopf(r, 'x-frame-options')
  const ok = mitFrameAncestors || ['DENY', 'SAMEORIGIN'].includes(xfo?.trim().toUpperCase() ?? '')
  const teile = [mitFrameAncestors ? 'CSP frame-ancestors' : null, xfo !== undefined ? `X-Frame-Options: ${xfo}` : null].filter((t) => t !== null)
  return befund('clickjacking', ziel, [ok ? 'FRAME-01' : 'FRAME-02'], teile.length > 0 ? teile.join('; ') : FEHLT)
}

function referrer(ziel: string, r: HttpAntwort): Befund {
  const werte = alleKopf(r, 'referrer-policy')
    .join(',')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w !== '')
  if (werte.length === 0) return befund('referrer_policy', ziel, ['REF-02'], FEHLT)
  const letzter = werte[werte.length - 1]
  return befund('referrer_policy', ziel, [['unsafe-url', 'no-referrer-when-downgrade'].includes(letzter) ? 'REF-03' : 'REF-01'], werte.join(', '))
}

function xxss(ziel: string, r: HttpAntwort): Befund {
  const wert = kopf(r, 'x-xss-protection')
  return befund('x_xss_protection', ziel, [wert !== undefined && !wert.trim().startsWith('0') ? 'XXSS-02' : 'XXSS-01'], wert ?? FEHLT)
}

function server(ziel: string, r: HttpAntwort): Befund {
  const s = kopf(r, 'server')
  const x = kopf(r, 'x-powered-by')
  const teile = [s !== undefined ? `Server: ${s}` : null, x !== undefined ? `X-Powered-By: ${x}` : null].filter((t) => t !== null)
  return befund('server_angaben', ziel, [(s !== undefined && /\d/.test(s)) || x !== undefined ? 'SRV-02' : 'SRV-01'], teile.length > 0 ? teile.join('; ') : 'keine Angaben')
}

/** Name eines Cookies aus `name=…; Attribute` */
function cookieName(c: string): string {
  return c.split(';')[0].split('=')[0].trim()
}

function hatSecure(c: string): boolean {
  return c
    .split(';')
    .slice(1)
    .some((a) => a.trim().toLowerCase() === 'secure')
}

function cookies(ziel: string, r: HttpAntwort): Befund {
  const alle = alleKopf(r, 'set-cookie')
  if (alle.length === 0) return befund('cookies', ziel, ['COOKIE-00'], 'keine Cookies')
  const ohne = alle.filter((c) => !hatSecure(c)).map(cookieName)
  if (ohne.length > 0) return befund('cookies', ziel, ['COOKIE-02'], `ohne Secure: ${ohne.join(', ')}`, { ohneSecure: ohne.join(', '), anzahl: alle.length })
  return befund('cookies', ziel, ['COOKIE-01'], `${alle.length === 1 ? '1 Cookie' : `${alle.length} Cookies`} mit Secure: ${alle.map(cookieName).join(', ')}`, { anzahl: alle.length })
}

/** Alle sieben Header-Prüfungen für die Endantwort einer Kette */
export function bewerteHeader(ziel: string, r: HttpAntwort): Befund[] {
  return [csp, xcto, clickjacking, referrer, xxss, server, cookies].map((f) => f(ziel, r))
}
