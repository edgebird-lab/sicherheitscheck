/**
 * security.txt (Spezifikation 6.6): GET https://D/.well-known/security.txt, Weiterleitungen
 * nur innerhalb von D. Feldnamen ohne Groß/klein; Format nach RFC 9116 (Abgleich in Phase 0.4).
 * Der Text kommt nur als Text in den Befund, nie als HTML.
 */
import type { Befund } from '../modell/typen'
import { befund } from './stufen'
import { kopf, type Kette } from './web'

export function securityTxtAdresse(D: string): string {
  return `https://${D}/.well-known/security.txt`
}

/** Felder `Name: Wert`; Kommentare (#) und Zeilen ohne Doppelpunkt zählen nicht */
export function leseFelder(text: string): { name: string; wert: string }[] {
  return text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter((z) => z !== '' && !z.startsWith('#'))
    .map((z) => {
      const i = z.indexOf(':')
      return i <= 0 ? null : { name: z.slice(0, i).trim().toLowerCase(), wert: z.slice(i + 1).trim() }
    })
    .filter((f) => f !== null)
}

export function bewerteSecurityTxt(D: string, k: Kette, jetzt: Date): Befund {
  if (k.ende === 'fehler') return befund('security_txt', D, ['SECTXT-00'], `nicht abrufbar: ${k.fehler?.text ?? 'Fehler'}`)
  if (k.ende === 'fremd') return befund('security_txt', D, ['SECTXT-01'], `Weiterleitung auf ${k.fremd} (andere Domain, nicht abgerufen)`)
  if (k.ende === 'zu_lang') return befund('security_txt', D, ['SECTXT-01'], 'zu viele Weiterleitungen')
  const r = k.antworten[k.antworten.length - 1]
  if (r.status !== 200) return befund('security_txt', D, ['SECTXT-01'], `Status ${r.status}`)

  const typ = (kopf(r, 'content-type') ?? '').trim().toLowerCase()
  const felder = leseFelder(r.text ?? '')
  const kontakte = felder.filter((f) => f.name === 'contact').map((f) => f.wert)
  const ablauf = felder.filter((f) => f.name === 'expires').map((f) => f.wert)
  const zeit = ablauf.length === 1 ? Date.parse(ablauf[0]) : Number.NaN
  const regeln: string[] = []
  if (!typ.startsWith('text/plain') || kontakte.length === 0 || ablauf.length !== 1 || Number.isNaN(zeit)) regeln.push('SECTXT-03')
  if (!Number.isNaN(zeit) && zeit < jetzt.getTime()) regeln.push('SECTXT-04')
  if (regeln.length === 0) regeln.push('SECTXT-02')

  const teile = [
    kontakte.length > 0 ? `Contact: ${kontakte.join(', ')}` : 'kein Contact',
    ablauf.length === 1 ? `Expires: ${ablauf[0]}` : ablauf.length === 0 ? 'kein Expires' : `${ablauf.length} × Expires`,
  ]
  if (!typ.startsWith('text/plain')) teile.push(`Content-Type: ${typ || 'fehlt'}`)
  if (r.gekuerzt) teile.push('nach 64 KiB gekürzt')
  return befund('security_txt', D, regeln, teile.join('; '), { kontakte: kontakte.length, expires: ablauf.length === 1 ? ablauf[0] : null })
}
