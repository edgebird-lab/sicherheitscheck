/**
 * HSTS (Spezifikation 6.6): ausgewertet an der ersten HTTPS-Antwort von https://host/, auch
 * wenn sie weiterleitet. Erste Kopfzeile `strict-transport-security`; Direktiven an `;`
 * getrennt, Namen ohne Groß/klein, Werte ohne umschließende Anführungszeichen.
 */
import type { Befund } from '../modell/typen'
import { befund } from './stufen'
import { kopf, type Kette } from './web'

/** Ein Jahr in Sekunden */
export const HSTS_MINDESTENS = 31_536_000

interface Direktive {
  name: string
  wert: string | null
}

export function leseHsts(text: string): Direktive[] {
  return text
    .split(';')
    .map((d) => d.trim())
    .filter((d) => d !== '')
    .map((d) => {
      const i = d.indexOf('=')
      if (i < 0) return { name: d.toLowerCase(), wert: null }
      const wert = d.slice(i + 1).trim()
      return { name: d.slice(0, i).trim().toLowerCase(), wert: wert.length >= 2 && wert.startsWith('"') && wert.endsWith('"') ? wert.slice(1, -1) : wert }
    })
}

export function bewerteHsts(host: string, k: Kette): Befund {
  const erste = k.antworten[0]
  if (!erste) return befund('hsts', host, ['HDR-00'], `keine HTTPS-Antwort (${k.fehler?.text ?? 'nicht abgerufen'})`)
  const text = kopf(erste, 'strict-transport-security')
  if (text === undefined) return befund('hsts', host, ['HSTS-01'], 'keine Kopfzeile Strict-Transport-Security')
  const direktiven = leseHsts(text)
  const namen = direktiven.map((d) => d.name)
  const maxAge = direktiven.find((d) => d.name === 'max-age')?.wert
  if (new Set(namen).size !== namen.length || maxAge === undefined || maxAge === null || !/^\d+$/.test(maxAge)) return befund('hsts', host, ['HSTS-05'], text)
  const sekunden = Number(maxAge)
  const werte: Befund['werte'] = { maxAge: sekunden, includeSubDomains: namen.includes('includesubdomains'), preload: namen.includes('preload') }
  const regel = sekunden === 0 ? 'HSTS-02' : sekunden < HSTS_MINDESTENS ? 'HSTS-03' : 'HSTS-04'
  return befund('hsts', host, [regel], text, werte)
}
