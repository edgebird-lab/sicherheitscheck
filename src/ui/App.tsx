import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KATALOG } from '../katalog'
import { schrittVollstaendig } from '../modell/fortschritt'
import type { Darstellung } from '../modell/typen'
import type { Speicherstatus } from '../speicher/aenderungen'
import { BetriebAnsicht } from './BetriebAnsicht'
import { useDaten } from './daten'
import { useDatei } from './datei'
import { EinstellungenSeite } from './EinstellungenSeite'
import { FrageDialog } from './FrageDialog'
import { AppKontext, useApp, useAuswahl, type AppApi } from './kontext'
import { APP_NAME } from './marke'
import { Startseite } from './Startseite'
import { Symbol } from './Symbole'
import { STATUS_TEXT } from './texte'
import { SCHRITTE } from './zustand'
import './styles.css'

export default function App() {
  return (
    <FrageDialog>
      <Anwendung />
    </FrageDialog>
  )
}

function setzeDarstellung(d: Darstellung) {
  const html = document.documentElement
  if (d === 'hell') html.dataset.theme = 'light'
  else if (d === 'dunkel') html.dataset.theme = 'dark'
  else delete html.dataset.theme
}

function Anwendung() {
  const daten = useDaten()
  const { z, dispatch, lade } = daten
  const [meldung, setMeldung] = useState('')
  const meldungsZeit = useRef<number | undefined>(undefined)

  const melde = useCallback((text: string) => {
    setMeldung(text)
    window.clearTimeout(meldungsZeit.current)
    meldungsZeit.current = window.setTimeout(() => setMeldung(''), 8000)
  }, [])

  const datei = useDatei(z.bestand, dispatch, melde)

  useEffect(() => setzeDarstellung(z.bestand.einstellungen.darstellung), [z.bestand.einstellungen.darstellung])

  // Fenstertitel: Betrieb und App
  const betriebName = z.ansicht.art === 'betrieb' ? z.bestand.betriebe.find((b) => b.id === (z.ansicht as { betriebId: string }).betriebId)?.name : undefined
  useEffect(() => {
    document.title = betriebName ? `${betriebName} – ${APP_NAME}` : APP_NAME
  }, [betriebName])

  // Seitenwechsel: nach oben
  const ansichtSchluessel = z.ansicht.art === 'betrieb' ? `${z.ansicht.betriebId}/${z.ansicht.schritt}` : z.ansicht.art
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [ansichtSchluessel])

  const api = useMemo<AppApi>(
    () => ({
      z,
      dispatch,
      melde,
      speicher: { status: daten.status, dauerhaft: daten.dauerhaft, aktiv: lade.art === 'bereit' && !lade.ohneSpeicher, allesLoeschen: daten.allesLoeschen },
      datei: { exportieren: datei.exportieren, importieren: datei.importieren },
    }),
    [z, dispatch, melde, daten.status, daten.dauerhaft, daten.allesLoeschen, lade, datei.exportieren, datei.importieren],
  )

  if (lade.art === 'laedt') {
    return (
      <main id="inhalt" className="seite seite-mitte">
        <p className="leise">Daten werden geladen …</p>
      </main>
    )
  }
  if (lade.art === 'gesperrt') {
    return (
      <main id="inhalt" className="seite seite-mitte">
        <div className="karte hinweiskarte">
          <h1>Bereits in einem anderen Tab geöffnet</h1>
          <p>Der {APP_NAME} ist in einem anderen Tab oder Fenster dieses Browsers geöffnet. Damit sich zwei Tabs nicht gegenseitig überschreiben, arbeitet immer nur einer mit den Daten.</p>
          <p>Bitte im anderen Tab weiterarbeiten oder ihn schließen und es hier erneut versuchen.</p>
          <button type="button" className="knopf knopf-haupt" onClick={daten.erneutVersuchen}>
            Erneut versuchen
          </button>
        </div>
      </main>
    )
  }
  if (lade.art === 'fehler') {
    return (
      <main id="inhalt" className="seite seite-mitte">
        <div className="karte hinweiskarte">
          <h1>Daten lassen sich nicht öffnen</h1>
          <p>{lade.text}</p>
          <p className="leise">Die gespeicherten Daten bleiben unverändert. Eine neuere Version des {APP_NAME}s kann sie öffnen.</p>
        </div>
      </main>
    )
  }

  return (
    <AppKontext.Provider value={api}>
      <div className="app">
        <a className="sprungmarke" href="#inhalt">
          Zum Inhalt springen
        </a>
        <Kopf meldung={meldung} />
        {lade.ohneSpeicher && (
          <p className="banner banner-fehler streifen" role="alert">
            <Symbol art="warnung" /> Dieser Browser erlaubt kein Speichern (IndexedDB nicht verfügbar). Änderungen gehen beim Schließen verloren; bitte als Datei exportieren.
          </p>
        )}
        {z.ansicht.art === 'start' && <Startseite ladeMeldungen={lade.meldungen} />}
        {z.ansicht.art === 'einstellungen' && <EinstellungenSeite />}
        {z.ansicht.art === 'betrieb' && <BetriebRahmen />}
        {datei.element}
      </div>
    </AppKontext.Provider>
  )
}

