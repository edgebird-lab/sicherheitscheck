import { createContext, useContext, type Dispatch } from 'react'
import type { Betrieb, Id, Pruefung, Umfang } from '../modell/typen'
import type { Speicherstatus } from '../speicher/aenderungen'
import type { Aktion, Zustand } from './zustand'

export interface AppApi {
  z: Zustand
  dispatch: Dispatch<Aktion>
  /** kurze Meldung im Kopf (role="status") */
  melde: (text: string) => void
  speicher: {
    status: Speicherstatus
    /** dauerhafte Speicherung zugesagt? null = unbekannt */
    dauerhaft: boolean | null
    /** false, wenn IndexedDB nicht verfügbar ist (Daten nur im Speicher dieses Tabs) */
    aktiv: boolean
    allesLoeschen: () => Promise<void>
  }
  datei: {
    exportieren: (umfang: Umfang, betriebId?: Id) => void
    importieren: () => void
  }
}

export const AppKontext = createContext<AppApi | null>(null)

export function useApp(): AppApi {
  const api = useContext(AppKontext)
  if (!api) throw new Error('useApp außerhalb von AppKontext')
  return api
}

/** Offener Betrieb und gewählte Prüfung der aktuellen Ansicht */
export function useAuswahl(): { betrieb: Betrieb; pruefung: Pruefung | null } {
  const { z } = useApp()
  if (z.ansicht.art !== 'betrieb') throw new Error('Kein Betrieb geöffnet')
  const { betriebId, pruefungId } = z.ansicht
  const betrieb = z.bestand.betriebe.find((b) => b.id === betriebId)
  if (!betrieb) throw new Error('Betrieb fehlt')
  return { betrieb, pruefung: betrieb.pruefungen.find((p) => p.id === pruefungId) ?? null }
}
