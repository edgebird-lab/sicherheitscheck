import { KATALOG, anforderung } from '../../katalog'
import { antwortVon, berechneErgebnis } from '../../modell/bewertung'
import { datumDeutsch } from '../../modell/datum'
import { offeneAnforderungen } from '../../modell/fortschritt'
import { TEXT_OHNE_GESCHAEFTSFUEHRUNG } from '../../modell/operationen'
import { useApp, useAuswahl } from '../kontext'
import { Netzdiagramm } from '../Netzdiagramm'
import { Symbol } from '../Symbole'
import { mitVorzeichen, punkteText } from '../texte'

export function AuswertungSchritt() {
  const { dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  if (!pruefung) return null
  const p = pruefung
  // Abgeschlossen: eingefrorenes Ergebnis; Entwurf: aktuell berechnet
  const e = p.ergebnis ?? berechneErgebnis(KATALOG, p)
  const offen = p.status === 'entwurf' ? offeneAnforderungen(KATALOG, p) : []
  const vorgaenger = p.vorgaengerId ? betrieb.pruefungen.find((x) => x.id === p.vorgaengerId) : undefined

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
        <p className="leise">{p.aussen ? `Außenprüfung vom ${datumDeutsch(p.aussen.gestartet.slice(0, 10))}.` : 'Keine Außenprüfung. Ohne sie entfällt Teil B des Berichts.'}</p>
      </div>

      {vorgaenger?.ergebnis && (
        <div className="karte">
          <h2>Letzte Prüfung</h2>
          <p>
            Prüfung {vorgaenger.nr} vom {datumDeutsch(vorgaenger.datum)}: {punkteText(vorgaenger.ergebnis.statuswert, vorgaenger.ergebnis.maximal)} ({vorgaenger.ergebnis.prozent} %). Jetzt:{' '}
            {punkteText(e.statuswert, e.maximal)} ({e.prozent} %).
          </p>
          <p className="leise klein">Der Vergleich je Anforderung ist noch in Arbeit.</p>
        </div>
      )}
    </section>
  )
}
