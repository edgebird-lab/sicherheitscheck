/**
 * Laden und Speichern der Daten in der Oberfläche (7.4): Tab-Sperre, IndexedDB, Prüfung
 * beim Laden, Schreibpuffer mit 400 ms Verzögerung, Schreiben vor dem Schließen.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { KATALOG } from '../katalog'
import type { Datenbestand } from '../modell/typen'
import { plattform } from '../plattform'
import { aenderungenZwischen, Schreibpuffer, type Speicherstatus } from '../speicher/aenderungen'
import { dauerhaftAnfordern, oeffneSpeicher, type Speicher } from '../speicher/idb'
import { migriere } from '../speicher/migration'
import { Formatfehler, leererBestand, pruefeDatenbestand } from '../speicher/pruefen'
import { tabSperre, tabSperreErneut } from '../speicher/sperre'
import { reduziere, startZustand } from './zustand'

export type Ladezustand =
  | { art: 'laedt' }
  | { art: 'gesperrt' }
  | { art: 'fehler'; text: string }
  /** `meldungen`: übersprungene Betriebe; `ohneSpeicher`: IndexedDB nicht verfügbar */
  | { art: 'bereit'; meldungen: string[]; ohneSpeicher: boolean }

export function useDaten() {
  const [z, dispatch] = useReducer(reduziere, undefined, startZustand)
  const [lade, setLade] = useState<Ladezustand>({ art: 'laedt' })
  const [status, setStatus] = useState<Speicherstatus>('gespeichert')
  const [dauerhaft, setDauerhaft] = useState<boolean | null>(null)
  const speicher = useRef<Speicher | null>(null)
  const puffer = useRef<Schreibpuffer | null>(null)
  /** Stand, mit dem der Puffer zuletzt abgeglichen wurde */
  const bekannt = useRef<Datenbestand | null>(null)
  const gestartet = useRef(false)

  const starte = useCallback(async (sperre: Promise<boolean>) => {
    setLade({ art: 'laedt' })
    if (!(await sperre)) {
      setLade({ art: 'gesperrt' })
      return
    }
    let s: Speicher
    try {
      s = await oeffneSpeicher()
    } catch {
      // z. B. blockierter Speicher: arbeiten ohne Speichern, deutlich angezeigt
      bekannt.current = null
      dispatch({ typ: 'bestand', bestand: leererBestand() })
      setLade({ art: 'bereit', meldungen: [], ohneSpeicher: true })
      return
    }
    try {
      const roh = await s.ladeRoh()
      const { bestand, meldungen } = pruefeDatenbestand(migriere(roh), KATALOG)
      speicher.current = s
      puffer.current = new Schreibpuffer(s, setStatus)
      bekannt.current = bestand
      dispatch({ typ: 'bestand', bestand })
      setLade({ art: 'bereit', meldungen, ohneSpeicher: false })
      void dauerhaftAnfordern().then(setDauerhaft)
    } catch (e) {
      s.schliesse()
      setLade({ art: 'fehler', text: e instanceof Formatfehler ? e.message : 'Die gespeicherten Daten ließen sich nicht lesen.' })
    }
  }, [])

  useEffect(() => {
    // einmal je Seite (Strict Mode führt Effekte doppelt aus)
    if (gestartet.current) return
    gestartet.current = true
    void starte(tabSperre())
  }, [starte])

  // Jede Änderung am Bestand: geänderte Betriebe merken, verzögert schreiben
  useEffect(() => {
    if (!puffer.current || !bekannt.current || bekannt.current === z.bestand) return
    const a = aenderungenZwischen(bekannt.current, z.bestand)
    bekannt.current = z.bestand
    puffer.current.merke(a)
  }, [z.bestand])

  // Vor dem Schließen oder Verlassen des Tabs sofort schreiben; im Programm wartet das Fenster
  // darauf (onCloseRequested → speichern → destroy, 7.4)
  useEffect(() => {
    const jetzt = () => void puffer.current?.schreibeJetzt()
    const sichtbarkeit = () => {
      if (document.visibilityState === 'hidden') jetzt()
    }
    window.addEventListener('pagehide', jetzt)
    document.addEventListener('visibilitychange', sichtbarkeit)
    const abmelden = plattform.beimSchliessen(async () => {
      await puffer.current?.schreibeJetzt()
    })
    return () => {
      window.removeEventListener('pagehide', jetzt)
      document.removeEventListener('visibilitychange', sichtbarkeit)
      abmelden()
    }
  }, [])

  const allesLoeschen = useCallback(async () => {
    puffer.current?.verwerfe()
    await speicher.current?.leere()
    const leer = leererBestand()
    bekannt.current = speicher.current ? leer : null
    dispatch({ typ: 'bestand', bestand: leer })
    setStatus('gespeichert')
  }, [])

  const erneutVersuchen = useCallback(() => void starte(tabSperreErneut()), [starte])

  return { z, dispatch, lade, status, dauerhaft, allesLoeschen, erneutVersuchen }
}
