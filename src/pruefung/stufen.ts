/**
 * Stufen, Befunde und Gruppen der Außenprüfung (Spezifikation 6.5). Je (pruefId, ziel) entsteht
 * genau ein Befund; Hauptregel ist die schwerste zutreffende Regel, bei gleicher Stufe die, die in
 * der Tabelle zuerst steht. Alle anderen zutreffenden Regeln stehen in `weitere`.
 */
import { regelPosition, regeltext } from '../katalog/regeltexte'
import type { Befund, PruefId, Stufe } from '../modell/typen'

/** Schwerste zuerst: kritisch > warnung > hinweis > fehler > info > ok > nicht_geprueft */
export const STUFEN: Stufe[] = ['kritisch', 'warnung', 'hinweis', 'fehler', 'info', 'ok', 'nicht_geprueft']

/** größer = schwerer */
export function schwere(s: Stufe): number {
  return STUFEN.length - STUFEN.indexOf(s)
}

/** Reihenfolge der Prüfungen wie im Typ PruefId (Sortierung von Befunden und Maßnahmen, 6.8) */
export const PRUEF_IDS: PruefId[] = [
  'mx',
  'spf',
  'dmarc',
  'dkim',
  'mta_sts',
  'tls_rpt',
  'dnssec',
  'caa',
  'http_weiterleitung',
  'https_erreichbar',
  'zertifikat',
  'tls_version',
  'hsts',
  'csp',
  'x_content_type_options',
  'clickjacking',
  'referrer_policy',
  'x_xss_protection',
  'server_angaben',
  'cookies',
  'security_txt',
]

export const WEBSITE_PRUEF_IDS: PruefId[] = PRUEF_IDS.slice(PRUEF_IDS.indexOf('http_weiterleitung'))

export const PRUEF_NAME: Record<PruefId, string> = {
  mx: 'Mailserver (MX)',
  spf: 'SPF',
  dmarc: 'DMARC',
  dkim: 'DKIM',
  mta_sts: 'MTA-STS',
  tls_rpt: 'TLS-RPT',
  dnssec: 'DNSSEC',
  caa: 'CAA',
  http_weiterleitung: 'Weiterleitung auf HTTPS',
  https_erreichbar: 'HTTPS erreichbar',
  zertifikat: 'Zertifikat',
  tls_version: 'TLS-Version',
  hsts: 'HSTS',
  csp: 'Content-Security-Policy',
  x_content_type_options: 'X-Content-Type-Options',
  clickjacking: 'Schutz vor Clickjacking',
  referrer_policy: 'Referrer-Policy',
  x_xss_protection: 'X-XSS-Protection',
  server_angaben: 'Server-Angaben',
  cookies: 'Cookies',
  security_txt: 'security.txt',
}

export type GruppeId = 'email' | 'domain' | 'website'

/** Gruppen der Anzeige (5.6) */
export const GRUPPEN: { id: GruppeId; name: string; pruefIds: PruefId[] }[] = [
  { id: 'email', name: 'E-Mail', pruefIds: ['mx', 'spf', 'dmarc', 'dkim', 'mta_sts', 'tls_rpt'] },
  { id: 'domain', name: 'Domain', pruefIds: ['dnssec', 'caa'] },
  { id: 'website', name: 'Website', pruefIds: WEBSITE_PRUEF_IDS },
]

/** Präfix der Regel „nicht prüfbar“ je DNS-Prüfung (6.5); DNSSEC nutzt DNSSEC-04 */
export const REGEL_NICHT_PRUEFBAR: Partial<Record<PruefId, string>> = {
  mx: 'MX-00',
  spf: 'SPF-00',
  dmarc: 'DMARC-00',
  dkim: 'DKIM-00',
  mta_sts: 'STS-00',
  tls_rpt: 'RPT-00',
  dnssec: 'DNSSEC-04',
  caa: 'CAA-00',
}

/** Messwerte höchstens 300 Zeichen (4) */
export const MAX_MESSWERT = 300

export function kuerze(text: string, max = MAX_MESSWERT): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

/** Befund aus allen zutreffenden Regeln; die Stufen kommen aus den Regeltexten. */
export function befund(pruefId: PruefId, ziel: string, regeln: string[], messwert: string, werte: Befund['werte'] = {}): Befund {
  if (regeln.length === 0) throw new Error(`Keine Regel für ${pruefId}`)
  const sortiert = [...new Set(regeln)]
    .map((regel) => ({ regel, stufe: regeltext(regel).stufe, position: regelPosition(regel) }))
    .sort((a, b) => schwere(b.stufe) - schwere(a.stufe) || a.position - b.position)
  const [haupt, ...rest] = sortiert
  return {
    pruefId,
    ziel,
    stufe: haupt.stufe,
    regel: haupt.regel,
    weitere: rest.map(({ regel, stufe }) => ({ regel, stufe })),
    messwert: kuerze(messwert),
    werte,
  }
}

/** Anzahl je Stufe, schwerste zuerst; Stufen ohne Befund fehlen */
export function zaehleStufen(befunde: Befund[]): { stufe: Stufe; anzahl: number }[] {
  return STUFEN.map((stufe) => ({ stufe, anzahl: befunde.filter((b) => b.stufe === stufe).length })).filter((z) => z.anzahl > 0)
}
