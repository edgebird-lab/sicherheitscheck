/**
 * Ablauf der Außenprüfung (Spezifikation 6.7). Erst Domain und Bestätigung prüfen (im
 * Windows-Programm danach die Freigabe der Domain im Rust-Teil), dann die DNS-Prüfungen in fester
 * Reihenfolge: MX → SPF → DMARC → DKIM → MTA-STS → TLS-RPT → DNSSEC → CAA. Im Windows-Programm
 * folgen A und AAAA für D und W, TLS, die HTTP-Ketten, security.txt (6.6, `website.ts`) und zuletzt
 * die MTA-STS-Richtlinie. Im Browser enden die Website-Prüfungen mit BROWSER-01 („nicht geprüft“).
 *
 * Die Abfragen laufen nacheinander (höchstens eine gleichzeitig), damit Reihenfolge, Grenzen und
 * Protokoll nachvollziehbar bleiben. Grenze oder Abbruch beenden die laufende und alle übrigen
 * Prüfungen mit Stufe fehler und dem Text „Grenze erreicht“ bzw. „abgebrochen“.
 */
import type { Aussenpruefung, Befund, Bestaetigung, DohAnbieter, Netz, PruefId } from '../modell/typen'
import { bestaetigungsText, FEHLT_BESTAETIGUNG } from './bestaetigung'
import { dkimOhneSelektor, dkimZiel, pruefeDkim } from './dkim'
import { pruefeDmarc } from './dmarc'
import { pruefeDnssec } from './dnssec'
import { pruefeDomain } from './domain'
import { pruefeCaa } from './caa'
import { Lauf, LaufEnde, laufUmgebung, type Grenzen, type LaufUmgebung } from './lauf'
import { bewerteMtaSts, holeRichtlinie, leseStsEintrag, stsVorhanden, type StsEintrag } from './mtasts'
import { pruefeMx } from './mx'
import { pruefeSelektoren } from './selektoren'
import { pruefeSpf } from './spf'
import { befund, PRUEF_IDS, REGEL_NICHT_PRUEFBAR, WEBSITE_PRUEF_IDS } from './stufen'
import { pruefeTlsRpt } from './tlsrpt'
import { pruefeWebsite } from './website'

export interface Laufauftrag {
  /** Eingabe; wird nach 6.3 geprüft */
  domain: string
  dkimSelektoren: string[]
  dohAnbieter: DohAnbieter
  bestaetigung: { name: string; rolle: Bestaetigung['rolle'] | null; zugestimmt: boolean }
}

export interface LaufOptionen extends Partial<Omit<LaufUmgebung, 'grenzen'>> {
  grenzen?: Partial<Grenzen>
  /** nach jeder fertigen Prüfung: alle bisher fertigen Prüfungen */
  fortschritt?: (fertig: PruefId[]) => void
}

export type Laufergebnis = { ok: true; aussen: Aussenpruefung } | { ok: false; fehler: string }

/** Befunde in der Reihenfolge der PruefId, bei gleicher Prüfung nach Ziel */
function sortiere(befunde: Befund[]): Befund[] {
  return [...befunde].sort((a, b) => PRUEF_IDS.indexOf(a.pruefId) - PRUEF_IDS.indexOf(b.pruefId) || a.ziel.localeCompare(b.ziel))
}

