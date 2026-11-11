/**
 * SPF (Spezifikation 6.5, RFC 7208): genau ein Eintrag mit „v=spf1“, rekursive Zählung der
 * DNS-Abfragen (höchstens 10), Schleifen nur im aktuellen Pfad, wirksamer Qualifier des „all“.
 * Abfragen laufen über den Lauf; derselbe Name in zwei Zweigen wird nur einmal abgefragt (6.4),
 * zählt aber bei jedem Vorkommen.
 */
import type { Befund } from '../modell/typen'
import { normName } from '../netz/schnittstelle'
import { gescheitertText, lage } from './dns'
import type { Lauf } from './lauf'
import { befund, kuerze } from './stufen'

type Qualifier = '+' | '-' | '~' | '?'

const KANDIDAT = /^v=spf1(\s|$)/i
const MODIFIKATOR = /^([a-z][a-z0-9_.-]*)=(.*)$/i
const MECHANISMUS = /^([+\-~?]?)(all|include|a|mx|ptr|ip4|ip6|exists)(?=$|[:/])(.*)$/i
/** Begriffe, die eine DNS-Abfrage auslösen (redirect zählt beim Anwenden) */
const MIT_ABFRAGE = new Set(['include', 'a', 'mx', 'ptr', 'exists'])

export const MAX_LOOKUPS = 10
const MAX_TIEFE = 10

/** permerror (SPF-07, -08, -10) oder temperror (SPF-00): Ende der Auswertung */
class SpfEnde extends Error {
  readonly regel: 'SPF-00' | 'SPF-07' | 'SPF-08' | 'SPF-10'
  constructor(regel: SpfEnde['regel'], text: string) {
    super(text)
    this.regel = regel
  }
}

interface Zustand {
  lookups: number
  ptr: boolean
  makro: boolean
  /** redirect auf ein Ziel mit Makro: wirksames all nicht bestimmbar */
  allUnbekannt: boolean
}

function zaehle(z: Zustand) {
  z.lookups++
  if (z.lookups > MAX_LOOKUPS) throw new SpfEnde('SPF-07', `mehr als ${MAX_LOOKUPS} DNS-Abfragen`)
}

/** Wertet einen Eintrag aus und gibt den Qualifier seines wirksamen „all“ zurück (null: kein all). */
async function werteAus(lauf: Lauf, eintrag: string, pfad: string[], z: Zustand): Promise<Qualifier | null> {
  const begriffe = eintrag.trim().split(/\s+/).slice(1)
  let all: Qualifier | null = null
  let redirect: string | null = null
  for (const begriff of begriffe) {
    if (begriff.includes('%')) z.makro = true
    const modifikator = MODIFIKATOR.exec(begriff)
    if (modifikator) {
      if (modifikator[1].toLowerCase() === 'redirect') {
        if (redirect !== null) throw new SpfEnde('SPF-10', 'redirect doppelt')
        redirect = modifikator[2]
      }
      continue
    }
    const m = MECHANISMUS.exec(begriff)
    if (!m) throw new SpfEnde('SPF-10', `unbekannte Angabe „${begriff}“`)
    const art = m[2].toLowerCase()
    if (MIT_ABFRAGE.has(art)) zaehle(z)
    if (art === 'ptr') z.ptr = true
    if (art === 'all') {
      all ??= (m[1] || '+') as Qualifier
    } else if (art === 'include') {
      const ziel = m[3].startsWith(':') ? m[3].slice(1) : ''
      if (ziel === '') throw new SpfEnde('SPF-10', `include ohne Ziel („${begriff}“)`)
      // include mit Makro wird nicht aufgelöst (6.5, Schritt 7)
      if (!ziel.includes('%')) await bindeEin(lauf, ziel, pfad, z)
    }
  }
  // redirect gilt nur ohne all; das all des Ziels wird zum wirksamen all
  if (redirect === null || all !== null) return all
  if (redirect.includes('%')) {
    z.allUnbekannt = true
    return null
  }
  zaehle(z)
  return bindeEin(lauf, redirect, pfad, z)
}

