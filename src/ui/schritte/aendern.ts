import { useCallback } from 'react'
import { KATALOG } from '../../katalog'
import { heuteLokal } from '../../modell/datum'
import { aendereBetrieb, kannWiederholen, neuePruefung, wiederholungspruefung, type BetriebFelder } from '../../modell/operationen'
import type { Pruefung } from '../../modell/typen'
import { useBestaetigen } from '../frage'
import { useApp, useAuswahl } from '../kontext'

/** Änderungen am offenen Betrieb und an der gewählten Prüfung */
export function useAendern() {
  const { dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const betriebId = betrieb.id
  const pruefungId = pruefung?.id
  return {
    betrieb: useCallback((felder: BetriebFelder) => dispatch({ typ: 'betriebAendern', betriebId, aendere: (b) => aendereBetrieb(b, felder, new Date()) }), [dispatch, betriebId]),
    pruefung: useCallback(
      (f: (p: Pruefung, jetzt: Date) => Pruefung) => {
        if (!pruefungId) return
        const jetzt = new Date()
        dispatch({ typ: 'pruefungAendern', betriebId, pruefungId, aendere: (p) => f(p, jetzt), jetzt })
      },
      [dispatch, betriebId, pruefungId],
    ),
  }
}

/** Neue Prüfung oder Wiederholungsprüfung anlegen und öffnen */
export function usePruefungAnlegen() {
  const { z, dispatch, melde } = useApp()
  const { betrieb } = useAuswahl()
  const bestaetigen = useBestaetigen()
  const berater = z.bestand.einstellungen.berater.name

  /**
   * Gibt es schon einen Entwurf, fragt jede weitere Prüfung nach. Sonst entstünden etwa per
   * Doppelklick auf „Wiederholungsprüfung“ zwei Entwürfe mit doppelt übernommenen Maßnahmen.
   */
  const trotzEntwurf = useCallback(
    async (art: string, knopf: string) => {
      const entwurf = betrieb.pruefungen.find((p) => p.status === 'entwurf')
      return !entwurf || bestaetigen('Weitere Prüfung anlegen?', `Prüfung ${entwurf.nr} ist noch ein Entwurf. Trotzdem ${art} anlegen?`, knopf, 'haupt')
    },
    [betrieb, bestaetigen],
  )

  const neu = useCallback(async () => {
    if (!(await trotzEntwurf('eine neue, leere Prüfung', 'Neue Prüfung anlegen'))) return
    const jetzt = new Date()
    const r = neuePruefung(betrieb, KATALOG, berater, heuteLokal(jetzt), jetzt)
    dispatch({ typ: 'betriebAendern', betriebId: betrieb.id, aendere: () => r.betrieb })
    dispatch({ typ: 'oeffneBetrieb', betriebId: betrieb.id, pruefungId: r.pruefung.id, schritt: 'vorgespraech' })
    melde(`Prüfung ${r.pruefung.nr} angelegt.`)
  }, [betrieb, berater, trotzEntwurf, dispatch, melde])

  const wiederholung = useCallback(async () => {
    if (!(await trotzEntwurf('eine Wiederholungsprüfung', 'Wiederholungsprüfung anlegen'))) return
    const jetzt = new Date()
    const r = wiederholungspruefung(betrieb, KATALOG, berater, heuteLokal(jetzt), jetzt)
    if (!r) return
    dispatch({ typ: 'betriebAendern', betriebId: betrieb.id, aendere: () => r.betrieb })
    dispatch({ typ: 'oeffneBetrieb', betriebId: betrieb.id, pruefungId: r.pruefung.id, schritt: 'vorgespraech' })
    melde(`Wiederholungsprüfung ${r.pruefung.nr} angelegt, Antworten vorbelegt.`)
  }, [betrieb, berater, trotzEntwurf, dispatch, melde])

  return { neu, wiederholung, kannWiederholen: kannWiederholen(betrieb) }
}
