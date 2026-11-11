/**
 * Stichproben der Durchsicht vom 11.11.2026: Fälle, die die Tabellen der Spezifikation nicht
 * enthalten, mit von Hand nachgerechneten Werten (Rechnung jeweils im Kommentar).
 */
import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { betriebMit, JETZT, pruefungMit, zaehler } from '../testhilfen/pruefung'
import { berechneErgebnis, prozentVon } from './bewertung'
import { plusTage } from './datum'
import { netzdiagramm } from './diagramm'
import { gleicheMassnahmenAb, sortiereMassnahmen } from './massnahmen'
import { abschliessen, setzeVorfrage } from './operationen'
import type { Pruefung } from './typen'
import { vergleiche } from './vergleich'

/** WLAN verneint (6.2 nicht relevant), 2.5 begründet nicht relevant, 4.1 (TOP) und 1.3 nicht erfüllt, Rest erfüllt */
function gemischt(datum = '2026-12-20'): Pruefung {
  const p = pruefungMit(KATALOG, (a) => (a.id === 'A11' ? 'nicht_relevant' : a.id === 'A16' || a.id === 'A03' ? 'nicht_erfuellt' : 'erfuellt'), { datum })
  return setzeVorfrage(p, KATALOG, 'wlan', false, JETZT)
}

describe('Stichproben Bewertung (6.1)', () => {
  it('gemischte Relevanz: 28 von 35 Punkten, 80 %, Themen einzeln nachgerechnet', () => {
    const e = berechneErgebnis(KATALOG, gemischt())
    // Höchstwert 37 − 1 (6.2 WLAN) − 1 (2.5) = 35
    // TOP: 1.1 + 1.2 + 3.1 + 5.1 erfüllt = 12, 4.1 nicht erfüllt = −3 → 9
    // Basis: 20 relevant, davon 19 erfüllt (1.3 nicht) → 19; zusammen 28; 28 / 35 = 80 %
    expect(e).toMatchObject({ rohpunkte: 28, statuswert: 28, maximal: 35, prozent: 80 })
    expect(e.nichtRelevant).toEqual(['A11', 'A23'])
    expect(e.topNichtErfuellt).toEqual(['A16'])
    // Organisation: 3 + 3 + 0 + 1 + 1 + 1 = 9 von 10; Identität: 4 von 4 (2.5 entfällt)
    // Patch: −3 + 1 + 1 = −1 von 5 → Anteil 0; Systeme: 5 von 5 (6.2 entfällt)
    expect(e.jeThema.organisation).toEqual({ roh: 9, maximal: 10, anteil: 0.9 })
    expect(e.jeThema.identitaet).toEqual({ roh: 4, maximal: 4, anteil: 1 })
    expect(e.jeThema.patch).toEqual({ roh: -1, maximal: 5, anteil: 0 })
    expect(e.jeThema.systeme).toEqual({ roh: 5, maximal: 5, anteil: 1 })
  })

  it('Prozent: kaufmännisch gerundet für jeden möglichen Punktestand (Höchstwert 1 bis 37)', () => {
    // exakt in Ganzzahlen: round(100 · s / m) = floor((200 · s + m) / (2 · m)); 16 Fälle liegen genau auf „,5“
    let haelften = 0
    for (let m = 1; m <= 37; m++) {
      for (let s = 0; s <= m; s++) {
        if ((200 * s) % (2 * m) === m) haelften++
        expect(prozentVon(s, m), `${s} von ${m}`).toBe(Math.floor((200 * s + m) / (2 * m)))
      }
    }
    expect(haelften).toBe(16)
    expect(prozentVon(1, 8)).toBe(13) // 12,5 → 13
    expect(prozentVon(0, 0)).toBe(0)
  })

  it('Netzdiagramm: Anteil 0,9 oben, 0 bei Thema 4 im Mittelpunkt', () => {
    const d = netzdiagramm(KATALOG.themen, berechneErgebnis(KATALOG, gemischt()).jeThema)
    // θ = 0°: (150 + 0; 150 − 90) = (150; 60); θ = 180°, Anteil 0: Mittelpunkt
    expect(d.achsen[0].punkt).toEqual({ x: 150, y: 60 })
    expect(d.achsen[3].punkt).toEqual({ x: 150, y: 150 })
    // θ = 60°, Anteil 1: (150 + 100 · sin 60°; 150 − 100 · cos 60°) = (236,60; 100)
    expect(d.achsen[1].punkt).toEqual({ x: 236.6, y: 100 })
  })
})

