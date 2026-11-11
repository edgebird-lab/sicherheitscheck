import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { aendereBetrieb, neuePruefung, neuerBetrieb, setzeAntwort } from '../modell/operationen'
import { HEUTE, JETZT } from '../testhilfen/pruefung'
import { reduziere, startZustand, type Zustand } from './zustand'

function mitBetrieb(): Zustand {
  const { betrieb } = neuePruefung(neuerBetrieb('Tischlerei', JETZT, 'b-1'), KATALOG, 'Robin', HEUTE, JETZT, 'p-1')
  return reduziere(startZustand(), { typ: 'betriebNeu', betrieb })
}

describe('Zustand der Oberfläche', () => {
  it('ein neuer Betrieb wird hinzugefügt und mit seiner neuesten Prüfung geöffnet', () => {
    const z = mitBetrieb()
    expect(z.bestand.betriebe).toHaveLength(1)
    expect(z.ansicht).toEqual({ art: 'betrieb', betriebId: 'b-1', pruefungId: 'p-1', schritt: 'betrieb', anforderungId: null })
  })

  it('ändert nur den betroffenen Betrieb; ohne Änderung bleibt der Bestand dasselbe Objekt', () => {
    const z = mitBetrieb()
    const andere = neuerBetrieb('Bäckerei', JETZT, 'b-2')
    const z2 = { ...z, bestand: { ...z.bestand, betriebe: [...z.bestand.betriebe, andere] } }
    const z3 = reduziere(z2, { typ: 'betriebAendern', betriebId: 'b-1', aendere: (b) => aendereBetrieb(b, { branche: 'Handwerk' }, JETZT) })
    expect(z3.bestand.betriebe[0].branche).toBe('Handwerk')
    expect(z3.bestand.betriebe[1]).toBe(andere)
    expect(reduziere(z3, { typ: 'betriebAendern', betriebId: 'b-1', aendere: (b) => b }).bestand).toBe(z3.bestand)
  })

  it('ändert eine Prüfung und hält den Betrieb aktuell', () => {
    const z = reduziere(mitBetrieb(), {
      typ: 'pruefungAendern',
      betriebId: 'b-1',
      pruefungId: 'p-1',
      aendere: (p) => setzeAntwort(p, KATALOG, 'A01', { bewertung: 'erfuellt' }, JETZT),
      jetzt: JETZT,
    })
    expect(z.bestand.betriebe[0].pruefungen[0].antworten.A01.bewertung).toBe('erfuellt')
  })

  it('Löschen des offenen Betriebs führt zur Startseite', () => {
    const z = reduziere(mitBetrieb(), { typ: 'betriebLoeschen', betriebId: 'b-1' })
    expect(z.bestand.betriebe).toEqual([])
    expect(z.ansicht).toEqual({ art: 'start' })
  })

  it('Schritt und Anforderung wählen', () => {
    let z = reduziere(mitBetrieb(), { typ: 'schritt', schritt: 'interview' })
    z = reduziere(z, { typ: 'anforderung', anforderungId: 'A05' })
    expect(z.ansicht).toMatchObject({ schritt: 'interview', anforderungId: 'A05' })
    z = reduziere(z, { typ: 'schritt', schritt: 'auswertung' })
    expect(z.ansicht).toMatchObject({ schritt: 'auswertung', anforderungId: 'A05' })
  })

  it('ein neuer Bestand ohne den offenen Betrieb führt zur Startseite', () => {
    const z = reduziere(mitBetrieb(), { typ: 'bestand', bestand: startZustand().bestand })
    expect(z.ansicht).toEqual({ art: 'start' })
  })
})