const SPEICHER_TEXT: Record<Speicherstatus, string> = {
  gespeichert: 'gespeichert',
  ausstehend: 'wird gespeichert …',
  speichert: 'wird gespeichert …',
  fehler: 'Speichern fehlgeschlagen',
}

function Kopf({ meldung }: { meldung: string }) {
  const { z, dispatch, speicher } = useApp()
  const offen = z.ansicht.art === 'betrieb' ? z.ansicht : null
  const betrieb = offen ? z.bestand.betriebe.find((b) => b.id === offen.betriebId) : undefined
  const pruefung = offen && betrieb ? betrieb.pruefungen.find((p) => p.id === offen.pruefungId) : undefined
  return (
    <header className="kopf">
      <button type="button" className="marke" onClick={() => dispatch({ typ: 'start' })} title="Zur Übersicht der Betriebe">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={28} height={28} />
        <span>{APP_NAME}</span>
      </button>
      {betrieb && (
        <p className="kontext">
          <span className="kontext-name">{betrieb.name}</span>
          {pruefung && (
            <span>
              {' · '}Prüfung {pruefung.nr} · {STATUS_TEXT[pruefung.status]}
            </span>
          )}
        </p>
      )}
      <p className="meldung" role="status" aria-live="polite">
        {meldung}
      </p>
      <span className={`speicherstatus speicherstatus-${speicher.aktiv ? speicher.status : 'aus'}`}>
        {speicher.aktiv ? SPEICHER_TEXT[speicher.status] : 'nicht gespeichert'}
      </span>
      <button type="button" className="knopf knopf-klein" aria-current={z.ansicht.art === 'einstellungen' ? 'page' : undefined} onClick={() => dispatch({ typ: 'einstellungenZeigen' })}>
        Einstellungen
      </button>
    </header>
  )
}

function BetriebRahmen() {
  return (
    <>
      <Schrittleiste />
      <BetriebAnsicht />
    </>
  )
}

function Schrittleiste() {
  const { z, dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const aktuell = z.ansicht.art === 'betrieb' ? z.ansicht.schritt : null
  return (
    <nav className="schrittleiste" aria-label="Schritte">
      <ol>
        {SCHRITTE.map((s, i) => {
          const fertig = schrittVollstaendig(s.id, betrieb, pruefung, KATALOG)
          return (
            <li key={s.id}>
              <button type="button" aria-current={aktuell === s.id ? 'step' : undefined} onClick={() => dispatch({ typ: 'schritt', schritt: s.id })}>
                {fertig ? (
                  <Symbol art="haken" groesse={22} className="nummer-fertig" />
                ) : (
                  <span className="nummer" aria-hidden="true">
                    {i + 1}
                  </span>
                )}
                {s.name}
                {fertig && <span className="sr"> (vollständig)</span>}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
