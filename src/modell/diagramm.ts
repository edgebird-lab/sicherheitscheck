/**
 * Geometrie des Netzdiagramms (Spezifikation 6.12, Annahme bis zum Abgleich mit der Norm):
 * Koordinatensystem 300 × 300, Mittelpunkt (150, 150), Radius 100. Sechs Achsen in der
 * Reihenfolge der Themenbereiche, Achse i bei θ = (i − 1) × 60°, oben beginnend im
 * Uhrzeigersinn. Punkt = (150 + 100 · anteil · sin θ, 150 − 100 · anteil · cos θ).
 */
import type { Thema, ThemaErgebnis, ThemaId } from './typen'

export const MITTE = 150
export const RADIUS = 100
export const RINGE = [0.25, 0.5, 0.75, 1]

/** Kurznamen für die Beschriftung im Diagramm; die Tabelle daneben nennt die vollen Namen. */
export const KURZNAMEN: Record<ThemaId, string> = {
  organisation: 'Organisation',
  identitaet: 'Identität & Rechte',
  datensicherung: 'Datensicherung',
  patch: 'Updates',
  schadprogramme: 'Schadprogramme',
  systeme: 'Systeme & Netze',
}

export interface Punkt {
  x: number
  y: number
}

export interface Achse {
  thema: ThemaId
  nr: number
  name: string
  anteil: number | null
  winkelGrad: number
  /** Datenpunkt; bei anteil = null der Mittelpunkt */
  punkt: Punkt
  /** Ende der Achse (100 %) */
  ende: Punkt
  /** Beschriftung, z. B. ['3 Datensicherung'] oder ['4 Updates', '(nicht bewertet)'] */
  beschriftung: string[]
  beschriftungPunkt: Punkt
  textAnker: 'start' | 'middle' | 'end'
}

const runde = (n: number) => Math.round(n * 100) / 100

export function punktAuf(winkelGrad: number, anteil: number): Punkt {
  const t = (winkelGrad * Math.PI) / 180
  return { x: runde(MITTE + RADIUS * anteil * Math.sin(t)), y: runde(MITTE - RADIUS * anteil * Math.cos(t)) }
}

export function netzdiagramm(themen: Thema[], jeThema: Record<ThemaId, ThemaErgebnis>) {
  const sortiert = [...themen].sort((a, b) => a.nr - b.nr)
  const n = sortiert.length
  const achsen: Achse[] = sortiert.map((t, i) => {
    const winkelGrad = (i * 360) / n
    const anteil = jeThema[t.id]?.anteil ?? null
    const beschriftungPunkt = punktAuf(winkelGrad, 1.16)
    const dx = beschriftungPunkt.x - MITTE
    return {
      thema: t.id,
      nr: t.nr,
      name: t.name,
      anteil,
      winkelGrad,
      punkt: anteil === null ? { x: MITTE, y: MITTE } : punktAuf(winkelGrad, Math.min(1, Math.max(0, anteil))),
      ende: punktAuf(winkelGrad, 1),
      beschriftung: anteil === null ? [`${t.nr} ${KURZNAMEN[t.id]}`, '(nicht bewertet)'] : [`${t.nr} ${KURZNAMEN[t.id]}`],
      beschriftungPunkt,
      textAnker: Math.abs(dx) < 1 ? 'middle' : dx > 0 ? 'start' : 'end',
    }
  })
  const polygon = (pts: Punkt[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')
  return {
    achsen,
    ringe: RINGE.map((r) => ({ anteil: r, punkte: polygon(achsen.map((a) => punktAuf(a.winkelGrad, r))) })),
    flaeche: polygon(achsen.map((a) => a.punkt)),
  }
}
