/** Hilfen für Regeltests: ein Lauf über dem Testnetz, ohne echte Wartezeit. */
import type { Befund, DnsAntwort } from '../modell/typen'
import { ausDohJson } from '../netz/schnittstelle'
import { testnetz, type TestnetzDaten } from '../netz/testnetz'
import { Lauf, laufUmgebung, type Grenzen } from '../pruefung/lauf'
import { JETZT } from './pruefung'

export function testlauf(daten: TestnetzDaten = {}, grenzen: Partial<Grenzen> = {}, signal?: AbortSignal) {
  const netz = testnetz(daten)
  const lauf = new Lauf(netz, laufUmgebung({ jetzt: () => JETZT, uhr: () => 0, warte: async () => {}, grenzen, signal }))
  return { netz, lauf }
}

/** Kurzform eines Befunds für Vergleiche: Hauptregel, Stufe und weitere Regeln */
export function kurz(b: Befund): { regel: string; stufe: string; weitere: string[] } {
  return { regel: b.regel, stufe: b.stufe, weitere: b.weitere.map((w) => w.regel) }
}

/** Fiktive Zone des Beispielbetriebs (testdaten/dns/beispiel-zone.json) als Antworten fürs Testnetz */
export function beispielZone(): Record<string, DnsAntwort> {
  const datei = import.meta.glob<{ default: Record<string, unknown> }>('/testdaten/dns/beispiel-zone.json', { eager: true })['/testdaten/dns/beispiel-zone.json']
  return Object.fromEntries(Object.entries(datei.default).map(([k, v]) => [k, ausDohJson(v) as DnsAntwort]))
}
