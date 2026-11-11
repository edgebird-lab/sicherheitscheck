/**
 * MX (Spezifikation 6.5): Mailserver der Domain. NXDOMAIN für die Domain selbst beendet den Lauf
 * (MX-01). Die MX-Hosts braucht später der Abgleich mit der MTA-STS-Richtlinie.
 */
import type { Befund } from '../modell/typen'
import { gescheitertText, lage, leseMx, type MxEintrag } from './dns'
import type { Lauf } from './lauf'
import { befund } from './stufen'

export interface MxErgebnis {
  befund: Befund
  /** MX-Hosts nach Priorität; leer bei Null-MX oder ohne MX; null, wenn unbekannt */
  hosts: string[] | null
  /** MX-01: Domain existiert nicht, der Lauf bricht ab */
  abbruch: boolean
}

export async function pruefeMx(lauf: Lauf, D: string): Promise<MxErgebnis> {
  const l = lage(await lauf.dns(D, 'MX'), 'MX')
  if (l.art === 'gescheitert') return { befund: befund('mx', D, ['MX-00'], gescheitertText(l.grund)), hosts: null, abbruch: false }
  if (l.art === 'kein') {
    if (l.nxdomain) return { befund: befund('mx', D, ['MX-01'], 'Die Domain existiert nicht (NXDOMAIN).'), hosts: null, abbruch: true }
    return { befund: befund('mx', D, ['MX-04'], 'kein MX-Eintrag', { anzahl: 0 }), hosts: [], abbruch: false }
  }
  const eintraege = l.werte
    .map(leseMx)
    .filter((e): e is MxEintrag => e !== null)
    .sort((a, b) => a.prioritaet - b.prioritaet || a.host.localeCompare(b.host))
  if (eintraege.length === 1 && eintraege[0].prioritaet === 0 && eintraege[0].host === '.') {
    return { befund: befund('mx', D, ['MX-02'], 'Null-MX „0 .“: Die Domain empfängt keine E-Mail.', { anzahl: 0, nullMx: true }), hosts: [], abbruch: false }
  }
  if (eintraege.length === 0) return { befund: befund('mx', D, ['MX-04'], 'MX-Einträge nicht lesbar', { anzahl: 0 }), hosts: [], abbruch: false }
  const liste = eintraege.map((e) => `${e.prioritaet} ${e.host}`).join(', ')
  return {
    befund: befund('mx', D, ['MX-03'], liste, { anzahl: eintraege.length, mx: liste }),
    hosts: eintraege.filter((e) => e.host !== '.').map((e) => e.host),
    abbruch: false,
  }
}
