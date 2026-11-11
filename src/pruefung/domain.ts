/**
 * Domain-Eingabe prüfen (Spezifikation 6.3). Ergebnis ist die registrierbare Domain D
 * (A-Label, klein, ohne Punkt am Ende) und die Hosts der Prüfung: D, www.D, mta-sts.D.
 * Es gibt keinen Testmodus: Tests nutzen example.com (reserviert nach RFC 2606).
 */
import { parse } from 'tldts'

export interface Pruefhosts {
  /** registrierbare Domain */
  D: string
  W: string
  S: string
}

export type DomainErgebnis = { ok: true; domain: string; hosts: Pruefhosts; hinweis: string | null } | { ok: false; fehler: string }

export function pruefeDomain(eingabe: string): DomainErgebnis {
  const text = eingabe.trim()
  if (text === '') return { ok: false, fehler: 'Bitte eine Domain eingeben.' }

  let host: string
  try {
    host = new URL(text.includes('://') ? text : `http://${text}`).hostname
  } catch {
    return { ok: false, fehler: 'Keine gültige Adresse.' }
  }
  if (host.endsWith('.')) host = host.slice(0, -1)
  if (host === '') return { ok: false, fehler: 'Keine gültige Adresse.' }

  const p = parse(host)
  if (p.isIp) return { ok: false, fehler: 'IP-Adressen werden nicht geprüft.' }
  if (p.domain === null || p.isIcann !== true) return { ok: false, fehler: 'Keine öffentliche Domain.' }
  if (parse(host, { allowPrivateDomains: true }).isPrivate === true) {
    return { ok: false, fehler: 'Die Adresse gehört einem Plattformanbieter (z. B. github.io). Bitte die eigene Domain angeben.' }
  }

  const D = p.domain
  return {
    ok: true,
    domain: D,
    hosts: { D, W: `www.${D}`, S: `mta-sts.${D}` },
    hinweis: host !== D ? `Geprüft wird ${D} mit www und mta-sts.` : null,
  }
}

/** HTTP- und TLS-Abrufe gehen nur an D und Namen, die auf „.D“ enden (6.3, Schritt 7). */
export function gehoertZu(host: string, D: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '')
  return h === D || h.endsWith(`.${D}`)
}
