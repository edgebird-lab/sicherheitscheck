/**
 * Vergleich mit der letzten Prüfung (Spezifikation 6.9). Berechnet, nicht gespeichert.
 */
import { PRUEF_IDS } from '../pruefung/stufen'
import { berechneErgebnis, wirksameBewertung } from './bewertung'
import { istOffen } from './massnahmen'
import type { Befund, Betrieb, Bewertung, Katalog, Pruefung, Stufe, Veraenderung, Vergleich } from './typen'

/** Vorgänger: `vorgaengerId`, sonst die letzte abgeschlossene Prüfung mit kleinerer Nummer */
export function vorgaengerVon(b: Pick<Betrieb, 'pruefungen'>, p: Pruefung): Pruefung | null {
  const genannt = p.vorgaengerId ? b.pruefungen.find((x) => x.id === p.vorgaengerId) : undefined
  if (genannt) return genannt
  return (
    b.pruefungen
      .filter((x) => x.status === 'abgeschlossen' && x.nr < p.nr)
      .sort((x, y) => y.nr - x.nr)[0] ?? null
  )
}

/** Wert einer Bewertung: 1 erfüllt, 0 nicht erfüllt oder offen, keiner bei nicht relevant */
function wert(b: Bewertung): number | null {
  if (b === 'nicht_relevant') return null
  return b === 'erfuellt' ? 1 : 0
}

export function veraenderungAnforderung(vorher: Bewertung, jetzt: Bewertung): Veraenderung {
  const v = wert(vorher)
  const j = wert(jetzt)
  if (v === null && j === null) return 'gleich'
  if (v === null || j === null) return 'nicht_vergleichbar'
  return j > v ? 'besser' : j < v ? 'schlechter' : 'gleich'
}

/** Rang einer Stufe: ok und info 0, hinweis 1, warnung 2, kritisch 3; fehler und nicht_geprueft ohne Rang */
function rang(s: Stufe): number | null {
  switch (s) {
    case 'ok':
    case 'info':
      return 0
    case 'hinweis':
      return 1
    case 'warnung':
      return 2
    case 'kritisch':
      return 3
    default:
      return null
  }
}

export function veraenderungBefund(vorher: Stufe | null, jetzt: Stufe | null): Veraenderung {
  if (vorher === null && jetzt === null) return 'gleich'
  if (vorher === null) return 'neu'
  if (jetzt === null) return 'entfallen'
  const v = rang(vorher)
  const j = rang(jetzt)
  if (v === null || j === null) return 'nicht_vergleichbar'
  return j < v ? 'besser' : j > v ? 'schlechter' : 'gleich'
}

const befundSchluessel = (b: Pick<Befund, 'pruefId' | 'ziel'>) => `${b.pruefId}|${b.ziel}`

/**
 * Vergleicht zwei Prüfungen. Befunde werden nur verglichen, wenn beide Prüfungen eine
 * Außenprüfung haben; sonst wäre jeder Befund „neu“ oder „entfallen“, ohne dass sich etwas
 * geändert hat.
 */
export function vergleiche(k: Katalog, vorher: Pruefung, jetzt: Pruefung): Vergleich {
  const ev = vorher.ergebnis ?? berechneErgebnis(k, vorher)
  const ej = jetzt.ergebnis ?? berechneErgebnis(k, jetzt)

  const anforderungen = k.anforderungen.map((a) => {
    const v = wirksameBewertung(a, vorher)
    const j = wirksameBewertung(a, jetzt)
    return { id: a.id, vorher: v, jetzt: j, veraenderung: veraenderungAnforderung(v, j) }
  })

  const befunde: Vergleich['befunde'] = []
  if (vorher.aussen && jetzt.aussen) {
    const alt = new Map(vorher.aussen.befunde.map((b) => [befundSchluessel(b), b]))
    const neu = new Map(jetzt.aussen.befunde.map((b) => [befundSchluessel(b), b]))
    const schluessel = [...new Set([...alt.keys(), ...neu.keys()])]
    for (const s of schluessel) {
      const b = (neu.get(s) ?? alt.get(s))!
      const sv = alt.get(s)?.stufe ?? null
      const sj = neu.get(s)?.stufe ?? null
      befunde.push({ pruefId: b.pruefId, ziel: b.ziel, vorher: sv, jetzt: sj, veraenderung: veraenderungBefund(sv, sj) })
    }
    befunde.sort((x, y) => PRUEF_IDS.indexOf(x.pruefId) - PRUEF_IDS.indexOf(y.pruefId) || x.ziel.localeCompare(y.ziel))
  }

  return {
    vorherId: vorher.id,
    statuswert: {
      vorher: ev.statuswert,
      jetzt: ej.statuswert,
      maximalVorher: ev.maximal,
      maximalJetzt: ej.maximal,
      prozentVorher: ev.prozent,
      prozentJetzt: ej.prozent,
      direktVergleichbar: ev.maximal === ej.maximal,
    },
    anforderungen,
    befunde,
    massnahmenVorher: {
      erledigt: vorher.massnahmen.filter((m) => m.status === 'erledigt').length,
      offen: vorher.massnahmen.filter(istOffen).length,
    },
  }
}
