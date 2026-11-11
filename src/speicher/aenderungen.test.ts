import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aendereBetrieb, neuerBetrieb } from '../modell/operationen'
import type { Datenbestand } from '../modell/typen'
import { JETZT } from '../testhilfen/pruefung'
import { aenderungenZwischen, Schreibpuffer, type Aenderungen, type Speicherstatus } from './aenderungen'
import { leererBestand } from './pruefen'

describe('Änderungen erkennen', () => {
  it('findet geänderte, neue und gelöschte Betriebe und geänderte Einstellungen', () => {
    const a = neuerBetrieb('A', JETZT, 'a')
    const b = neuerBetrieb('B', JETZT, 'b')
    const c = neuerBetrieb('C', JETZT, 'c')
    const vorher: Datenbestand = { ...leererBestand(), betriebe: [a, b] }
    const b2 = aendereBetrieb(b, { branche: 'Bau' }, JETZT)
    const nachher: Datenbestand = { ...vorher, einstellungen: { ...vorher.einstellungen, darstellung: 'dunkel' }, betriebe: [b2, c] }
    expect(aenderungenZwischen(vorher, nachher)).toEqual({ betriebe: [b2, c], geloescht: ['a'], einstellungen: nachher.einstellungen })
    expect(aenderungenZwischen(nachher, nachher)).toEqual({ betriebe: [], geloescht: [], einstellungen: null })
  })
})

describe('Schreibpuffer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function aufbau(fehlschlaege = 0) {
    const geschrieben: Aenderungen[] = []
    const status: Speicherstatus[] = []
    let rest = fehlschlaege
    const puffer = new Schreibpuffer(
      {
        schreibe: async (a) => {
          if (rest-- > 0) throw new Error('voll')
          geschrieben.push(a)
        },
      },
      (s) => status.push(s),
    )
    return { puffer, geschrieben, status }
  }

  it('schreibt mehrere Änderungen nach 400 ms gesammelt, mit dem neuesten Stand', async () => {
    const { puffer, geschrieben, status } = aufbau()
    const a = neuerBetrieb('A', JETZT, 'a')
    const a2 = aendereBetrieb(a, { notiz: 'neu' }, JETZT)
    puffer.merke({ betriebe: [a], geloescht: [], einstellungen: null })
    await vi.advanceTimersByTimeAsync(300)
    puffer.merke({ betriebe: [a2], geloescht: [], einstellungen: null })
    await vi.advanceTimersByTimeAsync(399)
    expect(geschrieben).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(geschrieben).toEqual([{ betriebe: [a2], geloescht: [], einstellungen: null }])
    expect(status).toEqual(['ausstehend', 'ausstehend', 'speichert', 'gespeichert'])
  })

  it('eine Löschung ersetzt eine ausstehende Änderung desselben Betriebs', async () => {
    const { puffer, geschrieben } = aufbau()
    puffer.merke({ betriebe: [neuerBetrieb('A', JETZT, 'a')], geloescht: [], einstellungen: null })
    puffer.merke({ betriebe: [], geloescht: ['a'], einstellungen: null })
    await puffer.schreibeJetzt()
    expect(geschrieben).toEqual([{ betriebe: [], geloescht: ['a'], einstellungen: null }])
  })

  it('schreibeJetzt schreibt sofort, ohne auf die Verzögerung zu warten', async () => {
    const { puffer, geschrieben } = aufbau()
    puffer.merke({ betriebe: [], geloescht: [], einstellungen: leererBestand().einstellungen })
    await puffer.schreibeJetzt()
    expect(geschrieben).toHaveLength(1)
    expect(puffer.hatAusstehende).toBe(false)
  })

  it('verliert bei einem Fehler nichts und versucht es erneut', async () => {
    const { puffer, geschrieben, status } = aufbau(1)
    const a = neuerBetrieb('A', JETZT, 'a')
    puffer.merke({ betriebe: [a], geloescht: [], einstellungen: null })
    await vi.advanceTimersByTimeAsync(400)
    expect(status.at(-1)).toBe('fehler')
    expect(puffer.hatAusstehende).toBe(true)
    // zweiter Versuch nach 800 ms
    await vi.advanceTimersByTimeAsync(800)
    expect(geschrieben).toEqual([{ betriebe: [a], geloescht: [], einstellungen: null }])
    expect(status.at(-1)).toBe('gespeichert')
  })
})
