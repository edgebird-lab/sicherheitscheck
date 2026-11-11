/**
 * MTA-STS (Spezifikation 6.5, RFC 8461): TXT-Eintrag unter _mta-sts.D und, nur im
 * Windows-Programm, die Richtlinie unter https://mta-sts.D/.well-known/mta-sts.txt
 * (ohne Weiterleitung). Im Browser endet ein gültiger Eintrag mit STS-11 „nicht geprüft“.
 */
import type { Befund, HttpAntwort, Modus, NetzFehler } from '../modell/typen'
import { istNetzFehler } from '../netz/schnittstelle'
import { gescheitertText, lage } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

const ID = /^[A-Za-z0-9]{1,32}$/
const MX_MUSTER = /^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i
const MODI = new Set(['enforce', 'testing', 'none'])
/** längste erlaubte Gültigkeit der Richtlinie in Sekunden (RFC 8461) */
export const MAX_AGE_GRENZE = 31_557_600

export type StsEintrag =
  | { art: 'gescheitert'; grund: string }
  | { art: 'kein' }
  | { art: 'ungueltig'; grund: string; eintraege: string[] }
  | { art: 'gueltig'; eintrag: string; id: string }

/** Liest den TXT-Eintrag; Kandidaten beginnen genau mit „v=STSv1;“. */
export async function leseStsEintrag(lauf: Lauf, D: string): Promise<StsEintrag> {
  const l = lage(await lauf.dns(`_mta-sts.${D}`, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') return { art: 'gescheitert', grund: l.grund }
  return bewerteStsEintraege(l.art === 'daten' ? l.werte : [])
}

export function bewerteStsEintraege(werte: string[]): StsEintrag {
  const kandidaten = werte.filter((w) => w.startsWith('v=STSv1;'))
  if (kandidaten.length === 0) return { art: 'kein' }
  if (kandidaten.length > 1) return { art: 'ungueltig', grund: `${kandidaten.length} Einträge`, eintraege: kandidaten }
  const felder = kandidaten[0]
    .split(';')
    .map((f) => f.trim())
    .filter(Boolean)
  const id = felder.find((f) => /^id\s*=/.test(f))?.replace(/^id\s*=/, '').trim()
  if (id === undefined || !ID.test(id)) return { art: 'ungueltig', grund: id === undefined ? 'id fehlt' : `id „${id}“ ungültig`, eintraege: kandidaten }
  return { art: 'gueltig', eintrag: kandidaten[0], id }
}

/** Ist ein MTA-STS-Eintrag vorhanden (gültig oder nicht)? Für TLS-RPT (RPT-02). */
export function stsVorhanden(e: StsEintrag): boolean {
  return e.art === 'gueltig' || e.art === 'ungueltig'
}

export interface Richtlinie {
  version: string
  mode: string
  maxAge: string
  mx: string[]
}

export type RichtlinieGelesen = { gueltig: true; richtlinie: Richtlinie } | { gueltig: false; grund: string; richtlinie: Partial<Richtlinie> }

/**
 * Richtlinie lesen (6.5): Zeilen an /\r?\n/ trennen, leere überspringen, am ersten „:“ teilen,
 * trimmen; unbekannte Felder ignorieren; bei mehrfachen Feldern außer mx gilt das erste.
 */
export function leseRichtlinie(text: string): RichtlinieGelesen {
  const felder = new Map<string, string>()
  const mx: string[] = []
  for (const zeile of text.split(/\r?\n/)) {
    if (zeile.trim() === '') continue
    const i = zeile.indexOf(':')
    if (i < 0) continue
    const name = zeile.slice(0, i).trim()
    const wert = zeile.slice(i + 1).trim()
    if (name === 'mx') mx.push(wert)
    else if (!felder.has(name)) felder.set(name, wert)
  }
  const r: Partial<Richtlinie> = { version: felder.get('version'), mode: felder.get('mode'), maxAge: felder.get('max_age'), mx }
  const fehler = (grund: string): RichtlinieGelesen => ({ gueltig: false, grund, richtlinie: r })
  if (r.version !== 'STSv1') return fehler('version ist nicht STSv1')
  if (r.mode === undefined || !MODI.has(r.mode)) return fehler('mode fehlt oder ist ungültig')
  if (r.maxAge === undefined || !/^\d+$/.test(r.maxAge) || Number(r.maxAge) > MAX_AGE_GRENZE) return fehler(`max_age fehlt oder ist größer als ${MAX_AGE_GRENZE}`)
  if (r.mode !== 'none' && mx.length === 0) return fehler('kein Eintrag mx')
  const falsch = mx.find((m) => !MX_MUSTER.test(m))
  if (falsch !== undefined) return fehler(`mx „${falsch}“ ungültig`)
  return { gueltig: true, richtlinie: { version: r.version, mode: r.mode, maxAge: r.maxAge, mx } }
}

/** MX-Abgleich ohne Groß/klein; „*.rest“ passt auf genau ein zusätzliches Label links (6.5). */
export function mxPasst(host: string, muster: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '')
  const m = muster.toLowerCase().replace(/\.$/, '')
  if (!m.startsWith('*.')) return h === m
  const rest = m.slice(2)
  return h.endsWith(`.${rest}`) && h.split('.').length === rest.split('.').length + 1
}

export function richtlinienAdresse(D: string): string {
  return `https://mta-sts.${D}/.well-known/mta-sts.txt`
}

/** Abruf der Richtlinie, ohne Weiterleitung (nur Windows-Programm) */
export function holeRichtlinie(lauf: Lauf, D: string): Promise<HttpAntwort | NetzFehler> {
  return lauf.http(richtlinienAdresse(D))
}

function kopfzeile(r: HttpAntwort, name: string): string | undefined {
  return r.kopfzeilen.find(([n]) => n === name)?.[1]
}

/**
 * Befund aus Eintrag, Modus und (im Windows-Programm) dem Abruf der Richtlinie.
 * `mxHosts` sind die MX-Hosts der Domain; null, wenn die MX-Abfrage scheiterte.
 */
export function bewerteMtaSts(D: string, e: StsEintrag, modus: Modus, abruf: HttpAntwort | NetzFehler | null, mxHosts: string[] | null): Befund {
  if (e.art === 'gescheitert') return befund('mta_sts', D, ['STS-00'], gescheitertText(e.grund))
  if (e.art === 'kein') return befund('mta_sts', D, ['STS-01'], 'kein MTA-STS-Eintrag')
  if (e.art === 'ungueltig') return befund('mta_sts', D, ['STS-02'], `${e.grund}: ${e.eintraege.join(' | ')}`)
  const werte: Befund['werte'] = { id: e.id }
  if (modus === 'browser' || abruf === null) return befund('mta_sts', D, ['STS-11'], `${e.eintrag} (Richtlinie nur im Windows-Programm prüfbar)`, werte)

  if (istNetzFehler(abruf)) return befund('mta_sts', D, ['STS-03'], `Richtlinie nicht abrufbar: ${abruf.text}`, werte)
  if (abruf.status !== 200) {
    const ziel = kopfzeile(abruf, 'location')
    return befund('mta_sts', D, ['STS-03'], `Richtlinie nicht abrufbar: Status ${abruf.status}${ziel ? ` (Weiterleitung auf ${ziel})` : ''}`, werte)
  }
  const regeln: string[] = []
  const typ = kopfzeile(abruf, 'content-type') ?? ''
  if (!typ.toLowerCase().startsWith('text/plain')) regeln.push('STS-04')
  const gelesen = abruf.gekuerzt ? null : leseRichtlinie(abruf.text ?? '')
  if (!gelesen || !gelesen.gueltig) {
    regeln.push('STS-05')
    return befund('mta_sts', D, regeln, `Richtlinie ungültig: ${gelesen ? gelesen.grund : 'länger als 64 KiB'}`, werte)
  }
  const r = gelesen.richtlinie
  Object.assign(werte, { mode: r.mode, max_age: Number(r.maxAge), mx: r.mx.join(', ') || null })
  const nichtAbgedeckt = (mxHosts ?? []).filter((h) => !r.mx.some((m) => mxPasst(h, m)))
  if (r.mode === 'none') regeln.push('STS-06')
  else if (r.mode === 'testing') regeln.push(nichtAbgedeckt.length > 0 ? 'STS-08' : 'STS-07')
  else regeln.push(nichtAbgedeckt.length > 0 ? 'STS-10' : 'STS-09')
  const teile = [`mode ${r.mode}`, `max_age ${r.maxAge}`]
  if (r.mx.length > 0) teile.push(`mx ${r.mx.join(', ')}`)
  if (nichtAbgedeckt.length > 0 && r.mode !== 'none') teile.push(`nicht abgedeckt: ${nichtAbgedeckt.join(', ')}`)
  return befund('mta_sts', D, regeln, teile.join('; '), werte)
}
