import { KATALOG, anforderung } from '../../katalog'
import { antwortVon, berechneErgebnis } from '../../modell/bewertung'
import { datumDeutsch } from '../../modell/datum'
import { offeneAnforderungen } from '../../modell/fortschritt'
import { TEXT_OHNE_GESCHAEFTSFUEHRUNG } from '../../modell/operationen'
import { vergleiche, vorgaengerVon } from '../../modell/vergleich'
import { Zaehlung } from '../Befunde'
import { useApp, useAuswahl } from '../kontext'
import { Netzdiagramm } from '../Netzdiagramm'
import { Symbol } from '../Symbole'
import { VergleichAnzeige } from '../Vergleich'
import { mitVorzeichen, punkteText } from '../texte'

export function AuswertungSchritt() {
  const { dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  if (!pruefung) return null
  const p = pruefung
  // Abgeschlossen: eingefrorenes Ergebnis; Entwurf: aktuell berechnet
  const e = p.ergebnis ?? berechneErgebnis(KATALOG, p)
  const offen = p.status === 'entwurf' ? offeneAnforderungen(KATALOG, p) : []
  const vorgaenger = vorgaengerVon(betrieb, p)

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Auswertung</h1>

      {offen.length > 0 && (
        <div className="banner banner-hinweis">
          <Symbol art="info" />
          <p>
            Vorläufig: {offen.length === 1 ? '1 Anforderung ist' : `${offen.length} Anforderungen sind`} noch nicht fertig beantwortet; offene zählen wie nicht erfüllt.
          </p>
          <button type="button" className="knopf knopf-klein" onClick={() => dispatch({ typ: 'anforderung', anforderungId: offen[0].id })}>
            Zur ersten offenen
          </button>
        </div>
      )}

      <div className="karte statuswert-karte">
        <p className="statuswert-label">Statuswert nach DIN SPEC 27076</p>
        <p className="statuswert" data-testid="statuswert">
          {punkteText(e.statuswert, e.maximal)} · {e.prozent} %
        </p>
        <p className="leise klein">
          Basis-Anforderung erfüllt: 1 Punkt. TOP-Anforderung erfüllt: 3 Punkte, nicht erfüllt: −3. Nicht relevante Anforderungen fallen aus dem Höchstwert. Der Check ist keine Zertifizierung.
        </p>
        <p className="berater-ansicht">
          <span className="berater-marke">Nur in dieser Ansicht</span> Rohpunkte {mitVorzeichen(e.rohpunkte)}
          {e.rohpunkte < 0 && ', ausgewiesen wird mindestens 0'}
        </p>
        {e.ohneGeschaeftsfuehrung && (
          <p className="banner banner-warnung">
            <Symbol art="warnung" /> {TEXT_OHNE_GESCHAEFTSFUEHRUNG}
          </p>
        )}
      </div>

      <div className="karte">
        <h2>Ergebnis je Themenbereich</h2>
        <Netzdiagramm themen={KATALOG.themen} ergebnis={e} />
      </div>

      <div className="spalten">
        <div className="karte">
          <h2>Nicht erfüllte TOP-Anforderungen</h2>
          {e.topNichtErfuellt.length === 0 ? (
            <p className="leise">keine</p>
          ) : (
            <ul className="liste-anforderungen">
              {e.topNichtErfuellt.map((id) => {
                const a = anforderung(KATALOG, id)
                return (
                  <li key={id}>
                    <Symbol art="kreuz" className="farbe-schlecht" /> <span className="sr">nicht erfüllt: </span>
                    {a ? `${a.normNr} ${a.titel}` : id}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="karte">
          <h2>Nicht relevante Anforderungen</h2>
          {e.nichtRelevant.length === 0 ? (
            <p className="leise">keine</p>
          ) : (
            <ul className="liste-anforderungen">
              {e.nichtRelevant.map((id) => {
                const a = anforderung(KATALOG, id)
                return (
                  <li key={id}>
                    <strong>{a ? `${a.normNr} ${a.titel}` : id}</strong>
                    <br />
                    <span className="leise">{antwortVon(p, id).begruendung || 'ohne Begründung'}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="karte">
        <h2>Außenprüfung</h2>
        {p.aussen ? (
          <>
            <p>
              Außenprüfung von <code>{p.aussen.domain}</code> vom {datumDeutsch(p.aussen.gestartet.slice(0, 10))}
              {p.aussen.abgebrochen && ' (abgebrochen)'}:
            </p>
            <Zaehlung befunde={p.aussen.befunde} />
            <button type="button" className="verweis" onClick={() => dispatch({ typ: 'schritt', schritt: 'aussen' })}>
              Befunde im Schritt Außenprüfung
            </button>
          </>
        ) : (
          <p className="leise">Keine Außenprüfung. Ohne sie entfällt Teil B des Berichts.</p>
        )}
      </div>

      {vorgaenger && (
        <div className="karte" role="group" aria-labelledby="vergleich-titel">
          <h2 id="vergleich-titel">Vergleich mit Prüfung {vorgaenger.nr}</h2>
          <VergleichAnzeige k={KATALOG} vorher={vorgaenger} jetzt={p} v={vergleiche(KATALOG, vorgaenger, p)} />
        </div>
      )}
    </section>
  )
}
