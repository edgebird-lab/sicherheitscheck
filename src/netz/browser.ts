/**
 * Netz im Browser (Spezifikation 6.4, 7.8): DNS über HTTPS im JSON-Format bei Cloudflare oder
 * Google. HTTP- und TLS-Abrufe fremder Websites sind im Browser nicht möglich; sie liefern
 * `nicht_verfuegbar`. Wiederholversuch, Zwischenspeicher, Grenzen und Protokoll regelt der Lauf
 * (src/pruefung/lauf.ts); hier steht genau ein Versuch je Aufruf.
 */
import type { DohAnbieter, DnsTyp, Netz, NetzFehler } from '../modell/typen'
import { ausDohJson } from './schnittstelle'

/** Zeitlimit je DNS-Abfrage (6.4, 6.7) */
export const DNS_ZEITLIMIT_MS = 5000
/** Größte angenommene Antwort; wie im Windows-Programm (7.7) */
const MAX_ANTWORT_ZEICHEN = 65_536

export const ANBIETER_NAME: Record<DohAnbieter, string> = { cloudflare: 'Cloudflare', google: 'Google' }

/** Adresse der Anfrage nach 6.4 */
export function dohAdresse(anbieter: DohAnbieter, name: string, typ: DnsTyp, ohneDnssecPruefung = false): string {
  const parameter = new URLSearchParams({ name, type: typ })
  if (ohneDnssecPruefung) parameter.set('cd', '1')
  if (anbieter === 'google') {
    // keine Angaben zum Netz des Beraters an Google (Spezifikation 8)
    parameter.set('edns_client_subnet', '0.0.0.0/0')
    return `https://dns.google/resolve?${parameter}`
  }
  return `https://cloudflare-dns.com/dns-query?${parameter}`
}

export interface BrowserNetzOptionen {
  anbieter: DohAnbieter
  /** bricht laufende Abfragen ab (Knopf „Abbrechen“) */
  signal?: AbortSignal
  /** für Tests austauschbar */
  fetch?: typeof fetch
  zeitlimitMs?: number
}

const NICHT_IM_BROWSER: NetzFehler = { fehler: 'nicht_verfuegbar', text: 'Im Browser nicht möglich; nur im Windows-Programm.' }

export function browserNetz(o: BrowserNetzOptionen): Netz {
  const abrufen = o.fetch ?? ((eingabe: RequestInfo | URL, init?: RequestInit) => fetch(eingabe, init))
  const zeitlimit = o.zeitlimitMs ?? DNS_ZEITLIMIT_MS

  return {
    modus: 'browser',
    async dns(name, typ, ohneDnssecPruefung = false) {
      const zeit = AbortSignal.timeout(zeitlimit)
      const signal = o.signal ? AbortSignal.any([zeit, o.signal]) : zeit
      let antwort: Response
      try {
        antwort = await abrufen(dohAdresse(o.anbieter, name, typ, ohneDnssecPruefung), {
          method: 'GET',
          headers: o.anbieter === 'cloudflare' ? { accept: 'application/dns-json' } : undefined,
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          signal,
        })
      } catch (e) {
        if (zeit.aborted) return { fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' }
        if (o.signal?.aborted) return { fehler: 'verbindung', text: 'abgebrochen' }
        return { fehler: 'verbindung', text: `Keine Verbindung zum DNS-Anbieter${e instanceof Error && e.message ? ` (${e.message})` : ''}` }
      }
      if (antwort.status !== 200) return { fehler: 'antwort', text: `HTTP ${antwort.status}`, httpStatus: antwort.status }
      let text: string
      try {
        text = await antwort.text()
      } catch {
        return zeit.aborted ? { fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' } : { fehler: 'verbindung', text: 'Antwort unvollständig' }
      }
      if (text.length > MAX_ANTWORT_ZEICHEN) return { fehler: 'antwort', text: 'Antwort zu groß' }
      try {
        return ausDohJson(JSON.parse(text))
      } catch {
        return { fehler: 'antwort', text: 'Antwort ist kein JSON' }
      }
    },
    http: async () => NICHT_IM_BROWSER,
    tls: async () => NICHT_IM_BROWSER,
  }
}
