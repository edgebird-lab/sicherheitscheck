/**
 * Zertifikat und TLS-Version (Spezifikation 6.6) aus `netz.tls(host)` für D, W und S.
 * Die Schwellen 7 und 14 Tage sind eigene Festlegung.
 */
import { datumDeutsch } from '../modell/datum'
import type { Befund, NetzFehler, TlsInfo } from '../modell/typen'
import { istNetzFehler } from '../netz/schnittstelle'
import { befund } from './stufen'

/** Unter so vielen Tagen Restlaufzeit: Warnung */
export const TAGE_WARNUNG = 7
/** Unter so vielen Tagen Restlaufzeit: Hinweis */
export const TAGE_HINWEIS = 14
const TAG_MS = 86_400_000

/** Volle Tage bis zum Ablauf (negativ = abgelaufen) */
export function restTage(gueltigBis: string, jetzt: Date): number {
  return Math.floor((Date.parse(gueltigBis) - jetzt.getTime()) / TAG_MS)
}

function tageText(tage: number): string {
  if (tage < 0) return `seit ${-tage === 1 ? '1 Tag' : `${-tage} Tagen`} abgelaufen`
  return `noch ${tage === 1 ? '1 Tag' : `${tage} Tage`}`
}

export function bewerteZertifikat(host: string, r: TlsInfo | NetzFehler, jetzt: Date): Befund {
  if (istNetzFehler(r)) return befund('zertifikat', host, ['CERT-08'], `kein Zertifikat gelesen: ${r.text}`)
  const z = r.zertifikat
  const tage = restTage(z.gueltigBis, jetzt)
  const regeln: string[] = []
  const code = r.pruefFehler?.code
  if (!r.vertrauenswuerdig && code !== 'abgelaufen' && code !== 'noch_nicht_gueltig') regeln.push('CERT-01')
  if (!r.namePasst) regeln.push('CERT-02')
  if (tage < 0) regeln.push('CERT-03')
  if (tage >= 0 && tage < TAGE_WARNUNG) regeln.push('CERT-04')
  if (Date.parse(z.gueltigAb) > jetzt.getTime()) regeln.push('CERT-07')
  if (tage >= TAGE_WARNUNG && tage < TAGE_HINWEIS) regeln.push('CERT-05')
  if (regeln.length === 0) regeln.push('CERT-06')
  const teile = [`gültig bis ${datumDeutsch(z.gueltigBis.slice(0, 10))} (${tageText(tage)})`, `Aussteller ${z.aussteller}`]
  if (!r.namePasst) teile.push(`Namen im Zertifikat: ${z.sans.length > 0 ? z.sans.join(', ') : 'keine'}`)
  if (r.pruefFehler && r.pruefFehler.code !== 'name' && r.pruefFehler.code !== 'abgelaufen') teile.push(`Prüfung: ${r.pruefFehler.text}`)
  return befund('zertifikat', host, regeln, teile.join(', '), {
    tage,
    gueltigBis: z.gueltigBis,
    aussteller: z.aussteller,
    vertrauenswuerdig: r.vertrauenswuerdig,
    namePasst: r.namePasst,
    schluessel: z.schluessel,
  })
}

export function bewerteTlsVersion(host: string, r: TlsInfo | NetzFehler): Befund {
  if (istNetzFehler(r)) return befund('tls_version', host, [r.fehler === 'tls_version' ? 'TLS-03' : 'TLS-04'], r.text)
  return befund('tls_version', host, [r.version === 'TLS 1.3' ? 'TLS-01' : 'TLS-02'], `${r.version}, ${r.suite}`, { version: r.version, suite: r.suite })
}
