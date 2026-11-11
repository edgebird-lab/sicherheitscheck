/** Anzeige der Außenprüfung: Stufe mit Symbol und Wort, Befunde je Gruppe, Zählung, Abrufprotokoll. */
import { mitDomain, regeltext } from '../katalog/regeltexte'
import { uhrzeitDeutsch } from '../modell/datum'
import type { Abruf, Aussenpruefung, Befund, Stufe } from '../modell/typen'
import { GRUPPEN, PRUEF_IDS, PRUEF_NAME, zaehleStufen } from '../pruefung/stufen'
import { Symbol } from './Symbole'
import { STUFE_SYMBOL, STUFE_TEXT, stufeAnzahl } from './texte'

export function StufeMarke({ stufe }: { stufe: Stufe }) {
  return (
    <span className={`stufe stufe-${stufe}`}>
      <Symbol art={STUFE_SYMBOL[stufe]} /> {STUFE_TEXT[stufe]}
    </span>
  )
}

export function Zaehlung({ befunde }: { befunde: Befund[] }) {
  return (
    <ul className="zaehlung" aria-label="Anzahl je Stufe">
      {zaehleStufen(befunde).map(({ stufe, anzahl }) => (
        <li key={stufe} className={`stufe stufe-${stufe}`}>
          <Symbol art={STUFE_SYMBOL[stufe]} /> {stufeAnzahl(stufe, anzahl)}
        </li>
      ))}
    </ul>
  )
}

function BefundEintrag({ b, D }: { b: Befund; D: string }) {
  const t = regeltext(b.regel)
  const weitere = b.weitere.map((w) => ({ ...w, text: regeltext(w.regel) }))
  return (
    <li className={`befund befund-${b.stufe}`}>
      <div className="befund-kopf">
        <StufeMarke stufe={b.stufe} />
        <span className="befund-pruefung">
          {PRUEF_NAME[b.pruefId]}
          {b.ziel !== D && (
            <>
              {' · '}
              <code>{b.ziel}</code>
            </>
          )}
        </span>
      </div>
      <h3 className="befund-titel">{t.titel}</h3>
      {b.messwert && <p className="befund-messwert">{b.messwert}</p>}
      {t.massnahme && (
        <p className="befund-massnahme">
          <strong>Maßnahme:</strong> {mitDomain(t.massnahme, D)}
        </p>
      )}
      {weitere.length > 0 && (
        <ul className="befund-weitere" aria-label="Weitere zutreffende Regeln">
          {weitere.map((w) => (
            <li key={w.regel}>
              <StufeMarke stufe={w.stufe} /> {w.text.titel}
              {w.text.massnahme && <span className="leise"> – {mitDomain(w.text.massnahme, D)}</span>}
            </li>
          ))}
        </ul>
      )}
      <details className="erklaerung">
        <summary>Was heißt das?</summary>
        <p>{mitDomain(t.erklaerung, D)}</p>
        <p className="leise klein">Regel {[b.regel, ...b.weitere.map((w) => w.regel)].join(', ')}</p>
      </details>
    </li>
  )
}

/** Befunde in Gruppen (5.6); die Website-Prüfungen im Browser als eine Zeile „nur im Windows-Programm“ */
export function BefundGruppen({ aussen, ueberschrift = 'h2' }: { aussen: Aussenpruefung; ueberschrift?: 'h2' | 'h3' }) {
  const Kopf = ueberschrift
  return (
    <>
      {GRUPPEN.map((g) => {
        const befunde = aussen.befunde.filter((b) => g.pruefIds.includes(b.pruefId)).sort((a, b) => PRUEF_IDS.indexOf(a.pruefId) - PRUEF_IDS.indexOf(b.pruefId))
        const nurBrowser = befunde.length > 0 && befunde.every((b) => b.regel === 'BROWSER-01')
        return (
          <section key={g.id} className="karte befundgruppe" aria-labelledby={`gruppe-${g.id}`}>
            <Kopf id={`gruppe-${g.id}`}>{g.name}</Kopf>
            {befunde.length === 0 ? (
              <p className="leise">{g.id === 'website' && aussen.modus === 'desktop' ? 'Die Website-Prüfung folgt mit dem Windows-Programm.' : 'Nicht geprüft (Lauf vorher beendet).'}</p>
            ) : nurBrowser ? (
              <div className="befund befund-nicht_geprueft">
                <div className="befund-kopf">
                  <StufeMarke stufe="nicht_geprueft" />
                  <span className="befund-pruefung">{befunde.length} Prüfungen</span>
                </div>
                <p className="befund-titel">Nur im Windows-Programm</p>
                <p className="leise">{befunde.map((b) => PRUEF_NAME[b.pruefId]).join(', ')}</p>
                <details className="erklaerung">
                  <summary>Was heißt das?</summary>
                  <p>{regeltext('BROWSER-01').erklaerung}</p>
                </details>
              </div>
            ) : (
              <ul className="befundliste">
                {befunde.map((b) => (
                  <BefundEintrag key={`${b.pruefId}|${b.ziel}`} b={b} D={aussen.domain} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </>
  )
}

const ART_TEXT: Record<Abruf['art'], string> = { dns: 'DNS', http: 'HTTP', tls: 'TLS' }

export function Abrufprotokoll({ protokoll }: { protokoll: Abruf[] }) {
  return (
    <div className="tabelle-wrap">
      <table className="tabelle protokoll">
        <caption className="sr">Abrufprotokoll</caption>
        <thead>
          <tr>
            <th scope="col">Zeit</th>
            <th scope="col">Art</th>
            <th scope="col">Anfrage</th>
            <th scope="col">Ergebnis</th>
            <th scope="col" className="zahl-zelle">
              Dauer
            </th>
          </tr>
        </thead>
        <tbody>
          {protokoll.map((a, i) => (
            <tr key={i}>
              <td>{uhrzeitDeutsch(a.zeit)}</td>
              <td>{ART_TEXT[a.art]}</td>
              <td>
                <code>{a.anfrage}</code>
              </td>
              <td>{a.ergebnis}</td>
              <td className="zahl-zelle">{a.dauerMs} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
