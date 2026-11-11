import { useApp } from '../kontext'
import { Symbol } from '../Symbole'
import type { SchrittId } from '../zustand'
import { usePruefungAnlegen } from './aendern'

/** Anzeige, solange der Betrieb noch keine Prüfung hat */
export function KeinePruefung({ titel }: { titel: string }) {
  const { neu, wiederholung, kannWiederholen } = usePruefungAnlegen()
  return (
    <section className="schritt">
      <h1>{titel}</h1>
      <div className="karte leer-karte">
        <p>Für diesen Schritt braucht der Betrieb eine Prüfung.</p>
        <div className="knopfreihe">
          <button type="button" className="knopf knopf-haupt" onClick={() => void neu()}>
            Neue Prüfung
          </button>
          {kannWiederholen && (
            <button type="button" className="knopf" onClick={() => void wiederholung()}>
              Wiederholungsprüfung
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/** Hinweis über schreibgeschützten Schritten einer abgeschlossenen Prüfung */
export function AbgeschlossenHinweis() {
  const { dispatch } = useApp()
  return (
    <div className="banner banner-hinweis">
      <Symbol art="schloss" />
      <p>Diese Prüfung ist abgeschlossen; Vorgespräch, Antworten und Außenprüfung sind schreibgeschützt.</p>
      <button type="button" className="knopf knopf-klein" onClick={() => dispatch({ typ: 'schritt', schritt: 'bericht' })}>
        Zum Abschluss
      </button>
    </div>
  )
}

export function Weiter({ zu, text, gesperrt, grund }: { zu: SchrittId; text: string; gesperrt?: boolean; grund?: string }) {
  const { dispatch } = useApp()
  return (
    <div className="schritt-fuss">
      <button type="button" className="knopf knopf-haupt" disabled={gesperrt} aria-describedby={grund && gesperrt ? 'weiter-grund' : undefined} onClick={() => dispatch({ typ: 'schritt', schritt: zu })}>
        {text}
      </button>
      {grund && gesperrt && (
        <p id="weiter-grund" className="feld-hilfe">
          {grund}
        </p>
      )}
    </div>
  )
}
