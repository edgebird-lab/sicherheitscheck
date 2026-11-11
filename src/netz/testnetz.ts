/**
 * Testnetz: nachgebildete Antworten für Unit-Tests (Spezifikation 9). Kein Test fragt echte
 * Domains ab; Namen liegen unter .test und example.* (RFC 2606, 6761).
 *
 * DNS-Schlüssel: 'TYP name' bzw. 'TYP name cd' für Abfragen ohne DNSSEC-Prüfung, z. B.
 * 'TXT _dmarc.firma.test'. Nicht hinterlegte Namen antworten mit NOERROR ohne Daten (NODATA).
 * Eine Liste liefert die Antworten nacheinander (für Wiederholversuche); danach die letzte.
 */
import type { DnsAntwort, DnsTyp, HttpAntwort, Modus, Netz, NetzFehler, TlsInfo } from '../modell/typen'
import { normName, TYP_NUMMER } from './schnittstelle'

export type DnsEintrag = DnsAntwort | NetzFehler | (DnsAntwort | NetzFehler)[]

export interface TestnetzDaten {
  modus?: Modus
  dns?: Record<string, DnsEintrag>
  /** Schlüssel: URL */
  http?: Record<string, HttpAntwort | NetzFehler>
  /** Schlüssel: Host */
  tls?: Record<string, TlsInfo | NetzFehler>
  /** vor jeder Antwort gerufen, z. B. um nach dem dritten Abruf abzubrechen */
  beiAufruf?: (nr: number, aufruf: string) => void
  /** Antwort auf die Freigabe im Windows-Programm; Standard: Erfolg */
  freigabe?: NetzFehler
}

export interface Testnetz extends Netz {
  /** alle Aufrufe in Reihenfolge, z. B. 'DNS TXT firma.test', 'HTTP https://…', 'TLS firma.test' */
  aufrufe: string[]
  /** freigegebene Domains (nur Windows-Programm) */
  freigaben: string[]
  zaehle(art: 'DNS' | 'HTTP' | 'TLS'): number
}

const NICHT_VERFUEGBAR: NetzFehler = { fehler: 'nicht_verfuegbar', text: 'Im Browser nicht möglich; nur im Windows-Programm.' }

export function testnetz(d: TestnetzDaten = {}): Testnetz {
  const modus = d.modus ?? 'browser'
  const aufrufe: string[] = []
  const zaehlerJeSchluessel = new Map<string, number>()

  const melde = (aufruf: string) => {
    aufrufe.push(aufruf)
    d.beiAufruf?.(aufrufe.length, aufruf)
  }

  const freigaben: string[] = []
  return {
    modus,
    aufrufe,
    freigaben,
    zaehle: (art) => aufrufe.filter((a) => a.startsWith(`${art} `)).length,
    async freigeben(domain) {
      freigaben.push(domain)
      return d.freigabe ?? null
    },
    async dns(name, typ, ohneDnssecPruefung = false) {
      const schluessel = `${typ} ${normName(name)}${ohneDnssecPruefung ? ' cd' : ''}`
      melde(`DNS ${schluessel}`)
      const eintrag = d.dns?.[schluessel] ?? leer()
      if (!Array.isArray(eintrag)) return kopie(eintrag)
      const n = zaehlerJeSchluessel.get(schluessel) ?? 0
      zaehlerJeSchluessel.set(schluessel, n + 1)
      return kopie(eintrag[Math.min(n, eintrag.length - 1)])
    },
    async http(url) {
      melde(`HTTP ${url}`)
      if (modus === 'browser') return NICHT_VERFUEGBAR
      return d.http?.[url] ?? { fehler: 'verbindung', text: 'Keine Verbindung' }
    },
    async tls(host) {
      melde(`TLS ${host}`)
      if (modus === 'browser') return NICHT_VERFUEGBAR
      return d.tls?.[host] ?? { fehler: 'verbindung', text: 'Keine Verbindung' }
    },
  }
}

const kopie = <T>(x: T): T => structuredClone(x)

/* ---------- Bausteine für Antworten ---------- */

/** NOERROR ohne Daten (NODATA) */
export function leer(ad = false): DnsAntwort {
  return { status: 0, ad, antworten: [], kommentar: '' }
}

export function nxdomain(): DnsAntwort {
  return { status: 3, ad: false, antworten: [], kommentar: '' }
}

export function servfail(kommentar = ''): DnsAntwort {
  return { status: 2, ad: false, antworten: [], kommentar }
}

/** NOERROR mit Antworten eines Typs; TXT-Werte sind bereits zusammengesetzt (6.4). */
export function daten(name: string, typ: DnsTyp, werte: string[], ad = false): DnsAntwort {
  return { status: 0, ad, antworten: werte.map((w) => ({ name: normName(name), typ: TYP_NUMMER[typ], ttl: 300, daten: w })), kommentar: '' }
}

export const txt = (name: string, ...werte: string[]) => daten(name, 'TXT', werte)
export const mx = (name: string, ...werte: string[]) => daten(name, 'MX', werte)
export const caa = (name: string, ...werte: string[]) => daten(name, 'CAA', werte)

export function http(url: string, status: number, kopfzeilen: [string, string][] = [], text: string | null = null): HttpAntwort {
  return { url, status, kopfzeilen, text, gekuerzt: false }
}
