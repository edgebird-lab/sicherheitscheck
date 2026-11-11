/**
 * Bericht als Druckansicht (Spezifikation 6.13, Annahme bis zum Abgleich mit der Norm):
 * Teil A Ergebnis nach DIN SPEC 27076, Teil B Prüfung von außen (Zusatz), Teil C Maßnahmenplan,
 * Vergleich, Anhang mit Unterschriften. Gedruckt wird immer hell; jeder Teil beginnt auf einer
 * neuen Seite. Kopfzeile „Vertraulich · Betrieb · Datum“ und Seitenzahlen kommen aus @page.
 */
import { useEffect, useState } from 'react'
import { KATALOG_ABGEGLICHEN, themenSortiert } from '../katalog'
import { mitDomain, regeltext } from '../katalog/regeltexte'
import { GRUNDSCHUTZ_BAUSTEINE } from '../katalog/themen'
import { antwortVon, berechneErgebnis, istRelevant, punkte, wirksameBewertung } from '../modell/bewertung'
import { datumDeutsch, istDatum, tageZwischen, zeitpunktDeutsch } from '../modell/datum'
import { handlungsempfehlungen, istOffen, PRIORITAET_TEXT, sortiereMassnahmen, ursacheText, wirksamePrioritaet } from '../modell/massnahmen'
import { TEXT_OHNE_GESCHAEFTSFUEHRUNG } from '../modell/operationen'
import type { Befund, Betrieb, Einstellungen, Katalog, Pruefung } from '../modell/typen'
import { vergleiche, vorgaengerVon } from '../modell/vergleich'
import { ANBIETER_NAME } from '../netz/browser'
import { GRUPPEN, PRUEF_IDS, PRUEF_NAME } from '../pruefung/stufen'
import { Abrufprotokoll, StufeMarke, Zaehlung } from './Befunde'
import {
  AUSSEN_BAUSTEINE,
  FOERDER_LINKS,
  GRENZEN_AUSSENPRUEFUNG,
  ISMS_HINWEIS,
  KATALOG_VORLAEUFIG,
  KEINE_ZERTIFIZIERUNG,
  METHODIK,
} from './berichtTexte'
import { APP_NAME } from './marke'
import { Netzdiagramm } from './Netzdiagramm'
import { BEWERTUNG_TEXT, MASSNAHME_STATUS_TEXT, MODUS_TEXT, mitVorzeichen, punkteText, ROLLE_BESTAETIGUNG_TEXT, ROLLE_TEXT } from './texte'
import { VergleichAnzeige } from './Vergleich'

