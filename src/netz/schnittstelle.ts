/**
 * Netz-Schnittstelle der Außenprüfung (Spezifikation 4, 6.4, 7.8). Die Regeln in src/pruefung
 * sehen nur `Netz`, `DnsAntwort` und `NetzFehler`; woher die Antworten kommen (Browser-DoH,
 * später das Windows-Programm, in Tests das Testnetz), bleibt dahinter verborgen.
 */
import type { DnsAntwort, DnsTyp, NetzFehler } from '../modell/typen'

export type { DnsAntwort, DnsTyp, HttpAntwort, Netz, NetzFehler, TlsInfo } from '../modell/typen'

/** Typnummern nach 6.4 */
export const TYP_NUMMER: Record<DnsTyp, number> = { A: 1, SOA: 6, MX: 15, TXT: 16, AAAA: 28, CAA: 257 }

const RCODE: Record<number, string> = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 4: 'NOTIMP', 5: 'REFUSED' }

/** DNS-Rcode als Wort, z. B. 2 → 'SERVFAIL' */
export function rcodeName(status: number): string {
  return RCODE[status] ?? `Status ${status}`
}

export function istNetzFehler(x: unknown): x is NetzFehler {
  return typeof x === 'object' && x !== null && 'fehler' in x
}

/** Wiederholversuch nach 6.4: bei Netzfehlern und HTTP 5xx, nicht bei anderen Antworten. */
export function wiederholbar(f: NetzFehler): boolean {
  if (f.fehler === 'zeitueberschreitung' || f.fehler === 'verbindung') return true
  return f.fehler === 'antwort' && f.httpStatus !== undefined && f.httpStatus >= 500 && f.httpStatus <= 599
}

/** Namen klein und ohne Punkt am Ende (6.4); 'Example.COM.' → 'example.com' */
export function normName(name: string): string {
  return name.trim().toLowerCase().replace(/\.$/, '')
}

/**
 * TXT-Daten nach 6.4: Beginnt der Text mit ", ist er eine Folge von Zeichenketten in
 * Anführungszeichen (Cloudflare). Darin \" → ", \\ → \ und \DDD → Byte mit Dezimalcode DDD.
 * Die Zeichenketten werden ohne Leerzeichen verbunden. Sonst bleibt der Text, wie er ist (Google).
 * Gesammelt wird in Bytes, damit mehrere \DDD zusammen ein UTF-8-Zeichen ergeben können.
 */
export function setzeTxtZusammen(daten: string): string {
  if (!daten.startsWith('"')) return daten
  const kodierer = new TextEncoder()
  const bytes: number[] = []
  let i = 0
  while (i < daten.length) {
    // Leerraum zwischen den Zeichenketten überspringen
    while (i < daten.length && daten[i] !== '"') i++
    if (i >= daten.length) break
    i++
    while (i < daten.length && daten[i] !== '"') {
      if (daten[i] === '\\' && i + 1 < daten.length) {
        const ziffern = daten.slice(i + 1, i + 4)
        if (/^\d{3}$/.test(ziffern) && Number(ziffern) <= 255) {
          bytes.push(Number(ziffern))
          i += 4
          continue
        }
        const zeichen = String.fromCodePoint(daten.codePointAt(i + 1)!)
        bytes.push(...kodierer.encode(zeichen))
        i += 1 + zeichen.length
        continue
      }
      const zeichen = String.fromCodePoint(daten.codePointAt(i)!)
      bytes.push(...kodierer.encode(zeichen))
      i += zeichen.length
    }
    i++
  }
  return new TextDecoder().decode(new Uint8Array(bytes))
}

type Obj = Record<string, unknown>
const istObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)

/**
 * Antwort im JSON-Format beider Anbieter (Cloudflare und Google, 6.4) → DnsAntwort.
 * `TC = true` (abgeschnittene Antwort) gilt als gescheiterte Abfrage.
 */
export function ausDohJson(json: unknown): DnsAntwort | NetzFehler {
  if (!istObj(json) || typeof json.Status !== 'number') return { fehler: 'antwort', text: 'Unerwartetes Antwortformat' }
  if (json.TC === true) return { fehler: 'antwort', text: 'Antwort abgeschnitten (TC)' }
  const roh = Array.isArray(json.Answer) ? json.Answer : []
  const antworten: DnsAntwort['antworten'] = []
  for (const a of roh) {
    if (!istObj(a) || typeof a.name !== 'string' || typeof a.type !== 'number' || typeof a.data !== 'string') continue
    antworten.push({
      name: normName(a.name),
      typ: a.type,
      ttl: typeof a.TTL === 'number' ? a.TTL : 0,
      daten: a.type === TYP_NUMMER.TXT ? setzeTxtZusammen(a.data) : a.data,
    })
  }
  const kommentar = Array.isArray(json.Comment) ? json.Comment.filter((c) => typeof c === 'string').join(' ') : typeof json.Comment === 'string' ? json.Comment : ''
  return { status: json.Status, ad: json.AD === true, antworten, kommentar }
}

/** Kurztext für das Abrufprotokoll, z. B. 'NOERROR, 1 Antwort' oder 'SERVFAIL' */
export function dnsErgebnisText(r: DnsAntwort | NetzFehler, typ: DnsTyp): string {
  if (istNetzFehler(r)) return r.text
  const n = r.antworten.filter((a) => a.typ === TYP_NUMMER[typ]).length
  const teile = [rcodeName(r.status)]
  if (r.status === 0) teile.push(n === 0 ? 'keine Antwort' : n === 1 ? '1 Antwort' : `${n} Antworten`)
  if (r.ad) teile.push('signiert (AD)')
  return teile.join(', ')
}
