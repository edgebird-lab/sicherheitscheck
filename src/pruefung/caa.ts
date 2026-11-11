/**
 * CAA (Spezifikation 6.5, RFC 8659): CAA für D, dann für jeden Elternnamen bis einschließlich der
 * Top-Level-Domain; der erste Name mit CAA-Einträgen gilt.
 */
import type { Befund } from '../modell/typen'
import { gescheitertText, lage, leseCaa, type CaaEintrag } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

/** Bekannte Angaben (RFC 8659 und registrierte Erweiterungen); unbekannte mit Flag 128 sperren die Ausstellung */
const BEKANNT = new Set(['issue', 'issuewild', 'iodef', 'contactemail', 'contactphone', 'issuemail', 'issuevmc'])
const KRITISCH = 128

/** 'firma.co.uk' → ['firma.co.uk', 'co.uk', 'uk'] */
export function caaNamen(D: string): string[] {
  const labels = D.split('.')
  return labels.map((_, i) => labels.slice(i).join('.'))
}

/** „letsencrypt.org; validationmethods=dns-01“ → „letsencrypt.org“; „;“ allein verbietet jede Ausstellung */
function stelle(wert: string): string {
  const name = wert.split(';')[0].trim()
  return name === '' ? 'keine (Ausstellung verboten)' : name
}

export async function pruefeCaa(lauf: Lauf, D: string): Promise<Befund> {
  for (const name of caaNamen(D)) {
    const l = lage(await lauf.dns(name, 'CAA'), 'CAA')
    if (l.art === 'gescheitert') return befund('caa', D, ['CAA-00'], `${gescheitertText(l.grund)} für ${name}`)
    if (l.art === 'kein') continue
    const eintraege = l.werte.map(leseCaa).filter((e): e is CaaEintrag => e !== null)
    const regeln: string[] = []
    if (eintraege.some((e) => (e.flags & KRITISCH) !== 0 && !BEKANNT.has(e.tag))) regeln.push('CAA-04')
    const ausstellen = eintraege.filter((e) => e.tag === 'issue' || e.tag === 'issuewild')
    regeln.push(ausstellen.length > 0 ? 'CAA-02' : 'CAA-03')
    const stellen = [...new Set(ausstellen.map((e) => stelle(e.wert)))]
    const herkunft = name === D ? '' : ` (Eintrag von ${name})`
    const messwert = stellen.length > 0 ? `erlaubt: ${stellen.join(', ')}${herkunft}` : `CAA ohne issue: ${l.werte.join(', ')}${herkunft}`
    return befund('caa', D, regeln, messwert, { name, stellen: stellen.join(', ') || null })
  }
  return befund('caa', D, ['CAA-01'], 'kein CAA-Eintrag', { name: null, stellen: null })
}
