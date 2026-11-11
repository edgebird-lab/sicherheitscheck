import { KATALOG } from '../../katalog'
import { durchVorfrageAusgeblendet } from '../../modell/bewertung'
import { istDatum } from '../../modell/datum'
import { aenderePruefung, setzeVorfrage } from '../../modell/operationen'
import type { Teilnahme, TeilnahmeRolle } from '../../modell/typen'
import { Auswahl, Feld, Kontrollkaestchen } from '../Eingaben'
import { useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'
import { ROLLE_TEXT } from '../texte'
import { useAendern } from './aendern'
import { AbgeschlossenHinweis, Weiter } from './gemeinsam'

const ROLLEN = Object.keys(ROLLE_TEXT) as TeilnahmeRolle[]

export function VorgespraechSchritt() {
  const { pruefung } = useAuswahl()
  const aendern = useAendern()
  if (!pruefung) return null
  const p = pruefung
  const gesperrt = p.status === 'abgeschlossen'
  const ohneGf = !p.teilnehmende.some((t) => t.rolle === 'geschaeftsfuehrung')
  const offeneVorfragen = KATALOG.vorfragen.filter((v) => (p.vorfragen[v.id] ?? null) === null).length

  const teilnehmende = (liste: Teilnahme[]) => aendern.pruefung((alt, jetzt) => aenderePruefung(alt, { teilnehmende: liste }, jetzt))
  const teilnahme = (i: number, aenderung: Partial<Teilnahme>) => teilnehmende(p.teilnehmende.map((t, j) => (j === i ? { ...t, ...aenderung } : t)))

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Vorgespräch</h1>
      {gesperrt && <AbgeschlossenHinweis />}

      <div className="karte ablauf-karte">
        <h2>So läuft die Beratung</h2>
        <ol className="ablauf">
          <li>
            <strong>Erstgespräch:</strong> Ziel und Ablauf erklären, Termin vereinbaren, Unterlagen anfordern.
          </li>
          <li>
            <strong>Interview:</strong> 27 Anforderungen mit den Leitfragen der Norm, 1 bis 2 Stunden; einen Termin von 3 Stunden einplanen. Die Geschäftsführung nimmt teil.
          </li>
          <li>
            <strong>Auswertung und Bericht:</strong> Statuswert, Ergebnis je Themenbereich, Maßnahmen.
          </li>
          <li>
            <strong>Präsentation:</strong> Ergebnisse mit der Geschäftsführung besprechen.
          </li>
        </ol>
      </div>

      <fieldset className="leer-fieldset" disabled={gesperrt}>
        <legend className="sr">Angaben zum Vorgespräch</legend>
        <div className="karte">
          <h2>Termin</h2>
          <div className="feldreihe">
            <Feld label="Datum des Interviews (Pflicht)" fehler={istDatum(p.datum) ? null : 'Bitte das Datum des Interviews eintragen.'}>
              {(id, beschreibung) => (
                <input id={id} type="date" className="eingabe-datum" value={p.datum} aria-describedby={beschreibung} onChange={(e) => aendern.pruefung((alt, jetzt) => aenderePruefung(alt, { datum: e.target.value }, jetzt))} />
              )}
            </Feld>
            <Feld label="Berater">{(id) => <input id={id} type="text" value={p.berater} onChange={(e) => aendern.pruefung((alt, jetzt) => aenderePruefung(alt, { berater: e.target.value }, jetzt))} />}</Feld>
          </div>
        </div>

        <div className="karte">
          <h2>Teilnehmende</h2>
          {ohneGf && (
            <p className="banner banner-warnung">
              <Symbol art="warnung" /> Noch niemand aus der Geschäftsführung eingetragen. Die DIN SPEC sieht ihre Teilnahme am Interview vor.
            </p>
          )}
          {p.teilnehmende.map((t, i) => (
            <div key={i} className="zeile-eingabe">
              <input type="text" aria-label={`Name von Person ${i + 1}`} placeholder="Name" value={t.name} onChange={(e) => teilnahme(i, { name: e.target.value })} />
              <select aria-label={`Rolle von Person ${i + 1}`} value={t.rolle} onChange={(e) => teilnahme(i, { rolle: e.target.value as TeilnahmeRolle })}>
                {ROLLEN.map((r) => (
                  <option key={r} value={r}>
                    {ROLLE_TEXT[r]}
                  </option>
                ))}
              </select>
              <button type="button" className="knopf-icon" aria-label={`Person ${i + 1} entfernen`} title="Entfernen" onClick={() => teilnehmende(p.teilnehmende.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="knopf knopf-klein"
            onClick={() => teilnehmende([...p.teilnehmende, { name: '', rolle: p.teilnehmende.some((x) => x.rolle === 'geschaeftsfuehrung') ? 'sonstige' : 'geschaeftsfuehrung' }])}
          >
            + Person
          </button>
        </div>

        <div className="karte">
          <h2>Vorfragen</h2>
          <p className="leise klein">Eine Antwort, bei der eine Anforderung nicht zutrifft, blendet sie im Interview aus; sie zählt dann als „nicht relevant“.</p>
          {KATALOG.vorfragen.map((v) => {
            const wert = p.vorfragen[v.id] ?? null
            const ausgeblendet = KATALOG.anforderungen.filter((a) => a.relevanz.art === 'vorfrage' && a.relevanz.vorfrageId === v.id && durchVorfrageAusgeblendet(a, p))
            return (
              <div key={v.id} className="vorfrage">
                <Auswahl<'ja' | 'nein'>
                  label={v.frage}
                  wert={wert === null ? null : wert ? 'ja' : 'nein'}
                  optionen={[
                    { wert: 'ja', text: 'Ja' },
                    { wert: 'nein', text: 'Nein' },
                  ]}
                  onAendern={(w) => aendern.pruefung((alt, jetzt) => setzeVorfrage(alt, KATALOG, v.id, w === 'ja', jetzt))}
                  hilfe={v.hilfe}
                  spalten={2}
                  klein
                />
                {ausgeblendet.length > 0 && (
                  <p className="vorfrage-folge">
                    <Symbol art="strich" /> Entfällt im Interview: {ausgeblendet.map((a) => `Anforderung ${a.normNr} „${a.titel}“`).join(', ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="karte">
          <h2>Vorbereitung</h2>
          <fieldset className="leer-fieldset">
            <legend className="leise klein">Unterlagen, die der Betrieb zum Interview bereitlegt</legend>
            <ul className="checkliste">
              {KATALOG.vorbereitung.map((v) => (
                <li key={v.id}>
                  <Kontrollkaestchen
                    an={p.vorbereitung[v.id] ?? false}
                    onAendern={(an) => aendern.pruefung((alt, jetzt) => aenderePruefung(alt, { vorbereitung: { ...alt.vorbereitung, [v.id]: an } }, jetzt))}
                  >
                    {v.text}
                  </Kontrollkaestchen>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      </fieldset>

      <Weiter zu="interview" text="Weiter zum Interview" gesperrt={!istDatum(p.datum)} grund="Erst das Datum des Interviews eintragen." />
      {offeneVorfragen > 0 && istDatum(p.datum) && <p className="feld-hilfe">{offeneVorfragen === 1 ? '1 Vorfrage ist' : `${offeneVorfragen} Vorfragen sind`} noch offen; der Abschluss braucht alle Antworten.</p>}
    </section>
  )
}
