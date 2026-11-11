import { useEffect } from 'react'
import { KATALOG } from '../../katalog'
import { zeitpunktDeutsch } from '../../modell/datum'
import { gleicheMassnahmenAb } from '../../modell/massnahmen'
import { abschliessen, aenderePruefung, pruefeAbschluss, wiederOeffnen, type Meldung } from '../../modell/operationen'
import { Bericht } from '../Bericht'
import { Feld } from '../Eingaben'
import { useBestaetigen } from '../frage'
import { useApp, useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'
import { punkteText } from '../texte'
import { SCHRITTE } from '../zustand'
import { useAendern } from './aendern'

function schrittName(id: Meldung['schritt']) {
  return SCHRITTE.find((s) => s.id === id)?.name ?? id
}

/**
 * Schritt Bericht (5.9): Abschluss mit Fehlerliste und Sprungmarken (6.2), Drucken und
 * Vorschau im Druckbild (6.13). Im Druck erscheint nur der Bericht.
 */
export function BerichtSchritt() {
  const { z, dispatch, melde } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const aendern = useAendern()
  const aenderePruefungFn = aendern.pruefung
  const bestaetigen = useBestaetigen()
  const entwurf = pruefung?.status === 'entwurf'

  // Maßnahmen im Entwurf abgleichen, damit die Vorschau aktuell ist (6.8)
  useEffect(() => {
    if (entwurf) aenderePruefungFn((alt, jetzt) => gleicheMassnahmenAb(KATALOG, alt, jetzt))
  }, [entwurf, aenderePruefungFn])

  if (!pruefung) return null
  const p = pruefung
  const { fehler, warnungen } = pruefeAbschluss(KATALOG, p)

  const springe = (m: Meldung) => {
    if (m.anforderungId) dispatch({ typ: 'anforderung', anforderungId: m.anforderungId })
    else dispatch({ typ: 'schritt', schritt: m.schritt })
  }

  // Der Knopf ist nur ohne Fehler aktiv; abschliessen prüft im Reducer trotzdem noch einmal
  const schliesseAb = () => {
    if (fehler.length > 0) return
    aendern.pruefung((alt, jetzt) => {
      const r = abschliessen(KATALOG, alt, jetzt)
      return r.ok ? r.pruefung : alt
    })
    melde(`Prüfung ${p.nr} abgeschlossen.`)
  }

  const oeffneWieder = async () => {
    const ok = await bestaetigen(
      'Prüfung wieder öffnen?',
      'Die Prüfung wird wieder zum Entwurf. Das eingefrorene Ergebnis wird verworfen und beim nächsten Abschluss neu berechnet.',
      'Wieder öffnen',
      'haupt',
    )
    if (!ok) return
    aendern.pruefung((alt, jetzt) => wiederOeffnen(alt, jetzt))
    melde(`Prüfung ${p.nr} ist wieder ein Entwurf.`)
  }

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel" className="nur-bildschirm">
        Bericht
      </h1>

      <div className="karte nur-bildschirm" role="group" aria-labelledby="abschluss-titel">
        <h2 id="abschluss-titel">Abschluss</h2>
        {p.status === 'abgeschlossen' ? (
          <>
            <p>
              <Symbol art="schloss" /> Abgeschlossen am {p.abgeschlossenAm ? zeitpunktDeutsch(p.abgeschlossenAm) : '–'}.
              {p.ergebnis && ` Statuswert ${punkteText(p.ergebnis.statuswert, p.ergebnis.maximal)} (${p.ergebnis.prozent} %).`}
            </p>
            <p className="leise klein">Antworten, Vorfragen und Vorgespräch sind schreibgeschützt; das Ergebnis ist eingefroren.</p>
            <button type="button" className="knopf" onClick={() => void oeffneWieder()}>
              Wieder öffnen
            </button>
          </>
        ) : (
          <>
            {fehler.length > 0 ? (
              <div className="meldungsliste" role="group" aria-label="Was noch fehlt">
                <p>
                  <strong>Was noch fehlt:</strong>
                </p>
                <ul>
                  {fehler.map((m) => (
                    <li key={`${m.code}-${m.anforderungId ?? ''}`} className="meldung-fehler">
                      <Symbol art="kreuz" /> <span className="sr">Fehler: </span>
                      {m.text}{' '}
                      <button type="button" className="verweis" onClick={() => springe(m)}>
                        Zum Schritt {schrittName(m.schritt)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>
                <Symbol art="haken" className="farbe-gut" /> Alles Nötige ist erfasst.
              </p>
            )}
            {warnungen.length > 0 && (
              <ul className="meldungsliste-warnungen">
                {warnungen.map((m) => (
                  <li key={`${m.code}-${m.anforderungId ?? ''}`}>
                    <Symbol art="warnung" className="farbe-warnung" /> <span className="sr">Hinweis: </span>
                    {m.text}
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="knopf knopf-haupt" disabled={fehler.length > 0} onClick={schliesseAb}>
              Prüfung abschließen
            </button>
          </>
        )}
      </div>

      <div className="karte nur-bildschirm" role="group" aria-labelledby="druck-titel">
        <h2 id="druck-titel">Drucken</h2>
        <p className="leise">
          Gedruckt wird nur der Bericht, immer hell auf A4, jeder Teil auf einer neuen Seite. Als PDF: im Druckdialog „Als PDF speichern“ wählen.
          {p.status === 'entwurf' && ' Solange die Prüfung ein Entwurf ist, trägt der Bericht den Vermerk „Entwurf“.'}
        </p>
        <Feld label="Förderhinweise für den Bericht (Anhang)" hilfe="Freitext, z. B. passende Förderprogramme des Landes. Bleibt auch nach dem Abschluss änderbar.">
          {(id, beschreibung) => (
            <textarea
              id={id}
              rows={3}
              value={p.foerderhinweise}
              aria-describedby={beschreibung}
              onChange={(e) => aendern.pruefung((alt, jetzt) => aenderePruefung(alt, { foerderhinweise: e.target.value }, jetzt))}
            />
          )}
        </Feld>
        <div className="knopfreihe">
          <button type="button" className="knopf knopf-haupt" onClick={() => window.print()}>
            Drucken / als PDF
          </button>
        </div>
      </div>

      <div className="bericht-vorschau">
        <Bericht k={KATALOG} betrieb={betrieb} pruefung={p} einstellungen={z.bestand.einstellungen} />
      </div>
    </section>
  )
}
