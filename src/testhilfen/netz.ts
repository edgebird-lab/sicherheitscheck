/** Hilfen für Regeltests: ein Lauf über dem Testnetz, ohne echte Wartezeit. */
import type { Befund } from '../modell/typen'
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
