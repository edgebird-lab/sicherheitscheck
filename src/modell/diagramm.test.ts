import { expect, it } from 'vitest'
import { THEMEN } from '../katalog/themen'
import { THEMA_IDS } from './bewertung'
import { netzdiagramm } from './diagramm'
import type { ThemaErgebnis, ThemaId } from './typen'

function werte(anteile: Partial<Record<ThemaId, number | null>>): Record<ThemaId, ThemaErgebnis> {
  return Object.fromEntries(THEMA_IDS.map((id) => [id, { roh: 0, maximal: 5, anteil: id in anteile ? (anteile[id] ?? null) : 0 }])) as Record<ThemaId, ThemaErgebnis>
}

it('T-G01: Thema 1 mit Anteil 1 und Thema 2 mit Anteil 0,5', () => {
  const { achsen } = netzdiagramm(THEMEN, werte({ organisation: 1, identitaet: 0.5 }))
  // θ = 0°: (150 + 0, 150 − 100) = (150; 50)
  expect(achsen[0].punkt).toEqual({ x: 150, y: 50 })
  // θ = 60°: (150 + 50 · sin 60°, 150 − 50 · cos 60°) = (150 + 43,30; 150 − 25) = (193,30; 125,00)
  expect(achsen[1].punkt).toEqual({ x: 193.3, y: 125 })
  expect(achsen.map((a) => a.winkelGrad)).toEqual([0, 60, 120, 180, 240, 300])
  // Anteil 0 liegt im Mittelpunkt
  expect(achsen[2].punkt).toEqual({ x: 150, y: 150 })
})

it('T-G02: Anteil null → Punkt im Mittelpunkt, Beschriftung „nicht bewertet“', () => {
  const { achsen } = netzdiagramm(THEMEN, werte({ patch: null }))
  const patch = achsen.find((a) => a.thema === 'patch')!
  expect(patch.punkt).toEqual({ x: 150, y: 150 })
  expect(patch.beschriftung.join(' ')).toContain('nicht bewertet')
  expect(achsen.find((a) => a.thema === 'organisation')!.beschriftung.join(' ')).not.toContain('nicht bewertet')
})

it('Ringe bei 25, 50, 75 und 100 %, Achsenenden auf dem Radius', () => {
  const d = netzdiagramm(THEMEN, werte({}))
  expect(d.ringe.map((r) => r.anteil)).toEqual([0.25, 0.5, 0.75, 1])
  expect(d.ringe[3].punkte.split(' ')[0]).toBe('150,50')
  expect(d.achsen[3].ende).toEqual({ x: 150, y: 250 })
  // Beschriftung links oder rechts der Mitte bekommt den passenden Textanker
  expect(d.achsen.map((a) => a.textAnker)).toEqual(['middle', 'start', 'start', 'middle', 'end', 'end'])
})
