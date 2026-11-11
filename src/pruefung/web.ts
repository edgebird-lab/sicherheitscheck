/**
 * Website im Windows-Programm (Spezifikation 6.6): Vorprüfung der Hosts über A und AAAA,
 * Weiterleitungen folgen (`folge`), Regeln „HTTP auf HTTPS“ und „HTTPS erreichbar“.
 * Weitergeleitet wird nur innerhalb der geprüften Domain D und ihrer Subdomains; eine
 * fremde Domain wird nie abgerufen.
 */
import type { Befund, HttpAntwort, NetzFehler, PruefId } from '../modell/typen'
import { istNetzFehler } from '../netz/schnittstelle'
import { lage } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

/** Höchstens so viele Abrufe je Kette (6 = Start und 5 Weiterleitungen) */
export const MAX_ABRUFE_JE_KETTE = 6
const WEITERLEITUNG = new Set([301, 302, 303, 307, 308])

/** Website-Prüfungen eines Hosts (ohne Header und security.txt) */
export const HOST_PRUEF_IDS: PruefId[] = ['http_weiterleitung', 'https_erreichbar', 'zertifikat', 'tls_version', 'hsts']
/** Sicherheits-Header an der Endantwort einer HTTPS-Kette */
export const HEADER_PRUEF_IDS: PruefId[] = ['csp', 'x_content_type_options', 'clickjacking', 'referrer_policy', 'x_xss_protection', 'server_angaben', 'cookies']

/* ---------- Vorprüfung ---------- */

export type HostStand = { art: 'da' } | { art: 'fehlt' } | { art: 'gescheitert'; grund: string }

/**
 * A und AAAA eines Hosts: Er existiert, wenn mindestens eine Antwort vom angefragten Typ kommt.
 * Sonst „gescheitert“, wenn eine der Abfragen scheiterte, und „fehlt“, wenn beide nichts lieferten.
 */
export async function vorpruefung(lauf: Lauf, host: string): Promise<HostStand> {
  const gruende: string[] = []
  let da = false
  for (const typ of ['A', 'AAAA'] as const) {
    const l = lage(await lauf.dns(host, typ), typ)
    if (l.art === 'daten') da = true
    else if (l.art === 'gescheitert') gruende.push(`${typ}: ${l.grund}`)
  }
  if (da) return { art: 'da' }
  return gruende.length > 0 ? { art: 'gescheitert', grund: gruende.join('; ') } : { art: 'fehlt' }
}

/* ---------- Weiterleitungen ---------- */

/** D selbst oder eine Subdomain von D */
export function gehoertZu(host: string, D: string): boolean {
  return host === D || host.endsWith(`.${D}`)
}

export interface Kette {
  /** abgerufene Adressen in Reihenfolge; `antworten[i]` gehört zu `urls[i]` */
  urls: string[]
  antworten: HttpAntwort[]
  ende: 'fertig' | 'fremd' | 'zu_lang' | 'fehler'
  /** bei „fehler“: der Fehler des letzten Abrufs (dessen Adresse ist die letzte in `urls`) */
  fehler?: NetzFehler
  /** bei „fremd“: das nicht abgerufene Ziel */
  fremd?: string
}

export function kopf(r: HttpAntwort, name: string): string | undefined {
  return r.kopfzeilen.find(([n]) => n === name)?.[1]
}

export function alleKopf(r: HttpAntwort, name: string): string[] {
  return r.kopfzeilen.filter(([n]) => n === name).map(([, w]) => w)
}

/** Ziel einer Weiterleitung, aufgelöst gegen die Adresse; null ohne gültige location */
function weiterZu(r: HttpAntwort, url: string): URL | null {
  const ort = kopf(r, 'location')
  if (!WEITERLEITUNG.has(r.status) || ort === undefined) return null
  try {
    return new URL(ort, url)
  } catch {
    return null
  }
}

