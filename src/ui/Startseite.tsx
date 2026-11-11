import { useMemo, useState, type FormEvent } from 'react'
import { KATALOG, KATALOG_ABGEGLICHEN } from '../katalog'
import { BEISPIEL_BETRIEB_ID, beispielBetrieb } from '../modell/beispiel'
import { datumDeutsch, heuteLokal, tageZwischen } from '../modell/datum'
import { letzteAbgeschlossene, neuerBetrieb } from '../modell/operationen'
import type { Betrieb } from '../modell/typen'
import { Feld } from './Eingaben'
import { useApp } from './kontext'
import { APP_NAME } from './marke'
import { Symbol } from './Symbole'
import { punkteText } from './texte'
import { neuestePruefung } from './zustand'

const SICHERUNG_TAGE = 30

/** Offene Maßnahmen der neuesten Prüfung und die nächste Frist */
function massnahmenStand(b: Betrieb) {
  const offen = (neuestePruefung(b)?.massnahmen ?? []).filter((m) => m.status === 'offen' || m.status === 'in_arbeit')
  const frist = offen.map((m) => m.frist).sort()[0] ?? null
  return { offen: offen.length, frist }
}

function letztePruefungText(b: Betrieb): string {
  const fertig = letzteAbgeschlossene(b)
  const neueste = neuestePruefung(b)
  if (fertig?.ergebnis) {
    const text = `${datumDeutsch(fertig.datum)} · ${punkteText(fertig.ergebnis.statuswert, fertig.ergebnis.maximal)}`
    return neueste && neueste.status === 'entwurf' ? `${text} · Prüfung ${neueste.nr} im Entwurf` : text
  }
  if (neueste) return `Entwurf vom ${datumDeutsch(neueste.datum) || 'ohne Datum'}`
  return 'noch keine'
}

