import { useState, type FormEvent } from 'react'
import { datumDeutsch } from '../../modell/datum'
import type { Person } from '../../modell/typen'
import { plattform } from '../../plattform'
import { pruefeSelektoren } from '../../pruefung/selektoren'
import { Dialog } from '../Dialog'
import { Feld } from '../Eingaben'
import { useApp, useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'
import { punkteText, STATUS_TEXT } from '../texte'
import { useAendern, usePruefungAnlegen } from './aendern'

const LEERE_PERSON: Person = { name: '', funktion: '', email: '', telefon: '' }
const GRENZE_BESCHAEFTIGTE = 50

export function BetriebSchritt() {
  const { z, dispatch, datei, melde } = useApp()
  const { betrieb } = useAuswahl()
  const aendern = useAendern()
  const anlegen = usePruefungAnlegen()
  const ausgewaehlt = z.ansicht.art === 'betrieb' ? z.ansicht.pruefungId : null

  const [name, setName] = useState(betrieb.name)
  const [beschaeftigte, setBeschaeftigte] = useState(betrieb.beschaeftigte === null ? '' : String(betrieb.beschaeftigte))
  const [domain, setDomain] = useState(betrieb.domain ?? '')
  const [domainMeldung, setDomainMeldung] = useState<{ fehler: string | null; hinweis: string | null }>({ fehler: null, hinweis: null })
  const [selektoren, setSelektoren] = useState(betrieb.dkimSelektoren.join(', '))
  const [selektorFehler, setSelektorFehler] = useState<string | null>(null)
  const [loeschen, setLoeschen] = useState(false)

  const zahlFehler = beschaeftigte.trim() !== '' && !/^\d{1,6}$/.test(beschaeftigte.trim()) ? 'Bitte eine ganze Zahl eingeben.' : null
  const anzahl = zahlFehler || beschaeftigte.trim() === '' ? null : Number(beschaeftigte.trim())

  const domainUebernehmen = async () => {
    if (domain.trim() === '') {
      setDomainMeldung({ fehler: null, hinweis: null })
      if (betrieb.domain !== null) aendern.betrieb({ domain: null })
      return
    }
    // Die Public Suffix List (tldts, rund 130 kB) wird erst hier geladen
    const { pruefeDomain } = await import('../../pruefung/domain')
    const r = pruefeDomain(domain)
    if (!r.ok) {
      setDomainMeldung({ fehler: r.fehler, hinweis: null })
      return
    }
    setDomain(r.domain)
    setDomainMeldung({ fehler: null, hinweis: r.hinweis })
    if (r.domain !== betrieb.domain) aendern.betrieb({ domain: r.domain })
  }

  const selektorenUebernehmen = () => {
    const r = pruefeSelektoren(selektoren)
    if (!r.ok) {
      setSelektorFehler(r.fehler)
      return
    }
    setSelektorFehler(null)
    setSelektoren(r.selektoren.join(', '))
    if (r.selektoren.join(',') !== betrieb.dkimSelektoren.join(',')) aendern.betrieb({ dkimSelektoren: r.selektoren })
  }

  const person = (i: number, feld: keyof Person, wert: string) =>
    aendern.betrieb({ ansprechpartner: betrieb.ansprechpartner.map((p, j) => (j === i ? { ...p, [feld]: wert } : p)) })

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Betrieb</h1>

      <div className="karte">
        <h2>Stammdaten</h2>
        <Feld label="Name des Betriebs (Pflicht)" fehler={name.trim() === '' ? 'Der Name ist Pflicht.' : null}>
          {(id, beschreibung) => (
            <input
              id={id}
              type="text"
              value={name}
              required
              aria-describedby={beschreibung}
              onChange={(e) => {
                setName(e.target.value)
                if (e.target.value.trim()) aendern.betrieb({ name: e.target.value })
              }}
              onBlur={() => {
                if (!name.trim()) setName(betrieb.name)
                else if (name !== name.trim()) {
                  setName(name.trim())
                  aendern.betrieb({ name: name.trim() })
                }
              }}
            />
          )}
        </Feld>
        <div className="feldreihe">
          <Feld label="Branche">{(id) => <input id={id} type="text" value={betrieb.branche} onChange={(e) => aendern.betrieb({ branche: e.target.value })} />}</Feld>
          <Feld
            label="Beschäftigte"
            fehler={zahlFehler}
            hilfe={anzahl !== null && anzahl > GRENZE_BESCHAEFTIGTE ? 'Die DIN SPEC richtet sich an Betriebe bis 50 Beschäftigte.' : 'leer lassen, wenn unbekannt'}
          >
            {(id, beschreibung) => (
              <input
                id={id}
                type="text"
                inputMode="numeric"
                className="eingabe-kurz"
                value={beschaeftigte}
                aria-describedby={beschreibung}
                onChange={(e) => {
                  setBeschaeftigte(e.target.value)
                  const t = e.target.value.trim()
                  if (t === '') aendern.betrieb({ beschaeftigte: null })
                  else if (/^\d{1,6}$/.test(t)) aendern.betrieb({ beschaeftigte: Number(t) })
                }}
              />
            )}
          </Feld>
        </div>
        <Feld label="Anschrift">{(id) => <textarea id={id} rows={2} value={betrieb.anschrift} onChange={(e) => aendern.betrieb({ anschrift: e.target.value })} />}</Feld>
        <div className="feldreihe">
          <Feld
            label="Domain (optional)"
            fehler={domainMeldung.fehler}
            hilfe={domainMeldung.hinweis ?? 'Für die Außenprüfung von E-Mail und Website, z. B. firma.de'}
          >
            {(id, beschreibung) => (
              <input
                id={id}
                type="text"
                spellCheck={false}
                autoCapitalize="off"
                value={domain}
                aria-describedby={beschreibung}
                onChange={(e) => setDomain(e.target.value)}
                onBlur={() => void domainUebernehmen()}
                onKeyDown={(e) => e.key === 'Enter' && void domainUebernehmen()}
              />
            )}
          </Feld>
          <Feld label="DKIM-Selektoren (optional)" fehler={selektorFehler} hilfe={<>Steht in einer gesendeten E-Mail im Kopf <code>DKIM-Signature</code> hinter <code>s=</code>. Bis zu 5, mit Komma getrennt.</>}>
            {(id, beschreibung) => (
              <input
                id={id}
                type="text"
                spellCheck={false}
                autoCapitalize="off"
                value={selektoren}
                aria-describedby={beschreibung}
                onChange={(e) => setSelektoren(e.target.value)}
                onBlur={selektorenUebernehmen}
                onKeyDown={(e) => e.key === 'Enter' && selektorenUebernehmen()}
              />
            )}
          </Feld>
        </div>
        <Feld label="Notiz">{(id) => <textarea id={id} rows={3} value={betrieb.notiz} onChange={(e) => aendern.betrieb({ notiz: e.target.value })} />}</Feld>
      </div>

      <div className="karte">
        <h2>Ansprechpartner</h2>
        {betrieb.ansprechpartner.length === 0 && <p className="leise">Noch niemand eingetragen.</p>}
        {betrieb.ansprechpartner.map((p, i) => (
          <fieldset key={i} className="person">
            <legend className="sr">Ansprechpartner {i + 1}</legend>
            <input type="text" aria-label={`Name von Ansprechpartner ${i + 1}`} placeholder="Name" value={p.name} onChange={(e) => person(i, 'name', e.target.value)} />
            <input type="text" aria-label={`Funktion von Ansprechpartner ${i + 1}`} placeholder="Funktion" value={p.funktion} onChange={(e) => person(i, 'funktion', e.target.value)} />
            <input type="email" aria-label={`E-Mail von Ansprechpartner ${i + 1}`} placeholder="E-Mail" value={p.email} onChange={(e) => person(i, 'email', e.target.value)} />
            <input type="tel" aria-label={`Telefon von Ansprechpartner ${i + 1}`} placeholder="Telefon" value={p.telefon} onChange={(e) => person(i, 'telefon', e.target.value)} />
            <button
              type="button"
              className="knopf-icon"
              aria-label={`Ansprechpartner ${i + 1} entfernen`}
              title="Entfernen"
              onClick={() => aendern.betrieb({ ansprechpartner: betrieb.ansprechpartner.filter((_, j) => j !== i) })}
            >
              ✕
            </button>
          </fieldset>
        ))}
        <button type="button" className="knopf knopf-klein" onClick={() => aendern.betrieb({ ansprechpartner: [...betrieb.ansprechpartner, { ...LEERE_PERSON }] })}>
          + Ansprechpartner
        </button>
      </div>

      <div className="karte">
        <h2>Prüfungen</h2>
        {betrieb.pruefungen.length === 0 ? (
          <p className="leise">Noch keine Prüfung. Eine Prüfung umfasst Vorgespräch, Interview, Auswertung und Bericht.</p>
        ) : (
          <div className="tabelle-wrap">
            <table className="tabelle">
              <caption className="sr">Prüfungen dieses Betriebs</caption>
              <thead>
                <tr>
                  <th scope="col">Nr.</th>
                  <th scope="col">Datum</th>
                  <th scope="col">Status</th>
                  <th scope="col">Statuswert</th>
                  <th scope="col">
                    <span className="sr">Auswahl</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...betrieb.pruefungen].reverse().map((p) => (
                  <tr key={p.id} className={p.id === ausgewaehlt ? 'zeile-gewaehlt' : undefined}>
                    <th scope="row">{p.nr}</th>
                    <td>{datumDeutsch(p.datum) || <span className="leise">ohne Datum</span>}</td>
                    <td>
                      {p.status === 'abgeschlossen' && <Symbol art="schloss" />} {STATUS_TEXT[p.status]}
                    </td>
                    <td>{p.ergebnis ? `${punkteText(p.ergebnis.statuswert, p.ergebnis.maximal)} (${p.ergebnis.prozent} %)` : <span className="leise">–</span>}</td>
                    <td>
                      {p.id === ausgewaehlt ? (
                        <span className="leise">ausgewählt</span>
                      ) : (
                        <button type="button" className="knopf knopf-klein" onClick={() => dispatch({ typ: 'oeffneBetrieb', betriebId: betrieb.id, pruefungId: p.id })}>
                          Prüfung {p.nr} auswählen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="knopfreihe">
          <button type="button" className="knopf knopf-haupt" onClick={() => void anlegen.neu()}>
            Neue Prüfung
          </button>
          {anlegen.kannWiederholen && (
            <button type="button" className="knopf" onClick={() => void anlegen.wiederholung()}>
              Wiederholungsprüfung
            </button>
          )}
        </div>
        {anlegen.kannWiederholen && <p className="feld-hilfe">Die Wiederholungsprüfung übernimmt Teilnehmende, Vorfragen, Antworten und offene Maßnahmen der letzten abgeschlossenen Prüfung.</p>}
      </div>

      <div className="knopfreihe schritt-fuss">
        <button type="button" className="knopf" onClick={() => datei.exportieren('betrieb', betrieb.id)}>
          Betrieb exportieren
        </button>
        <button type="button" className="knopf knopf-gefahr" onClick={() => setLoeschen(true)}>
          Betrieb löschen
        </button>
      </div>

      {loeschen && (
        <LoeschDialog
          name={betrieb.name}
          onSchliessen={() => setLoeschen(false)}
          onLoeschen={() => {
            setLoeschen(false)
            dispatch({ typ: 'betriebLoeschen', betriebId: betrieb.id })
            melde(`„${betrieb.name}“ wurde gelöscht.`)
          }}
        />
      )}
    </section>
  )
}

function LoeschDialog({ name, onSchliessen, onLoeschen }: { name: string; onSchliessen: () => void; onLoeschen: () => void }) {
  const [eingabe, setEingabe] = useState('')
  const passt = eingabe.trim() === name.trim()
  const absenden = (e: FormEvent) => {
    e.preventDefault()
    if (passt) onLoeschen()
  }
  return (
    <Dialog titel="Betrieb löschen?" onSchliessen={onSchliessen}>
      <form className="formular" onSubmit={absenden}>
        <p>„{name}“ wird mit allen Prüfungen {plattform.desktop ? 'aus diesem Programm' : 'aus diesem Browser'} gelöscht. Das lässt sich nicht rückgängig machen; exportierte Dateien bleiben erhalten.</p>
        <Feld label="Zur Bestätigung den Namen des Betriebs eingeben">{(id) => <input id={id} type="text" autoComplete="off" value={eingabe} onChange={(e) => setEingabe(e.target.value)} />}</Feld>
        <div className="knopfreihe dialog-knoepfe">
          <button type="button" className="knopf" onClick={onSchliessen}>
            Abbrechen
          </button>
          <button type="submit" className="knopf knopf-gefahr" disabled={!passt}>
            Endgültig löschen
          </button>
        </div>
      </form>
    </Dialog>
  )
}