/** Text für CSS-Zeichenketten in @page (Anführungszeichen und Backslash maskiert) */
function cssText(text: string): string {
  return text.replace(/[\\"]/g, '\\$&').replace(/[\r\n]+/g, ' ')
}

/** Kopf- und Fußzeile jeder gedruckten Seite; das Stilelement lebt nur, solange der Bericht angezeigt wird. */
function useDruckseite(kopfzeile: string) {
  useEffect(() => {
    const stil = document.createElement('style')
    stil.dataset.bericht = 'druck'
    stil.textContent = `@page { @top-left { content: "${cssText(kopfzeile)}"; } @bottom-right { content: "Seite " counter(page) " von " counter(pages); } }`
    document.head.append(stil)
    return () => stil.remove()
  }, [kopfzeile])
}

export function Bericht({ k, betrieb, pruefung: p, einstellungen }: { k: Katalog; betrieb: Betrieb; pruefung: Pruefung; einstellungen: Einstellungen }) {
  const e = p.ergebnis ?? berechneErgebnis(k, p)
  const kopfzeile = `Vertraulich · ${betrieb.name} · ${istDatum(p.datum) ? datumDeutsch(p.datum) : 'ohne Datum'}`
  useDruckseite(kopfzeile)
  const massnahmen = sortiereMassnahmen(k, p.massnahmen)
  const wichtigste = massnahmen.filter(istOffen).slice(0, 5)
  const vorgaenger = vorgaengerVon(betrieb, p)
  const geschaeftsfuehrung = p.teilnehmende.filter((t) => t.rolle === 'geschaeftsfuehrung' && t.name.trim() !== '')
  const berater = einstellungen.berater
  const [erstellt] = useState(() => zeitpunktDeutsch(new Date().toISOString()))

  return (
    <article className="bericht" aria-label="Bericht">
      <header className="bericht-titelblock">
        <p className="bericht-vertraulich">Vertraulich · {betrieb.name}</p>
        <h2 className="bericht-haupttitel">Bericht zur IT-Sicherheitsberatung nach DIN SPEC 27076</h2>
        <p className="bericht-untertitel">
          {betrieb.name} · Prüfung {p.nr} · Interview am {istDatum(p.datum) ? datumDeutsch(p.datum) : '–'}
        </p>
        {p.status === 'entwurf' && <p className="bericht-entwurf">Entwurf: Die Prüfung ist noch nicht abgeschlossen; die Angaben können sich ändern.</p>}
      </header>

      {/* ---------------- Teil A ---------------- */}
      <section className="bericht-teil bericht-teil-erster" aria-labelledby="teil-a">
        <h2 id="teil-a">Teil A – Ergebnis nach DIN SPEC 27076</h2>

        <h3>Ergebnis</h3>
        <dl className="angaben bericht-angaben">
          <dt>Betrieb</dt>
          <dd>
            {betrieb.name}
            {betrieb.anschrift && <span className="leise"> · {betrieb.anschrift.replace(/\s*\n\s*/g, ', ')}</span>}
          </dd>
          <dt>Interview</dt>
          <dd>{istDatum(p.datum) ? datumDeutsch(p.datum) : '–'}</dd>
          <dt>Berater</dt>
          <dd>
            {p.berater || '–'}
            {berater.firma && `, ${berater.firma}`}
            {(berater.email || berater.telefon) && <span className="leise"> · {[berater.email, berater.telefon].filter(Boolean).join(' · ')}</span>}
          </dd>
          <dt>Teilnehmende</dt>
          <dd>{p.teilnehmende.length === 0 ? '–' : p.teilnehmende.map((t) => `${t.name || 'ohne Namen'} (${ROLLE_TEXT[t.rolle]})`).join(', ')}</dd>
        </dl>
        <p className="bericht-statuswert">
          Statuswert: <strong>{punkteText(e.statuswert, e.maximal)}</strong> ({e.prozent} %)
        </p>
        <Netzdiagramm themen={k.themen} ergebnis={e} />
        <div className="bericht-spalten">
          <div>
            <h4>Nicht erfüllte TOP-Anforderungen</h4>
            {e.topNichtErfuellt.length === 0 ? (
              <p>keine</p>
            ) : (
              <ul>
                {e.topNichtErfuellt.map((id) => {
                  const a = k.anforderungen.find((x) => x.id === id)
                  return <li key={id}>{a ? `${a.normNr} ${a.titel}` : id}</li>
                })}
              </ul>
            )}
          </div>
          <div>
            <h4>Die fünf wichtigsten Maßnahmen</h4>
            {wichtigste.length === 0 ? (
              <p>keine offenen Maßnahmen</p>
            ) : (
              <ol>
                {wichtigste.map((m) => (
                  <li key={m.id}>
                    {m.titel} <span className="leise">(bis {datumDeutsch(m.frist)})</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <p>
          <strong>{KEINE_ZERTIFIZIERUNG}</strong>
          {e.ohneGeschaeftsfuehrung && ` ${TEXT_OHNE_GESCHAEFTSFUEHRUNG}`}
        </p>

        <h3 className="bericht-umbruch">Ergebnis je Anforderung</h3>
        <ErgebnisTabelle k={k} p={p} />

        <h3 className="bericht-umbruch">Handlungsempfehlungen</h3>
        <Handlungsempfehlungen k={k} p={p} />
      </section>

      {/* ---------------- Teil B ---------------- */}
      {p.aussen ? (
        <section className="bericht-teil" aria-labelledby="teil-b">
          <h2 id="teil-b">Teil B – Prüfung von außen (Zusatz, nicht Teil der DIN SPEC 27076)</h2>
          <TeilB p={p} />
        </section>
      ) : (
        <section className="bericht-teil-kurz" aria-labelledby="teil-b">
          <h2 id="teil-b">Teil B – Prüfung von außen</h2>
          <p>Entfällt: Für diese Prüfung gibt es keine Außenprüfung.</p>
        </section>
      )}

      {/* ---------------- Teil C ---------------- */}
      <section className="bericht-teil" aria-labelledby="teil-c">
        <h2 id="teil-c">Teil C – Maßnahmenplan</h2>
        {massnahmen.length === 0 ? (
          <p>Keine Maßnahmen.</p>
        ) : (
          <table className="bericht-tabelle">
            <caption className="sr">Maßnahmenplan</caption>
            <thead>
              <tr>
                <th scope="col">Priorität</th>
                <th scope="col">Maßnahme</th>
                <th scope="col">Frist</th>
                <th scope="col">Verantwortlich</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {massnahmen.map((m) => (
                <tr key={m.id}>
                  <td>
                    {wirksamePrioritaet(m)} – {PRIORITAET_TEXT[wirksamePrioritaet(m)]}
                  </td>
                  <td>
                    {m.titel}
                    <br />
                    <span className="leise klein">
                      {ursacheText(k, m)}
                      {m.ursacheEntfallen && ' · Ursache entfallen'}
                      {m.prioritaetManuell !== null && ` · Priorität von Hand: ${m.begruendungManuell}`}
                    </span>
                  </td>
                  <td>{datumDeutsch(m.frist)}</td>
                  <td>{m.verantwortlich || '–'}</td>
                  <td>
                    {MASSNAHME_STATUS_TEXT[m.status]}
                    {m.erledigtAm && ` am ${datumDeutsch(m.erledigtAm)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ---------------- Vergleich ---------------- */}
      {vorgaenger && (
        <section className="bericht-teil" aria-labelledby="bericht-vergleich">
          <h2 id="bericht-vergleich">Vergleich mit der letzten Prüfung</h2>
          <VergleichAnzeige k={k} vorher={vorgaenger} jetzt={p} v={vergleiche(k, vorgaenger, p)} />
        </section>
      )}

      {/* ---------------- Anhang ---------------- */}
      <section className="bericht-teil" aria-labelledby="anhang">
        <h2 id="anhang">Anhang</h2>

        <h3 id="nicht-bewertet">Nicht bewertete Anforderungen</h3>
        {e.nichtRelevant.length === 0 ? (
          <p>keine</p>
        ) : (
          <ul>
            {e.nichtRelevant.map((id) => {
              const a = k.anforderungen.find((x) => x.id === id)
              return (
                <li key={id}>
                  <strong>{a ? `${a.normNr} ${a.titel}` : id}:</strong> {antwortVon(p, id).begruendung || 'ohne Begründung'}
                </li>
              )
            })}
          </ul>
        )}

        <h3>Fördermöglichkeiten</h3>
        {p.foerderhinweise.trim() ? <p className="bericht-freitext">{p.foerderhinweise}</p> : <p className="leise">Keine besonderen Hinweise.</p>}
        <ul>
          {FOERDER_LINKS.map((l) => (
            <li key={l.url}>
              {l.name}:{' '}
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.url.replace('https://', '')}
              </a>
            </li>
          ))}
        </ul>

        <h3>Bezug zum IT-Grundschutz (ISMS-Brücke)</h3>
        <p className="leise">{ISMS_HINWEIS}</p>
        <table className="bericht-tabelle">
          <caption className="sr">Bausteine des IT-Grundschutz-Kompendiums je Themenbereich</caption>
          <thead>
            <tr>
              <th scope="col">Themenbereich</th>
              <th scope="col">Bausteine (IT-Grundschutz-Kompendium, Edition 2023)</th>
            </tr>
          </thead>
          <tbody>
            {themenSortiert(k).map((t) => (
              <tr key={t.id}>
                <th scope="row">
                  {t.nr} {t.name}
                </th>
                <td>{t.grundschutz.map((g) => `${g} ${GRUNDSCHUTZ_BAUSTEINE[g] ?? ''}`.trim()).join(', ')}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Prüfung von außen (Zusatz)</th>
              <td>{AUSSEN_BAUSTEINE.map((g) => `${g} ${GRUNDSCHUTZ_BAUSTEINE[g] ?? ''}`.trim()).join(', ')}</td>
            </tr>
          </tbody>
        </table>

        <h3>Methodik und Grenzen</h3>
        {METHODIK.map((m) => (
          <p key={m.titel}>
            <strong>{m.titel}:</strong> {m.text}
          </p>
        ))}
        {!KATALOG_ABGEGLICHEN && <p className="leise">{KATALOG_VORLAEUFIG}</p>}

        <h3>Abrufprotokoll</h3>
        {p.aussen && p.aussen.protokoll.length > 0 ? <Abrufprotokoll protokoll={p.aussen.protokoll} /> : <p>keine Abrufe</p>}

        <h3 className="bericht-umbruch-vermeiden">Unterschriften</h3>
        <div className="unterschriften">
          <div className="unterschrift" role="group" aria-label="Unterschrift Geschäftsleitung">
            <div className="unterschrift-linie" />
            <p>Ort, Datum</p>
            <div className="unterschrift-linie" />
            <p>Geschäftsleitung{geschaeftsfuehrung.length > 0 && ` (${geschaeftsfuehrung.map((t) => t.name).join(', ')})`}</p>
          </div>
          <div className="unterschrift" role="group" aria-label="Unterschrift Berater">
            <div className="unterschrift-linie" />
            <p>Ort, Datum</p>
            <div className="unterschrift-linie" />
            <p>
              Berater/in{p.berater && ` (${p.berater}${berater.firma ? `, ${berater.firma}` : ''})`}
            </p>
          </div>
        </div>
        <p className="leise klein">
          Erstellt mit {APP_NAME} {__VERSION__} am {erstellt}.
        </p>
      </section>
    </article>
  )
}

function ErgebnisTabelle({ k, p }: { k: Katalog; p: Pruefung }) {
  return (
    <table className="bericht-tabelle bericht-ergebnis">
      <caption className="sr">Ergebnis je Anforderung</caption>
      <thead>
        <tr>
          <th scope="col">Nr.</th>
          <th scope="col">TOP</th>
          <th scope="col">Kurzbezeichnung</th>
          <th scope="col">Ergebnis</th>
          <th scope="col" className="zahl-zelle">
            Punkte
          </th>
          <th scope="col">Begründung</th>
        </tr>
      </thead>
      {themenSortiert(k).map((t) => (
        <tbody key={t.id}>
          <tr className="bericht-gruppe">
            <th scope="colgroup" colSpan={6}>
              Themenbereich {t.nr}: {t.name}
            </th>
          </tr>
          {k.anforderungen
            .filter((a) => a.thema === t.id)
            .map((a) => {
              const relevant = istRelevant(a, p)
              const antwort = antwortVon(p, a.id)
              return (
                <tr key={a.id}>
                  <th scope="row">{a.normNr}</th>
                  <td>{a.top ? 'TOP' : ''}</td>
                  <td>{a.titel}</td>
                  <td>{BEWERTUNG_TEXT[wirksameBewertung(a, p)]}</td>
                  <td className="zahl-zelle">{relevant ? mitVorzeichen(punkte(a, p)).replace('+', '') : '–'}</td>
                  <td>
                    {antwort.begruendung || '–'}
                    {antwort.nachweis && (
                      <>
                        <br />
                        <span className="leise">Nachweis: {antwort.nachweis}</span>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
        </tbody>
      ))}
    </table>
  )
}

function Handlungsempfehlungen({ k, p }: { k: Katalog; p: Pruefung }) {
  const liste = handlungsempfehlungen(k, p)
  if (liste.length === 0) return <p>Alle relevanten Anforderungen sind erfüllt.</p>
  return (
    <ol className="bericht-empfehlungen">
      {liste.map(({ anforderung: a, prioritaet, massnahme }) => (
        <li key={a.id}>
          <p>
            <strong>
              {a.normNr} {a.titel}
            </strong>{' '}
            <span className="leise">
              · Priorität {prioritaet} ({PRIORITAET_TEXT[prioritaet]}){massnahme && ` · Frist ${datumDeutsch(massnahme.frist)}`}
              {a.top && ' · TOP'}
            </span>
          </p>
          <p>{a.massnahme}</p>
        </li>
      ))}
    </ol>
  )
}

function BerichtBefund({ b, domain }: { b: Befund; domain: string }) {
  const t = regeltext(b.regel)
  return (
    <li className="bericht-befund">
      <p>
        <StufeMarke stufe={b.stufe} /> <strong>{PRUEF_NAME[b.pruefId]}</strong>
        {b.ziel !== domain && <span className="leise"> ({b.ziel})</span>}: {t.titel}
      </p>
      {b.messwert && <p className="befund-messwert">{b.messwert}</p>}
      <p className="leise">{mitDomain(t.erklaerung, domain)}</p>
      {t.massnahme && (
        <p>
          <strong>Maßnahme:</strong> {mitDomain(t.massnahme, domain)}
        </p>
      )}
      {b.weitere.length > 0 && (
        <p className="leise klein">
          Außerdem:{' '}
          {b.weitere
            .map((w) => regeltext(w.regel))
            .map((w) => w.titel)
            .join('; ')}
        </p>
      )}
    </li>
  )
}

function TeilB({ p }: { p: Pruefung }) {
  const a = p.aussen!
  const tag = a.gestartet.slice(0, 10)
  const veraltet = istDatum(p.datum) && istDatum(tag) && tageZwischen(tag, p.datum) > 30
  return (
    <>
      <dl className="angaben bericht-angaben">
        <dt>Zeitpunkt</dt>
        <dd>
          {zeitpunktDeutsch(a.gestartet)}
          {a.abgebrochen && ' (abgebrochen)'}
        </dd>
        <dt>Domain</dt>
        <dd>{a.domain}</dd>
        <dt>Modus</dt>
        <dd>{MODUS_TEXT[a.modus]}</dd>
        <dt>DNS-Anbieter</dt>
        <dd>{ANBIETER_NAME[a.dohAnbieter]}</dd>
        <dt>Bestätigung</dt>
        <dd>
          {a.bestaetigung.name} ({ROLLE_BESTAETIGUNG_TEXT[a.bestaetigung.rolle]}), {zeitpunktDeutsch(a.bestaetigung.zeit)}
        </dd>
      </dl>
      <blockquote className="bericht-zitat">{a.bestaetigung.text}</blockquote>
      {veraltet && <p>Hinweis: Die Außenprüfung vom {datumDeutsch(tag)} liegt mehr als 30 Tage vor dem Interview.</p>}
      <Zaehlung befunde={a.befunde} />
      {GRUPPEN.map((g) => {
        const befunde = a.befunde.filter((b) => g.pruefIds.includes(b.pruefId)).sort((x, y) => PRUEF_IDS.indexOf(x.pruefId) - PRUEF_IDS.indexOf(y.pruefId))
        if (befunde.length === 0) return null
        return (
          <div key={g.id}>
            <h3>{g.name}</h3>
            {befunde.every((b) => b.regel === 'BROWSER-01') ? (
              <p>
                <StufeMarke stufe="nicht_geprueft" /> Nur im Windows-Programm: {befunde.map((b) => PRUEF_NAME[b.pruefId]).join(', ')}.
              </p>
            ) : (
              <ul className="bericht-befunde">
                {befunde.map((b) => (
                  <BerichtBefund key={`${b.pruefId}|${b.ziel}`} b={b} domain={a.domain} />
                ))}
              </ul>
            )}
          </div>
        )
      })}
      <h3>Grenzen der Prüfung</h3>
      <p>{GRENZEN_AUSSENPRUEFUNG}</p>
    </>
  )
}