export function Startseite({ ladeMeldungen }: { ladeMeldungen: string[] }) {
  const { z, dispatch, datei, melde } = useApp()
  const { betriebe, einstellungen } = z.bestand
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState<string | null>(null)
  const [heute] = useState(() => heuteLokal(new Date()))

  const gefiltert = useMemo(() => {
    const s = suche.trim().toLowerCase()
    const sortiert = [...betriebe].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    if (!s) return sortiert
    return sortiert.filter((b) => [b.name, b.branche, b.domain ?? '', b.anschrift].some((t) => t.toLowerCase().includes(s)))
  }, [betriebe, suche])

  const anlegen = (e: FormEvent) => {
    e.preventDefault()
    if (!neu?.trim()) return
    dispatch({ typ: 'betriebNeu', betrieb: neuerBetrieb(neu, new Date()) })
    setNeu(null)
  }

  const beispiel = () => {
    if (betriebe.some((b) => b.id === BEISPIEL_BETRIEB_ID)) {
      melde('Der Beispielbetrieb ist schon vorhanden.')
      dispatch({ typ: 'oeffneBetrieb', betriebId: BEISPIEL_BETRIEB_ID })
      return
    }
    dispatch({ typ: 'betriebNeu', betrieb: beispielBetrieb(KATALOG, heuteLokal(new Date())) })
    melde('Beispielbetrieb geladen.')
  }

  const sicherungAlt = einstellungen.letzteSicherung === null || tageZwischen(einstellungen.letzteSicherung.slice(0, 10), heute) > SICHERUNG_TAGE

  const neuFormular =
    neu !== null ? (
      <form className="karte neu-formular" onSubmit={anlegen} aria-label="Neuer Betrieb">
        <Feld label="Name des Betriebs">{(id) => <input id={id} type="text" autoFocus value={neu} onChange={(e) => setNeu(e.target.value)} />}</Feld>
        <div className="knopfreihe">
          <button type="submit" className="knopf knopf-haupt" disabled={!neu.trim()}>
            Anlegen
          </button>
          <button type="button" className="knopf" onClick={() => setNeu(null)}>
            Abbrechen
          </button>
        </div>
      </form>
    ) : null

  return (
    <main id="inhalt" className="seite">
      {ladeMeldungen.length > 0 && (
        <div className="banner banner-fehler" role="alert">
          <Symbol art="warnung" />
          <div>
            <p>
              <strong>
                {ladeMeldungen.length === 1 ? 'Ein Eintrag ließ sich nicht laden' : `${ladeMeldungen.length} Einträge ließen sich nicht laden`} und wird übersprungen.
              </strong>{' '}
              Die Daten bleiben gespeichert und werden nicht gelöscht.
            </p>
            <ul>
              {ladeMeldungen.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {betriebe.length === 0 ? (
        <section className="willkommen" aria-labelledby="willkommen-titel">
          <h1 id="willkommen-titel">{APP_NAME}</h1>
          <p>
            Der {APP_NAME} führt Schritt für Schritt durch die IT-Sicherheitsberatung nach DIN SPEC 27076 für Betriebe mit bis zu 50 Beschäftigten. Aus dem Interview zu 27 Anforderungen entstehen
            der Statuswert, eine Auswertung je Themenbereich, ein Maßnahmenplan und ein druckfertiger Bericht; dazu kommt eine passive Prüfung der E-Mail-Domain von außen. Alle Daten bleiben in diesem Browser auf diesem Rechner.
          </p>
          {neuFormular ?? (
            <div className="knopfreihe">
              <button type="button" className="knopf knopf-haupt" onClick={() => setNeu('')}>
                Neuer Betrieb
              </button>
              <button type="button" className="knopf" onClick={beispiel}>
                Beispielbetrieb laden
              </button>
              <button type="button" className="knopf knopf-leise" onClick={datei.importieren}>
                Datei importieren
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="seitenkopf">
            <h1>Betriebe</h1>
            <div className="knopfreihe">
              <button type="button" className="knopf knopf-haupt" onClick={() => setNeu('')}>
                Neuer Betrieb
              </button>
              <button type="button" className="knopf" onClick={datei.importieren}>
                Datei importieren
              </button>
              <button type="button" className="knopf" onClick={() => datei.exportieren('alles')}>
                Sicherung exportieren
              </button>
              <button type="button" className="knopf" onClick={beispiel}>
                Beispielbetrieb laden
              </button>
            </div>
          </div>

          {sicherungAlt && (
            <div className="banner banner-hinweis">
              <Symbol art="info" />
              <p>
                {einstellungen.letzteSicherung === null
                  ? 'Noch keine Sicherung exportiert. '
                  : `Die letzte Sicherung ist vom ${datumDeutsch(einstellungen.letzteSicherung.slice(0, 10))}. `}
                Die Daten liegen nur in diesem Browser; eine verschlüsselte Sicherung schützt vor Verlust.
              </p>
              <button type="button" className="knopf knopf-klein" onClick={() => datei.exportieren('alles')}>
                Jetzt sichern
              </button>
            </div>
          )}

          {neuFormular}

          <Feld label="Betriebe durchsuchen">
            {(id) => <input id={id} type="search" className="suche" value={suche} placeholder="Name, Branche oder Domain" onChange={(e) => setSuche(e.target.value)} />}
          </Feld>

          <div className="tabelle-wrap">
            <table className="tabelle betriebsliste">
              <caption className="sr">Betriebe</caption>
              <thead>
                <tr>
                  <th scope="col">Betrieb</th>
                  <th scope="col">Branche</th>
                  <th scope="col">Letzte Prüfung</th>
                  <th scope="col" className="zahl-zelle">
                    Offene Maßnahmen
                  </th>
                  <th scope="col">Nächste Frist</th>
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((b) => {
                  const m = massnahmenStand(b)
                  return (
                    <tr key={b.id}>
                      <th scope="row">
                        <button type="button" className="verweis" onClick={() => dispatch({ typ: 'oeffneBetrieb', betriebId: b.id })}>
                          {b.name}
                        </button>
                      </th>
                      <td>{b.branche || <span className="leise">–</span>}</td>
                      <td>{letztePruefungText(b)}</td>
                      <td className="zahl-zelle">{m.offen}</td>
                      <td>
                        {m.frist ? (
                          <>
                            {datumDeutsch(m.frist)}
                            {m.frist < heute && (
                              <span className="ueberfaellig">
                                {' '}
                                <Symbol art="warnung" /> überfällig
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="leise">–</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {gefiltert.length === 0 && (
                  <tr>
                    <td colSpan={5} className="leise">
                      Kein Betrieb passt zu „{suche}“.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!KATALOG_ABGEGLICHEN && (
        <p className="leise klein fusszeile">
          Katalog {KATALOG.version}, vorläufig: Nummern und Zuordnung der Anforderungen sind noch nicht mit der DIN SPEC 27076 abgeglichen. Die Fragen sind eigene Formulierungen; die Leitfragen
          stehen in der Norm.
        </p>
      )}
    </main>
  )
}