async function bindeEin(lauf: Lauf, ziel: string, pfad: string[], z: Zustand): Promise<Qualifier | null> {
  const name = normName(ziel)
  if (pfad.includes(name)) throw new SpfEnde('SPF-07', `Schleife: ${[...pfad, name].join(' → ')}`)
  if (pfad.length > MAX_TIEFE) throw new SpfEnde('SPF-07', `mehr als ${MAX_TIEFE} Ebenen`)
  const l = lage(await lauf.dns(name, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') throw new SpfEnde('SPF-00', `${gescheitertText(l.grund)} für ${name}`)
  const kandidaten = l.art === 'daten' ? l.werte.filter((w) => KANDIDAT.test(w)) : []
  if (kandidaten.length !== 1) throw new SpfEnde('SPF-08', `${name} hat ${kandidaten.length === 0 ? 'keinen SPF-Eintrag' : `${kandidaten.length} SPF-Einträge`}`)
  return werteAus(lauf, kandidaten[0], [...pfad, name], z)
}

const QUALIFIER_TEXT: Record<Qualifier, string> = { '+': '+all', '-': '-all', '~': '~all', '?': '?all' }

function qualifierRegel(q: Qualifier | null): string {
  if (q === '+') return 'SPF-03'
  if (q === '~') return 'SPF-05'
  if (q === '-') return 'SPF-06'
  return 'SPF-04'
}

const abfragen = (n: number) => (n === 1 ? '1 DNS-Abfrage' : `${n} DNS-Abfragen`)

export async function pruefeSpf(lauf: Lauf, D: string): Promise<Befund> {
  const l = lage(await lauf.dns(D, 'TXT'), 'TXT')
  if (l.art === 'gescheitert') return befund('spf', D, ['SPF-00'], gescheitertText(l.grund))
  const kandidaten = l.art === 'daten' ? l.werte.filter((w) => KANDIDAT.test(w)) : []
  if (kandidaten.length === 0) return befund('spf', D, ['SPF-01'], 'kein SPF-Eintrag', { lookups: 0, qualifier: null, eintrag: null })
  if (kandidaten.length > 1) {
    return befund('spf', D, ['SPF-02'], `${kandidaten.length} SPF-Einträge: ${kandidaten.join(' | ')}`, { lookups: 0, qualifier: null, eintrag: kuerze(kandidaten.join(' | '), 200) })
  }

  const eintrag = kandidaten[0]
  const z: Zustand = { lookups: 0, ptr: false, makro: false, allUnbekannt: false }
  const regeln: string[] = []
  let qualifier: Qualifier | null = null
  let ende: SpfEnde | null = null
  try {
    qualifier = await werteAus(lauf, eintrag, [normName(D)], z)
  } catch (e) {
    // Grenze oder Abbruch des Laufs (LaufEnde) behandelt der Ablauf
    if (!(e instanceof SpfEnde)) throw e
    ende = e
  }
  const werte = { lookups: z.lookups, qualifier: ende || z.allUnbekannt ? null : qualifier ? QUALIFIER_TEXT[qualifier] : 'kein all', eintrag: kuerze(eintrag, 200) }
  // temperror: nur SPF-00, keine Bewertung des Qualifiers (6.5)
  if (ende?.regel === 'SPF-00') return befund('spf', D, ['SPF-00'], ende.message, werte)
  if (ende) regeln.push(ende.regel)
  else if (!z.allUnbekannt) regeln.push(qualifierRegel(qualifier))
  if (z.ptr) regeln.push('SPF-09')
  if (z.makro) regeln.push('SPF-11')
  const messwert = ende ? `${ende.message}: ${eintrag}` : `${eintrag} (${abfragen(z.lookups)})`
  return befund('spf', D, regeln, messwert, werte)
}