describe('Stichproben Fristen und Maßnahmen (6.8)', () => {
  it('Fristen über den Jahreswechsel und den Februar 2027', () => {
    // 20.12.2026 + 14 = 03.01.2027; + 90: 11 Tage bis 31.12., 31 im Januar, 28 im Februar, 20 im März
    expect(plusTage('2026-12-20', 14)).toBe('2027-01-03')
    expect(plusTage('2026-12-20', 90)).toBe('2027-03-20')
    expect(plusTage('2026-12-20', 180)).toBe('2027-06-18')
    // Schaltjahr 2028 und Sommerzeit 2027 (28.03.) verschieben nichts
    expect(plusTage('2028-02-15', 14)).toBe('2028-02-29')
    expect(plusTage('2027-03-20', 14)).toBe('2027-04-03')
  })

  it('Abschluss der gemischten Prüfung: zwei Maßnahmen, TOP zuerst, Fristen ab dem Interview', () => {
    const r = abschliessen(KATALOG, gemischt(), JETZT, zaehler('m'))
    if (!r.ok) throw new Error(r.fehler.map((f) => f.text).join(' '))
    const m = sortiereMassnahmen(KATALOG, r.pruefung.massnahmen)
    expect(m.map((x) => [x.titel, x.prioritaet, x.frist])).toEqual([
      ['Updates werden zeitnah eingespielt', 1, '2027-01-03'],
      ['Zuständigkeit für IT-Sicherheit ist geregelt', 2, '2027-03-20'],
    ])
    expect(r.pruefung.ergebnis?.statuswert).toBe(28)
  })

  it('Abgleich nach der Wiederholung: eine Antwort jetzt erfüllt, unberührte Maßnahme fällt weg', () => {
    const r = abschliessen(KATALOG, gemischt(), JETZT, zaehler('m'))
    if (!r.ok) throw new Error('Abschluss')
    const jetzt = { ...r.pruefung, status: 'entwurf' as const, ergebnis: null, antworten: { ...r.pruefung.antworten, A03: { bewertung: 'erfuellt' as const, begruendung: 'geregelt', nachweis: '', uebernommen: false } } }
    expect(gleicheMassnahmenAb(KATALOG, jetzt, JETZT).massnahmen.map((x) => x.titel)).toEqual(['Updates werden zeitnah eingespielt'])
  })
})

describe('Stichproben Vergleich (6.9)', () => {
  it('Relevanz geändert: 18 von 37 (49 %) gegen 28 von 35 (80 %) wird über Prozent verglichen', () => {
    // vorher: 3 TOP und 15 Basis erfüllt wie im Beispielbetrieb → 9 − 6 + 15 = 18; 18 / 37 = 48,6 % → 49 %
    const erfuelltVorher = new Set(['A01', 'A03', 'A05', 'A07', 'A08', 'A11', 'A12', 'A13', 'A16', 'A17', 'A18', 'A20', 'A21', 'A22', 'A23', 'A25', 'A26', 'A27'])
    const vorher = { ...pruefungMit(KATALOG, (a) => (erfuelltVorher.has(a.id) ? 'erfuellt' : 'nicht_erfuellt')), id: 'p-alt', nr: 1, status: 'abgeschlossen' as const }
    const alt = { ...vorher, ergebnis: berechneErgebnis(KATALOG, vorher) }
    const neu = { ...gemischt(), id: 'p-neu', nr: 2, vorgaengerId: 'p-alt' }
    const v = vergleiche(KATALOG, alt, neu)
    expect(v.statuswert).toEqual({ vorher: 18, jetzt: 28, maximalVorher: 37, maximalJetzt: 35, prozentVorher: 49, prozentJetzt: 80, direktVergleichbar: false })
    // 2.5 und 6.2 waren bewertet und sind jetzt nicht relevant → nicht vergleichbar
    expect(v.anforderungen.filter((a) => a.veraenderung === 'nicht_vergleichbar').map((a) => a.id)).toEqual(['A11', 'A23'])
    // 1.3 war erfüllt und ist es jetzt nicht → schlechter; 4.1 erfüllt → nicht erfüllt → schlechter
    expect(v.anforderungen.filter((a) => a.veraenderung === 'schlechter').map((a) => a.id)).toEqual(['A03', 'A16'])
    expect(betriebMit(alt, neu).pruefungen).toHaveLength(2)
  })
})
