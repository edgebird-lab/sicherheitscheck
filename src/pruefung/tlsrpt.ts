/**
 * TLS-RPT (Spezifikation 6.5, RFC 8460): TXT unter _smtp._tls.D mit Berichtsadresse.
 */
import type { Befund } from '../modell/typen'
import { gescheitertText, lage, leseTags, tagWert } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

const KANDIDAT = /^v=TLSRPTv1\s*(;|$)/

/** `stsVorhanden`: Die Domain hat einen MTA-STS-Eintrag (dann ist TLS-RPT angeraten, RPT-02). */
export async function pruefeTlsRpt(lauf: Lauf, D: string, stsVorhanden: boolean): Promise<Befund> {
  const l = lage(await lauf.dns(`_smtp._tls.${D}`, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') return befund('tls_rpt', D, ['RPT-00'], gescheitertText(l.grund))
  const kandidaten = (l.art === 'daten' ? l.werte : []).filter((w) => KANDIDAT.test(w))
  if (kandidaten.length === 0) return befund('tls_rpt', D, stsVorhanden ? ['RPT-02', 'RPT-01'] : ['RPT-01'], 'kein TLS-RPT-Eintrag')
  if (kandidaten.length > 1) return befund('tls_rpt', D, ['RPT-03'], `${kandidaten.length} TLS-RPT-Einträge: ${kandidaten.join(' | ')}`)
  const eintrag = kandidaten[0]
  const rua = (tagWert(leseTags(eintrag), 'rua') ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  if (rua.length === 0 || rua.some((a) => !/^(mailto|https):/i.test(a))) return befund('tls_rpt', D, ['RPT-03'], eintrag, { rua: rua.join(', ') || null })
  return befund('tls_rpt', D, ['RPT-04'], eintrag, { rua: rua.join(', ') })
}
