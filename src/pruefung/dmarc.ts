/**
 * DMARC (Spezifikation 6.5, RFC 7489): TXT unter _dmarc.D. Gültig sind nur Einträge, die mit
 * „v=DMARC1“ in genau dieser Schreibweise beginnen (RFC 7489, Abschnitt 6.3); Leerzeichen um „=“
 * und ein großes „V“ sind erlaubt. Bleibt keiner oder bleiben mehrere, gilt kein DMARC.
 */
import type { Befund } from '../modell/typen'
import { gescheitertText, lage, leseTags, tagWert } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

const KANDIDAT = /^[vV]\s*=\s*DMARC1\s*(;|$)/
/** falsch geschrieben, z. B. „v=dmarc1“ (DMARC-08) */
const AEHNLICH = /^v\s*=\s*dmarc1/i
const RICHTLINIEN = new Set(['none', 'quarantine', 'reject'])

const anzahlVerworfen = (n: number) => (n === 1 ? '1 verworfener Eintrag' : `${n} verworfene Einträge`)

export async function pruefeDmarc(lauf: Lauf, D: string): Promise<Befund> {
  const l = lage(await lauf.dns(`_dmarc.${D}`, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') return befund('dmarc', D, ['DMARC-00'], gescheitertText(l.grund))
  const eintraege = l.art === 'daten' ? l.werte : []
  const kandidaten = eintraege.filter((e) => KANDIDAT.test(e))
  const verworfen = eintraege.filter((e) => !KANDIDAT.test(e))

  if (kandidaten.length === 0) {
    const regeln = ['DMARC-01']
    if (verworfen.some((e) => AEHNLICH.test(e))) regeln.push('DMARC-08')
    const messwert = verworfen.length === 0 ? 'kein DMARC-Eintrag' : `kein gültiger DMARC-Eintrag; ${anzahlVerworfen(verworfen.length)}: ${verworfen.map((e) => `„${e}“`).join(', ')}`
    return befund('dmarc', D, regeln, messwert, { verworfen: verworfen.length })
  }
  if (kandidaten.length > 1) return befund('dmarc', D, ['DMARC-02'], `${kandidaten.length} DMARC-Einträge: ${kandidaten.join(' | ')}`)

  const eintrag = kandidaten[0]
  const tags = leseTags(eintrag)
  const p = tagWert(tags, 'p')?.toLowerCase()
  const sp = tagWert(tags, 'sp')?.toLowerCase()
  const pct = tagWert(tags, 'pct')
  const rua = (tagWert(tags, 'rua') ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  const regeln: string[] = []
  if (p === undefined || !RICHTLINIEN.has(p)) {
    regeln.push('DMARC-03')
  } else if (p === 'none') {
    regeln.push(rua.length > 0 ? 'DMARC-04' : 'DMARC-05')
  } else {
    if (pct !== undefined && pct !== '100') regeln.push('DMARC-09')
    if (sp === 'none') regeln.push('DMARC-10')
    if (rua.length === 0) regeln.push('DMARC-11')
    regeln.push(p === 'quarantine' ? 'DMARC-06' : 'DMARC-07')
  }
  if (rua.some((a) => !a.toLowerCase().startsWith('mailto:'))) regeln.push('DMARC-12')
  return befund('dmarc', D, regeln, eintrag, { p: p ?? null, sp: sp ?? null, pct: pct ?? null, rua: rua.join(', ') || null })
}