/** Weiterleitungen folgen (6.6), höchstens 6 Abrufe; fremde Ziele werden nicht abgerufen. */
export async function folge(lauf: Lauf, D: string, start: string): Promise<Kette> {
  const k: Kette = { urls: [], antworten: [], ende: 'zu_lang' }
  let url = start
  for (let i = 0; i < MAX_ABRUFE_JE_KETTE; i++) {
    k.urls.push(url)
    const r = await lauf.http(url)
    if (istNetzFehler(r)) return { ...k, ende: 'fehler', fehler: r }
    k.antworten.push(r)
    const naechste = weiterZu(r, url)
    if (!naechste) return { ...k, ende: 'fertig' }
    if (!gehoertZu(naechste.hostname, D)) return { ...k, ende: 'fremd', fremd: naechste.href }
    url = naechste.href
  }
  return k
}

/** Kette für den Messwert, z. B. 'http://firma.de/ 301 → https://firma.de/ 200' */
export function ketteText(k: Kette): string {
  const teile = k.antworten.map((r, i) => `${k.urls[i]} ${r.status}`)
  if (k.ende === 'fehler') teile.push(`${k.urls[k.urls.length - 1]}: ${k.fehler?.text ?? 'Fehler'}`)
  if (k.ende === 'fremd') teile.push(`${k.fremd} (andere Domain, nicht abgerufen)`)
  if (k.ende === 'zu_lang') teile.push(`… (${MAX_ABRUFE_JE_KETTE} Weiterleitungen in Folge)`)
  return teile.join(' → ')
}

const istHttps = (url: string) => url.startsWith('https:')
const istHttp = (url: string) => url.startsWith('http:')

/* ---------- Regeln ---------- */

/** HTTP auf HTTPS (`http_weiterleitung`, Start http://host/) */
export function bewerteWeiterleitung(host: string, k: Kette): Befund {
  const regeln: string[] = []
  const erste = k.antworten[0]
  const erstesZiel = erste ? weiterZu(erste, k.urls[0]) : null
  if (k.ende === 'fertig' && istHttp(k.urls[k.urls.length - 1])) regeln.push('WEB-04')
  if (k.ende === 'zu_lang') regeln.push('WEB-06')
  if (erste && erstesZiel?.protocol === 'https:' && [302, 303, 307].includes(erste.status)) regeln.push('WEB-02')
  if (erstesZiel?.protocol === 'http:' && (k.urls.slice(1).some(istHttps) || (k.fremd !== undefined && istHttps(k.fremd)))) regeln.push('WEB-03')
  if (k.ende === 'fremd') regeln.push('WEB-05')
  if (k.ende === 'fehler') {
    const art = k.fehler?.fehler
    const http = istHttp(k.urls[k.urls.length - 1])
    regeln.push(http && (art === 'zeitueberschreitung' || art === 'verbindung') ? 'WEB-07' : 'WEB-08')
  }
  if (erste && erstesZiel?.protocol === 'https:' && (erste.status === 301 || erste.status === 308)) regeln.push('WEB-01')
  // Kann nach den Regeln oben nicht vorkommen; vorsichtshalber „nicht prüfbar“
  if (regeln.length === 0) regeln.push('WEB-08')
  return befund('http_weiterleitung', host, regeln, ketteText(k), { abrufe: k.urls.length })
}

/** HTTPS erreichbar (`https_erreichbar`, Start https://host/) */
export function bewerteHttps(host: string, k: Kette): Befund {
  let regel: string
  if (k.ende === 'fehler') {
    const art = k.fehler?.fehler
    regel = art === 'tls' || art === 'tls_version' ? 'WEB-13' : art === 'zeitueberschreitung' || art === 'verbindung' ? 'WEB-12' : 'WEB-14'
  } else if (k.ende === 'zu_lang') {
    regel = 'WEB-11'
  } else if (k.ende === 'fremd') {
    regel = 'WEB-10'
  } else {
    const status = k.antworten[k.antworten.length - 1].status
    regel = status >= 400 ? 'WEB-11' : status >= 200 ? 'WEB-10' : 'WEB-14'
  }
  return befund('https_erreichbar', host, [regel], ketteText(k), { abrufe: k.urls.length })
}

/** Endantwort einer HTTPS-Kette für die Sicherheits-Header; null bei Fehler, „fremd“ oder „zu lang“ */
export function endantwort(k: Kette): { url: string; antwort: HttpAntwort } | null {
  if (k.ende !== 'fertig') return null
  return { url: k.urls[k.urls.length - 1], antwort: k.antworten[k.antworten.length - 1] }
}
