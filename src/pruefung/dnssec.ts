/**
 * DNSSEC (Spezifikation 6.5): SOA für D über einen prüfenden Resolver. NOERROR mit AD heißt
 * signiert und gültig. SERVFAIL, das ohne Prüfung (cd=1) verschwindet, heißt: Die Signatur ist
 * kaputt, und prüfende Resolver erreichen die Domain nicht (DNSSEC-03).
 */
import type { Befund } from '../modell/typen'
import { istNetzFehler, rcodeName } from '../netz/schnittstelle'
import { gescheitertText } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

export async function pruefeDnssec(lauf: Lauf, D: string): Promise<Befund> {
  const r = await lauf.dns(D, 'SOA')
  if (istNetzFehler(r)) return befund('dnssec', D, ['DNSSEC-04'], gescheitertText(r.text))
  if (r.status === 0) {
    return r.ad ? befund('dnssec', D, ['DNSSEC-01'], 'signiert und gültig (AD)', { ad: true }) : befund('dnssec', D, ['DNSSEC-02'], 'nicht signiert (kein AD)', { ad: false })
  }
  if (r.status !== 2) return befund('dnssec', D, ['DNSSEC-04'], gescheitertText(rcodeName(r.status)))
  const ohnePruefung = await lauf.dns(D, 'SOA', true)
  if (!istNetzFehler(ohnePruefung) && ohnePruefung.status === 0) {
    const zusatz = r.kommentar ? `; Anbieter: ${r.kommentar}` : ''
    return befund('dnssec', D, ['DNSSEC-03'], `SERVFAIL mit DNSSEC-Prüfung, ohne Prüfung (cd=1) NOERROR${zusatz}`, { ad: false })
  }
  const grund = istNetzFehler(ohnePruefung) ? ohnePruefung.text : rcodeName(ohnePruefung.status)
  return befund('dnssec', D, ['DNSSEC-04'], `SERVFAIL, auch ohne DNSSEC-Prüfung (${grund})`)
}