export async function aussenpruefung(auftrag: Laufauftrag, netz: Netz, optionen: LaufOptionen = {}): Promise<Laufergebnis> {
  const domain = pruefeDomain(auftrag.domain)
  if (!domain.ok) return { ok: false, fehler: domain.fehler }
  const selektoren = pruefeSelektoren(auftrag.dkimSelektoren.join(','))
  if (!selektoren.ok) return { ok: false, fehler: selektoren.fehler }
  const b = auftrag.bestaetigung
  if (!b.zugestimmt || b.rolle === null || b.name.trim() === '') return { ok: false, fehler: FEHLT_BESTAETIGUNG }

  const D = domain.domain
  // Windows-Programm: HTTP und TLS gehen nur an die freigegebene Domain (7.7)
  if (netz.modus === 'desktop' && netz.freigeben) {
    const f = await netz.freigeben(D)
    if (f) return { ok: false, fehler: `Die Domain ließ sich nicht für die Prüfung freigeben: ${f.text}` }
  }
  const u = laufUmgebung(optionen)
  const lauf = new Lauf(netz, u)
  const gestartet = u.jetzt().toISOString()
  const befunde: Befund[] = []
  const fertig: PruefId[] = []
  const melde = (pruefId: PruefId) => {
    if (!fertig.includes(pruefId)) fertig.push(pruefId)
    optionen.fortschritt?.([...fertig])
  }

  /** Führt eine Prüfung aus; Grenze oder Abbruch ergeben die Regel „nicht prüfbar“ mit Grund. */
  const sicher = async (pruefId: PruefId, ziel: string, pruefe: () => Promise<Befund>) => {
    try {
      befunde.push(await pruefe())
    } catch (e) {
      if (!(e instanceof LaufEnde)) throw e
      befunde.push(befund(pruefId, ziel, [REGEL_NICHT_PRUEFBAR[pruefId]!], e.message))
    }
  }

  const ergebnis = (): Laufergebnis => ({
    ok: true,
    aussen: {
      domain: D,
      dkimSelektoren: selektoren.selektoren,
      modus: netz.modus,
      dohAnbieter: auftrag.dohAnbieter,
      bestaetigung: { name: b.name.trim(), rolle: b.rolle!, text: bestaetigungsText(D), zeit: gestartet },
      gestartet,
      beendet: u.jetzt().toISOString(),
      abgebrochen: lauf.abgebrochen,
      befunde: sortiere(befunde),
      protokoll: lauf.protokoll.map((a) => ({ ...a })),
    },
  })

  // MX zuerst: Gibt es die Domain nicht (MX-01), endet der Lauf mit genau diesem Befund
  let mxHosts: string[] | null = null
  try {
    const mx = await pruefeMx(lauf, D)
    befunde.push(mx.befund)
    mxHosts = mx.hosts
    if (mx.abbruch) {
      melde('mx')
      return ergebnis()
    }
  } catch (e) {
    if (!(e instanceof LaufEnde)) throw e
    befunde.push(befund('mx', D, ['MX-00'], e.message))
  }
  melde('mx')

  await sicher('spf', D, () => pruefeSpf(lauf, D))
  melde('spf')
  await sicher('dmarc', D, () => pruefeDmarc(lauf, D))
  melde('dmarc')
  if (selektoren.selektoren.length === 0) befunde.push(dkimOhneSelektor(D))
  for (const s of selektoren.selektoren) await sicher('dkim', dkimZiel(s, D), () => pruefeDkim(lauf, D, s))
  melde('dkim')

  // MTA-STS: Eintrag jetzt; die Richtlinie ruft nur das Windows-Programm ab, nach allen DNS-Abfragen
  let stsDa = false
  let richtlinieFolgt: StsEintrag | null = null
  try {
    const sts = await leseStsEintrag(lauf, D)
    stsDa = stsVorhanden(sts)
    if (netz.modus === 'desktop' && sts.art === 'gueltig') richtlinieFolgt = sts
    else befunde.push(bewerteMtaSts(D, sts, netz.modus, null, mxHosts))
  } catch (e) {
    if (!(e instanceof LaufEnde)) throw e
    befunde.push(befund('mta_sts', D, ['STS-00'], e.message))
  }
  if (!richtlinieFolgt) melde('mta_sts')
  await sicher('tls_rpt', D, () => pruefeTlsRpt(lauf, D, stsDa))
  melde('tls_rpt')
  await sicher('dnssec', D, () => pruefeDnssec(lauf, D))
  melde('dnssec')
  await sicher('caa', D, () => pruefeCaa(lauf, D))
  melde('caa')

  // Website: im Browser nicht möglich (6.6); im Windows-Programm A/AAAA, TLS, HTTP, security.txt
  if (netz.modus === 'desktop') befunde.push(...(await pruefeWebsite(lauf, D, { mitMtaSts: stsDa, jetzt: u.jetzt, melde })))
  else for (const pruefId of WEBSITE_PRUEF_IDS) befunde.push(befund(pruefId, D, ['BROWSER-01'], 'nur im Windows-Programm'))
  for (const pruefId of WEBSITE_PRUEF_IDS) melde(pruefId)

  // Zuletzt die MTA-STS-Richtlinie (nur Windows-Programm, 6.7 Schritt 4)
  if (richtlinieFolgt) {
    const eintrag = richtlinieFolgt
    await sicher('mta_sts', D, async () => bewerteMtaSts(D, eintrag, 'desktop', await holeRichtlinie(lauf, D), mxHosts))
    melde('mta_sts')
  }
  return ergebnis()
}
