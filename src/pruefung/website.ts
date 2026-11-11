/**
 * Website-Teil der Außenprüfung im Windows-Programm (Spezifikation 6.6, 6.7 Schritte 2 bis 4):
 * A und AAAA für D und W, dann TLS für D, W und gegebenenfalls S, dann die HTTP-Ketten
 * http://D/, http://W/, https://D/, https://W/ und zuletzt security.txt. Alles nacheinander;
 * den Abstand zwischen HTTP-Abrufen hält der Lauf ein. Grenze oder Abbruch beenden eine
 * Prüfung mit WEB-15 (fehler) und dem Grund im Messwert.
 */
import type { Befund, PruefId } from '../modell/typen'
import { bewerteHeader } from './header'
import { bewerteHsts } from './hsts'
import { LaufEnde, type Lauf } from './lauf'
import { bewerteSecurityTxt, securityTxtAdresse } from './sectxt'
import { befund, REGEL_WEBSITE_NICHT_PRUEFBAR, WEBSITE_PRUEF_IDS } from './stufen'
import { bewerteHttps, bewerteWeiterleitung, endantwort, folge, HEADER_PRUEF_IDS, HOST_PRUEF_IDS, ketteText, vorpruefung, type HostStand, type Kette } from './web'
import { bewerteTlsVersion, bewerteZertifikat } from './zertifikat'

export interface WebsiteOptionen {
  /** MTA-STS-Eintrag vorhanden: Zertifikat und TLS auch für mta-sts.D */
  mitMtaSts: boolean
  jetzt: () => Date
  /** nach jeder fertigen Prüfung */
  melde: (pruefId: PruefId) => void
}

const nichtPruefbar = (pruefIds: PruefId[], ziel: string, grund: string) => pruefIds.map((p) => befund(p, ziel, [REGEL_WEBSITE_NICHT_PRUEFBAR], grund))

/** Führt einen Schritt aus; Grenze oder Abbruch kommen als LaufEnde zurück statt als Ausnahme. */
async function oderEnde<T>(schritt: () => Promise<T>): Promise<T | LaufEnde> {
  try {
    return await schritt()
  } catch (e) {
    if (e instanceof LaufEnde) return e
    throw e
  }
}

export async function pruefeWebsite(lauf: Lauf, D: string, o: WebsiteOptionen): Promise<Befund[]> {
  const W = `www.${D}`
  const S = `mta-sts.${D}`
  const befunde: Befund[] = []

  // Vorprüfung (Teil von Schritt 2)
  const stand = new Map<string, HostStand>()
  for (const h of [D, W]) {
    const s = await oderEnde(() => vorpruefung(lauf, h))
    if (s instanceof LaufEnde) return nichtPruefbar(WEBSITE_PRUEF_IDS, D, s.message)
    stand.set(h, s)
  }
  const da = [D, W].filter((h) => stand.get(h)?.art === 'da')
  for (const h of [D, W]) {
    const s = stand.get(h)
    if (s?.art === 'gescheitert') befunde.push(...HOST_PRUEF_IDS.map((p) => befund(p, h, ['WEB-09'], `Adressabfrage gescheitert (${s.grund})`)))
  }
  const keineWebsite = [D, W].every((h) => stand.get(h)?.art === 'fehlt')
  if (keineWebsite) befunde.push(befund('https_erreichbar', D, ['WEB-00'], `keine Adresse (A, AAAA) für ${D} und ${W}`))

  // Schritt 3: TLS für D, W und S, nacheinander
  for (const h of [...da, ...(o.mitMtaSts ? [S] : [])]) {
    const r = await oderEnde(() => lauf.tls(h))
    if (r instanceof LaufEnde) befunde.push(...nichtPruefbar(['zertifikat', 'tls_version'], h, r.message))
    else befunde.push(bewerteZertifikat(h, r, o.jetzt()), bewerteTlsVersion(h, r))
  }
  o.melde('zertifikat')
  o.melde('tls_version')

  // Schritt 4: HTTP-Ketten, erst http://, dann https://
  const kette = (start: string): Promise<Kette | LaufEnde> => oderEnde(() => folge(lauf, D, start))
  for (const h of da) {
    const k = await kette(`http://${h}/`)
    befunde.push(k instanceof LaufEnde ? befund('http_weiterleitung', h, [REGEL_WEBSITE_NICHT_PRUEFBAR], k.message) : bewerteWeiterleitung(h, k))
  }
  o.melde('http_weiterleitung')

  // Sicherheits-Header an jeder Endantwort, gleiche End-Adressen nur einmal; Ersatzbefunde nur,
  // wenn für dasselbe Ziel keine echte Auswertung vorliegt (genau ein Befund je Prüfung und Ziel)
  const header = new Map<string, Befund>()
  const ersatz: Befund[] = []
  const enden = new Set<string>()
  for (const h of da) {
    const k = await kette(`https://${h}/`)
    if (k instanceof LaufEnde) {
      befunde.push(...nichtPruefbar(['https_erreichbar', 'hsts'], h, k.message))
      ersatz.push(...nichtPruefbar(HEADER_PRUEF_IDS, h, k.message))
      continue
    }
    befunde.push(bewerteHttps(h, k), bewerteHsts(h, k))
    const ende = endantwort(k)
    if (!ende) {
      ersatz.push(...HEADER_PRUEF_IDS.map((p) => befund(p, h, ['HDR-00'], `keine verwertbare HTTPS-Antwort: ${ketteText(k)}`)))
      continue
    }
    if (enden.has(ende.url)) continue
    enden.add(ende.url)
    for (const b of bewerteHeader(new URL(ende.url).hostname, ende.antwort)) {
      const schluessel = `${b.pruefId} ${b.ziel}`
      if (!header.has(schluessel)) header.set(schluessel, b)
    }
  }
  for (const b of ersatz) {
    const schluessel = `${b.pruefId} ${b.ziel}`
    if (!header.has(schluessel)) header.set(schluessel, b)
  }
  befunde.push(...header.values())
  for (const p of ['https_erreichbar', 'hsts', ...HEADER_PRUEF_IDS] as PruefId[]) o.melde(p)

  // security.txt unter D
  const d = stand.get(D)
  if (d?.art === 'da') {
    const k = await kette(securityTxtAdresse(D))
    befunde.push(k instanceof LaufEnde ? befund('security_txt', D, [REGEL_WEBSITE_NICHT_PRUEFBAR], k.message) : bewerteSecurityTxt(D, k, o.jetzt()))
  } else if (d?.art === 'gescheitert') {
    befunde.push(befund('security_txt', D, ['WEB-09'], `Adressabfrage gescheitert (${d.grund})`))
  } else if (!keineWebsite) {
    befunde.push(befund('security_txt', D, ['SECTXT-01'], `${D} hat keine Adresse (A, AAAA)`))
  }
  o.melde('security_txt')
  return befunde
}
