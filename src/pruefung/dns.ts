/**
 * DNS-Antworten für die Regeln auswerten (Spezifikation 6.4): Daten des angefragten Typs,
 * „kein Eintrag“ (NODATA oder NXDOMAIN) oder „Abfrage gescheitert“ (anderer Status, abgeschnittene
 * Antwort oder Netzfehler). Dazu kleine Leser für MX, CAA und Tag-Listen (DMARC, DKIM, MTA-STS).
 */
import type { DnsAntwort, DnsTyp, NetzFehler } from '../modell/typen'
import { istNetzFehler, normName, rcodeName, TYP_NUMMER } from '../netz/schnittstelle'

export type DnsLage =
  | { art: 'daten'; werte: string[]; ad: boolean }
  | { art: 'kein'; nxdomain: boolean }
  | { art: 'gescheitert'; grund: string }

/** Regeln nutzen nur Antworten mit dem angefragten Typ (6.4). */
export function lage(r: DnsAntwort | NetzFehler, typ: DnsTyp): DnsLage {
  if (istNetzFehler(r)) return { art: 'gescheitert', grund: r.text }
  if (r.status === 3) return { art: 'kein', nxdomain: true }
  if (r.status !== 0) return { art: 'gescheitert', grund: rcodeName(r.status) }
  const werte = r.antworten.filter((a) => a.typ === TYP_NUMMER[typ]).map((a) => a.daten)
  return werte.length > 0 ? { art: 'daten', werte, ad: r.ad } : { art: 'kein', nxdomain: false }
}

/** Messwert der Regel ‹Präfix›-00 */
export function gescheitertText(grund: string): string {
  return `DNS-Abfrage gescheitert (${grund})`
}

export interface MxEintrag {
  prioritaet: number
  /** Name klein ohne Punkt am Ende; '.' beim Null-MX */
  host: string
}

/** '10 mx1.firma.de.' → Priorität 10, Host 'mx1.firma.de' (6.4) */
export function leseMx(daten: string): MxEintrag | null {
  const m = /^\s*(\d+)\s+(\S+)\s*$/.exec(daten)
  if (!m) return null
  return { prioritaet: Number(m[1]), host: m[2] === '.' ? '.' : normName(m[2]) }
}

export interface CaaEintrag {
  flags: number
  /** klein */
  tag: string
  /** ohne Anführungszeichen */
  wert: string
}

/** '0 issue "letsencrypt.org"' → Flags 0, Tag 'issue', Wert 'letsencrypt.org' (6.4) */
export function leseCaa(daten: string): CaaEintrag | null {
  const m = /^\s*(\d+)\s+([A-Za-z0-9]+)\s+(.*?)\s*$/.exec(daten)
  if (!m) return null
  let wert = m[3]
  if (wert.length >= 2 && wert.startsWith('"') && wert.endsWith('"')) wert = wert.slice(1, -1).replace(/\\(.)/g, '$1')
  return { flags: Number(m[1]), tag: m[2].toLowerCase(), wert }
}

export interface Tag {
  name: string
  wert: string
}

/**
 * Tag-Liste wie 'v=DMARC1; p=reject': an „;“ trennen, trimmen, Leere überspringen, am ersten „=“
 * teilen, Name und Wert trimmen, Namen klein (6.5). Teile ohne „=“ werden übersprungen.
 */
export function leseTags(eintrag: string): Tag[] {
  const tags: Tag[] = []
  for (const teil of eintrag.split(';')) {
    const t = teil.trim()
    const i = t.indexOf('=')
    if (t === '' || i < 0) continue
    tags.push({ name: t.slice(0, i).trim().toLowerCase(), wert: t.slice(i + 1).trim() })
  }
  return tags
}

/** Wert des ersten Tags mit diesem Namen */
export function tagWert(tags: Tag[], name: string): string | undefined {
  return tags.find((t) => t.name === name)?.wert
}
