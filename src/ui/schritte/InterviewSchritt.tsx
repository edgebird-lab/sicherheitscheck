import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { KATALOG, KATALOG_ABGEGLICHEN, thema as themaVon } from '../../katalog'
import { antwortVon, begruendungReicht, istBeantwortet, nichtRelevantWaehlbar, wirksameBewertung } from '../../modell/bewertung'
import { naechsteOffene, sichtbareAnforderungen, themenFortschritt } from '../../modell/fortschritt'
import { bestaetigeAntwort, setzeAntwort, vorgaengerAntwort } from '../../modell/operationen'
import type { Anforderung, Bewertung, Pruefung } from '../../modell/typen'
import { Auswahl, Feld } from '../Eingaben'
import { useApp, useAuswahl } from '../kontext'
import { Symbol, type SymbolArt } from '../Symbole'
import { BEWERTUNG_SYMBOL, BEWERTUNG_TEXT } from '../texte'
import { useAendern } from './aendern'
import { AbgeschlossenHinweis } from './gemeinsam'

/** Zustand einer Anforderung in der Navigation, mit Symbol und Wort */
function zustand(a: Anforderung, p: Pruefung): { symbol: SymbolArt; text: string; klasse: string } {
  const antwort = antwortVon(p, a.id)
  if (antwort.uebernommen) return { symbol: 'pfeil', text: 'übernommen, noch nicht bestätigt', klasse: 'z-uebernommen' }
  const b = wirksameBewertung(a, p)
  if (b !== 'offen' && !begruendungReicht(antwort)) return { symbol: 'warnung', text: `${BEWERTUNG_TEXT[b]}, Begründung fehlt`, klasse: 'z-unvollstaendig' }
  return { symbol: BEWERTUNG_SYMBOL[b], text: BEWERTUNG_TEXT[b], klasse: `z-${b}` }
}

