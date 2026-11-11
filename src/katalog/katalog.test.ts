import { describe, expect, it } from 'vitest'
import abgleich from '../../docs/katalog-abgleich.md?raw'
import { GRUNDSCHUTZ_BAUSTEINE } from './themen'
import { KATALOG } from './index'

const { anforderungen, themen, vorfragen, vorbereitung } = KATALOG

describe('Katalog (Spezifikation 9.1)', () => {
  it('T-K01: 27 Anforderungen, id und normNr eindeutig', () => {
    expect(anforderungen).toHaveLength(27)
    expect(new Set(anforderungen.map((a) => a.id)).size).toBe(27)
    expect(new Set(anforderungen.map((a) => a.normNr)).size).toBe(27)
    // stabile Kennungen A01 bis A27
    expect(anforderungen.map((a) => a.id)).toEqual(Array.from({ length: 27 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`))
  })

  it('T-K02: genau 5 TOP-Anforderungen, 2 in organisation, je 1 in datensicherung, patch, schadprogramme', () => {
    const top = anforderungen.filter((a) => a.top)
    expect(top).toHaveLength(5)
    const jeThema = (id: string) => top.filter((a) => a.thema === id).length
    expect(jeThema('organisation')).toBe(2)
    expect(jeThema('datensicherung')).toBe(1)
    expect(jeThema('patch')).toBe(1)
    expect(jeThema('schadprogramme')).toBe(1)
    expect(jeThema('identitaet')).toBe(0)
    expect(jeThema('systeme')).toBe(0)
  })

  it('T-K03: 6 Themen mit nr 1–6, jedes mit Anforderungen, Maximum 37, Vorfrage-Verweise gültig', () => {
    expect(themen.map((t) => t.nr).sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(themen.map((t) => t.id)).size).toBe(6)
    for (const t of themen) expect(anforderungen.some((a) => a.thema === t.id)).toBe(true)
    // 22 × 1 + 5 × 3
    expect(anforderungen.reduce((s, a) => s + (a.top ? 3 : 1), 0)).toBe(37)
    const ids = new Set(vorfragen.map((v) => v.id))
    for (const a of anforderungen) if (a.relevanz.art === 'vorfrage') expect(ids.has(a.relevanz.vorfrageId)).toBe(true)
  })

  it('Anforderungen sind nach Themenbereich geordnet', () => {
    const nr = (id: string) => themen.find((t) => t.id === id)!.nr
    const folge = anforderungen.map((a) => nr(a.thema))
    expect(folge).toEqual([...folge].sort((a, b) => a - b))
  })

  it('jede Vorfrage steuert mindestens eine Anforderung', () => {
    for (const v of vorfragen) {
      expect(anforderungen.some((a) => a.relevanz.art === 'vorfrage' && a.relevanz.vorfrageId === v.id), v.id).toBe(true)
    }
  })

  it('TOP-Anforderungen sind immer relevant', () => {
    for (const a of anforderungen.filter((x) => x.top)) expect(a.relevanz.art, a.id).toBe('immer')
  })

  it('Texte sind vorhanden und Titel höchstens 60 Zeichen lang', () => {
    for (const a of anforderungen) {
      expect(a.titel.length, a.id).toBeLessThanOrEqual(60)
      for (const text of [a.titel, a.frage, a.hilfe, a.massnahme]) expect(text.trim().length, a.id).toBeGreaterThan(10)
      expect(a.frage.endsWith('?'), a.id).toBe(true)
    }
    for (const v of vorfragen) {
      expect(v.frage.endsWith('?'), v.id).toBe(true)
      expect(v.hilfe.length, v.id).toBeGreaterThan(10)
    }
    expect(new Set(vorbereitung.map((v) => v.id)).size).toBe(vorbereitung.length)
  })

  it('nennt nur bekannte Bausteine des IT-Grundschutzes', () => {
    for (const a of anforderungen) for (const b of a.grundschutz) expect(GRUNDSCHUTZ_BAUSTEINE[b], `${a.id}: ${b}`).toBeDefined()
    for (const t of themen) for (const b of t.grundschutz) expect(GRUNDSCHUTZ_BAUSTEINE[b], `${t.id}: ${b}`).toBeDefined()
  })

  it('verwendet den Namen „CyberRisikoCheck“ nicht', () => {
    const alles = JSON.stringify(KATALOG).toLowerCase()
    expect(alles).not.toContain('cyberrisikocheck')
    expect(alles).not.toContain('cyberrisiko-check')
  })

  it('docs/katalog-abgleich.md hat für jede Anforderung die passende Zeile', () => {
    for (const a of anforderungen) {
      const thema = themen.find((t) => t.id === a.thema)!.name
      expect(abgleich, a.id).toContain(`| ${a.id} | ${a.normNr} | ${thema} | ${a.top ? 'TOP ' : ''}| ${a.titel} |`)
    }
  })
})