export function InterviewSchritt() {
  const { z, dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const aendern = useAendern()
  const ueberschrift = useRef<HTMLHeadingElement>(null)
  const erster = useRef(true)

  const p = pruefung as Pruefung
  const sichtbar = sichtbareAnforderungen(KATALOG, p)
  // Ohne gewählte Anforderung beginnt das Interview bei der ersten offenen. Diese Wahl bleibt
  // stehen, auch wenn die Antwort beim Tippen fertig wird; sonst spränge die Karte weiter.
  const [startId] = useState(() => (sichtbar.find((a) => !istBeantwortet(a, p)) ?? sichtbar[0])?.id ?? null)
  const gewuenscht = (z.ansicht.art === 'betrieb' ? z.ansicht.anforderungId : null) ?? startId
  const aktuell = sichtbar.find((a) => a.id === gewuenscht) ?? sichtbar.find((a) => !istBeantwortet(a, p)) ?? sichtbar[0]
  const aktuelleId = aktuell?.id

  // Beim Wechsel der Anforderung den Fokus auf die Überschrift der Fragekarte setzen
  useEffect(() => {
    if (erster.current) {
      erster.current = false
      return
    }
    ueberschrift.current?.focus()
  }, [aktuelleId])

  if (!aktuell) return null

  const index = sichtbar.indexOf(aktuell)
  const fortschritt = themenFortschritt(KATALOG, p)
  const gesperrt = p.status === 'abgeschlossen'
  const antwort = antwortVon(p, aktuell.id)
  const vorher = vorgaengerAntwort(betrieb, p, aktuell.id)
  const vorgaenger = p.vorgaengerId ? betrieb.pruefungen.find((x) => x.id === p.vorgaengerId) : undefined
  const naechste = naechsteOffene(KATALOG, p, aktuell.id)
  const unbestaetigt = sichtbar.filter((a) => antwortVon(p, a.id).uebernommen).length
  const thema = themaVon(KATALOG, aktuell.thema)

  const gehe = (id: string) => dispatch({ typ: 'anforderung', anforderungId: id })
  const weiter = () => (index < sichtbar.length - 1 ? gehe(sichtbar[index + 1].id) : dispatch({ typ: 'schritt', schritt: 'auswertung' }))
  const tasten = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      weiter()
    }
  }

  const bewertungen: Bewertung[] = nichtRelevantWaehlbar(aktuell) ? ['erfuellt', 'nicht_erfuellt', 'nicht_relevant'] : ['erfuellt', 'nicht_erfuellt']
  const unzulaessig = antwort.bewertung === 'nicht_relevant' && !nichtRelevantWaehlbar(aktuell)
  const wert = antwort.bewertung === 'offen' || unzulaessig ? null : (antwort.bewertung as Exclude<Bewertung, 'offen'>)

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <div className="seitenkopf">
        <h1 id="schritt-titel">Interview</h1>
        <p className="leise">
          Frage {index + 1} von {sichtbar.length}
        </p>
      </div>
      {gesperrt && <AbgeschlossenHinweis />}
      {!gesperrt && unbestaetigt > 0 && (
        <p className="banner banner-hinweis">
          <Symbol art="pfeil" /> Wiederholungsprüfung: {unbestaetigt === 1 ? '1 übernommene Antwort ist' : `${unbestaetigt} übernommene Antworten sind`} noch zu bestätigen oder zu ändern.
        </p>
      )}

      <div className="interview">
        <nav className="themen-nav" aria-label="Themenbereiche">
          <ol>
            {fortschritt.map((f) => {
              const liste = sichtbar.filter((a) => a.thema === f.thema.id)
              const offen = f.thema.id === aktuell.thema
              return (
                <li key={f.thema.id}>
                  <button
                    type="button"
                    className="thema-knopf"
                    aria-current={offen ? 'true' : undefined}
                    disabled={liste.length === 0}
                    onClick={() => gehe((liste.find((a) => !istBeantwortet(a, p)) ?? liste[0]).id)}
                  >
                    <span className="thema-name">
                      {f.thema.nr} {f.thema.name}
                    </span>
                    <span className={`thema-stand${f.vollstaendig ? ' thema-fertig' : ''}`}>
                      {f.vollstaendig ? (
                        <>
                          <Symbol art="haken" /> vollständig
                        </>
                      ) : (
                        `${f.beantwortet} von ${f.anzahl}`
                      )}
                    </span>
                  </button>
                  {offen && (
                    <ol className="anforderungs-liste">
                      {liste.map((a) => {
                        const zst = zustand(a, p)
                        return (
                          <li key={a.id}>
                            <button type="button" className={zst.klasse} aria-current={a.id === aktuell.id ? 'step' : undefined} onClick={() => gehe(a.id)}>
                              <Symbol art={zst.symbol} />
                              <span>
                                {a.normNr} {a.titel}
                                <span className="sr">, {zst.text}</span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </li>
              )
            })}
          </ol>
          {!KATALOG_ABGEGLICHEN && <p className="leise klein">Nummern vorläufig, noch nicht mit der Norm abgeglichen.</p>}
        </nav>

        <article className="karte fragekarte" aria-labelledby="frage-titel" onKeyDown={tasten}>
          <p className="fragekarte-kopf">
            <span>
              Anforderung {aktuell.normNr} · {thema.name}
            </span>
            {aktuell.top && <span className="top-marke">TOP · zählt ±3 Punkte</span>}
          </p>
          <p className="leitfragen">
            <Symbol art="info" /> Zuerst die Leitfragen stellen: DIN SPEC 27076, Anforderung {aktuell.normNr}
          </p>
          <h2 id="frage-titel" ref={ueberschrift} tabIndex={-1}>
            {aktuell.titel}
          </h2>
          <p className="kurzfrage">
            <span className="kurzfrage-marke">Kurzfrage</span> {aktuell.frage}
          </p>
          <details className="erklaerung">
            <summary>Darum geht es</summary>
            <p>{aktuell.hilfe}</p>
          </details>

          {vorher && (
            <div className={`letztes-mal${antwort.uebernommen ? ' letztes-mal-offen' : ''}`}>
              <p>
                <strong>Letztes Mal:</strong> {BEWERTUNG_TEXT[vorher.bewertung]} – {vorher.begruendung || 'ohne Begründung'}
              </p>
              {antwort.uebernommen && !gesperrt && (
                <div className="knopfreihe">
                  <button type="button" className="knopf knopf-klein" onClick={() => aendern.pruefung((alt, jetzt) => bestaetigeAntwort(alt, aktuell.id, jetzt))}>
                    Unverändert bestätigen
                  </button>
                  <span className="leise klein">Übernommen aus Prüfung {vorgaenger?.nr}; noch nicht bestätigt.</span>
                </div>
              )}
            </div>
          )}

          {unzulaessig && (
            <p className="banner banner-warnung">
              <Symbol art="warnung" /> „Nicht relevant“ ist bei dieser Anforderung nicht vorgesehen; die Antwort zählt als offen.
            </p>
          )}

          <fieldset className="leer-fieldset" disabled={gesperrt}>
            <legend className="sr">Antwort zu Anforderung {aktuell.normNr}</legend>
            <Auswahl<Exclude<Bewertung, 'offen'>>
              label="Bewertung"
              wert={wert}
              optionen={bewertungen.map((b) => ({ wert: b as Exclude<Bewertung, 'offen'>, text: BEWERTUNG_TEXT[b] }))}
              onAendern={(b) => aendern.pruefung((alt, jetzt) => setzeAntwort(alt, KATALOG, aktuell.id, { bewertung: b }, jetzt))}
              hilfe="Teilweise erfüllt oder unklar zählt als nicht erfüllt."
              spalten={bewertungen.length}
            />
            <Feld
              label={antwort.bewertung === 'nicht_relevant' ? 'Begründung, warum nicht relevant (Pflicht)' : 'Begründung in Stichpunkten (Pflicht)'}
              fehler={antwort.bewertung !== 'offen' && !begruendungReicht(antwort) ? 'Bitte kurz begründen (mindestens drei Zeichen).' : null}
            >
              {(id, beschreibung) => (
                <textarea
                  id={id}
                  rows={4}
                  value={antwort.begruendung}
                  aria-describedby={beschreibung}
                  onChange={(e) => aendern.pruefung((alt, jetzt) => setzeAntwort(alt, KATALOG, aktuell.id, { begruendung: e.target.value }, jetzt))}
                />
              )}
            </Feld>
            <Feld label="Nachweis (optional)" hilfe="z. B. „Sicherungsprotokoll vom 03.11. gesehen“">
              {(id, beschreibung) => (
                <input
                  id={id}
                  type="text"
                  value={antwort.nachweis}
                  aria-describedby={beschreibung}
                  onChange={(e) => aendern.pruefung((alt, jetzt) => setzeAntwort(alt, KATALOG, aktuell.id, { nachweis: e.target.value }, jetzt))}
                />
              )}
            </Feld>
          </fieldset>

          <div className="knopfreihe fragekarte-fuss">
            <button type="button" className="knopf" disabled={index === 0} onClick={() => gehe(sichtbar[index - 1].id)}>
              Zurück
            </button>
            <button type="button" className="knopf knopf-haupt" onClick={weiter}>
              {index < sichtbar.length - 1 ? 'Weiter' : 'Weiter zur Auswertung'}
            </button>
            <button type="button" className="knopf" disabled={naechste === null} onClick={() => naechste && gehe(naechste)}>
              Nächste offene
            </button>
            <span className="leise klein tastenhinweis">
              <kbd>Strg</kbd> + <kbd>Eingabe</kbd>: weiter
            </span>
          </div>
        </article>
      </div>
    </section>
  )
}
