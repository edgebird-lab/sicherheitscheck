import { useEffect, useId, useState } from 'react'
import { KATALOG } from '../../katalog'
import { datumDeutsch, heuteLokal } from '../../modell/datum'
import {
  aendereMassnahme,
  gleicheMassnahmenAb,
  istOffen,
  PRIORITAET_TEXT,
  setzePrioritaet,
  sortiereMassnahmen,
  ursacheText,
  wasZuTun,
  wirksamePrioritaet,
  zaehleMassnahmen,
  type MassnahmeFelder,
} from '../../modell/massnahmen'
import type { Betrieb, Datum, Id, Massnahme, MassnahmeStatus, Prioritaet, Pruefung } from '../../modell/typen'
import { Auswahl, Feld } from '../Eingaben'
import { useApp, useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'
import { MASSNAHME_STATUS_SYMBOL, MASSNAHME_STATUS_TEXT, PRIORITAET_GRUPPE } from '../texte'
import { useAendern } from './aendern'

const PRIORITAETEN: Prioritaet[] = [1, 2, 3]
const STATUS: MassnahmeStatus[] = ['offen', 'in_arbeit', 'erledigt', 'verworfen']

export function MassnahmenSchritt() {
  const { melde } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const aendern = useAendern()
  const aenderePruefung = aendern.pruefung
  const [filter, setFilter] = useState<'offen' | 'alle'>('offen')
  // Maßnahmen, die gerade erledigt oder verworfen wurden, bleiben bis zum nächsten Filterwechsel sichtbar
  const [behalten, setBehalten] = useState<Set<Id>>(() => new Set())
  const [heute] = useState(() => heuteLokal(new Date()))
  const entwurf = pruefung?.status === 'entwurf'

  // Abgleich beim Öffnen des Schritts (6.8); unverändert, wenn nichts zu tun ist
  useEffect(() => {
    if (entwurf) aenderePruefung((alt, jetzt) => gleicheMassnahmenAb(KATALOG, alt, jetzt))
  }, [entwurf, aenderePruefung])

  if (!pruefung) return null
  const p = pruefung
  const n = zaehleMassnahmen(p.massnahmen, heute)
  const sichtbar = sortiereMassnahmen(KATALOG, p.massnahmen).filter((m) => filter === 'alle' || istOffen(m) || behalten.has(m.id))

  const aendere = (m: Massnahme, felder: MassnahmeFelder) => {
    if (felder.status && !istOffen({ ...m, ...felder })) setBehalten((alt) => new Set(alt).add(m.id))
    aenderePruefung((alt, jetzt) => aendereMassnahme(alt, m.id, felder, jetzt))
  }
  const prioritaet = (m: Massnahme, wert: Prioritaet | null, begruendung: string) => {
    aenderePruefung((alt, jetzt) => {
      const r = setzePrioritaet(alt, m.id, wert, begruendung, jetzt)
      return r.ok ? r.pruefung : alt
    })
    const neu = wert ?? m.prioritaet
    melde(`„${m.titel}“ steht jetzt unter ${PRIORITAET_GRUPPE[neu]}.`)
  }

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Maßnahmen</h1>

      <div className="karte">
        <p className="massnahmen-zahlen" data-testid="massnahmen-zaehler">
          <strong>{n.offen} offen oder in Arbeit</strong> · {n.erledigt} erledigt · {n.alle} insgesamt
          {n.ueberfaellig > 0 && (
            <span className="ueberfaellig">
              {' · '}
              <Symbol art="warnung" /> {n.ueberfaellig} überfällig
            </span>
          )}
        </p>
        <p className="leise klein">
          Maßnahmen entstehen aus nicht erfüllten Anforderungen (TOP: Priorität 1, Frist 14 Tage; Basis: Priorität 2, 90 Tage) und aus Befunden der Außenprüfung (kritisch: 1, Warnung: 2, Hinweis: 3 mit
          180 Tagen). Die Frist zählt ab dem Tag des Interviews.{!entwurf && ' Die Prüfung ist abgeschlossen; die Maßnahmen bleiben bearbeitbar.'}
        </p>
        {n.alle > 0 && (
          <Auswahl<'offen' | 'alle'>
            label="Anzeigen"
            wert={filter}
            optionen={[
              { wert: 'offen', text: 'Offen und in Arbeit' },
              { wert: 'alle', text: 'Alle' },
            ]}
            onAendern={(w) => {
              setFilter(w)
              setBehalten(new Set())
            }}
            spalten={2}
            klein
          />
        )}
      </div>

      {n.alle === 0 ? (
        <div className="karte leer-karte">
          <p>Noch keine Maßnahmen. Sie entstehen aus nicht erfüllten Anforderungen im Interview und aus Befunden der Außenprüfung.</p>
        </div>
      ) : sichtbar.length === 0 ? (
        <div className="karte leer-karte">
          <p>Keine offenen Maßnahmen. Unter „Alle“ stehen auch erledigte und verworfene.</p>
        </div>
      ) : (
        PRIORITAETEN.map((prio) => {
          const liste = sichtbar.filter((m) => wirksamePrioritaet(m) === prio)
          if (liste.length === 0) return null
          return (
            <section key={prio} className="karte" aria-labelledby={`prioritaet-${prio}`}>
              <h2 id={`prioritaet-${prio}`}>{PRIORITAET_GRUPPE[prio]}</h2>
              <ul className="massnahmenliste">
                {liste.map((m) => (
                  <MassnahmeEintrag key={m.id} m={m} betrieb={betrieb} pruefung={p} heute={heute} onAendern={aendere} onPrioritaet={prioritaet} />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </section>
  )
}

function MassnahmeEintrag({
  m,
  betrieb,
  pruefung,
  heute,
  onAendern,
  onPrioritaet,
}: {
  m: Massnahme
  betrieb: Betrieb
  pruefung: Pruefung
  heute: Datum
  onAendern: (m: Massnahme, felder: MassnahmeFelder) => void
  onPrioritaet: (m: Massnahme, wert: Prioritaet | null, begruendung: string) => void
}) {
  const titelId = useId()
  const tun = wasZuTun(KATALOG, betrieb, pruefung, m)
  const ueberfaellig = istOffen(m) && m.frist < heute
  const [wahl, setWahl] = useState<'auto' | Prioritaet>(m.prioritaetManuell ?? 'auto')
  const [begruendung, setBegruendung] = useState(m.begruendungManuell)
  const abweichend = wahl !== 'auto' && wahl !== m.prioritaetManuell

  return (
    <li className={`massnahme massnahme-${m.status}`}>
      <div role="group" aria-labelledby={titelId}>
        <div className="massnahme-kopf">
          <h3 id={titelId}>{m.titel}</h3>
          <span className={`massnahme-status status-${m.status}`}>
            <Symbol art={MASSNAHME_STATUS_SYMBOL[m.status]} /> {MASSNAHME_STATUS_TEXT[m.status]}
          </span>
        </div>
        <p className="leise klein massnahme-ursache">
          {ursacheText(KATALOG, m)} · Frist {datumDeutsch(m.frist)}
          {m.erledigtAm && ` · erledigt am ${datumDeutsch(m.erledigtAm)}`}
        </p>
        {ueberfaellig && (
          <p className="ueberfaellig">
            <Symbol art="warnung" /> Überfällig seit {datumDeutsch(m.frist)}
          </p>
        )}
        {m.ursacheEntfallen && (
          <p className="ursache-entfallen">
            <Symbol art="strich" /> Ursache entfallen: Die Anforderung ist inzwischen erfüllt oder der Befund behoben. Die Maßnahme bleibt, weil sie schon bearbeitet wurde.
          </p>
        )}
        {tun.text && (
          <div className="massnahme-tun">
            <p>
              <strong>Was ist zu tun?</strong> {tun.text}
            </p>
            {tun.unterpunkte.length > 0 && (
              <ul>
                {tun.unterpunkte.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="massnahme-felder">
          <Feld label="Status">
            {(id) => (
              <select id={id} value={m.status} onChange={(e) => onAendern(m, { status: e.target.value as MassnahmeStatus })}>
                {STATUS.map((s) => (
                  <option key={s} value={s}>
                    {MASSNAHME_STATUS_TEXT[s]}
                  </option>
                ))}
              </select>
            )}
          </Feld>
          <Feld label="Frist">{(id) => <input id={id} type="date" className="eingabe-datum" value={m.frist} onChange={(e) => onAendern(m, { frist: e.target.value })} />}</Feld>
          <Feld label="Verantwortlich">{(id) => <input id={id} type="text" value={m.verantwortlich} onChange={(e) => onAendern(m, { verantwortlich: e.target.value })} />}</Feld>
        </div>
        <Feld label="Notiz">{(id) => <textarea id={id} rows={2} value={m.notiz} onChange={(e) => onAendern(m, { notiz: e.target.value })} />}</Feld>
        {m.prioritaetManuell !== null && (
          <p className="leise klein">
            Priorität von Hand: {m.prioritaetManuell} statt {m.prioritaet}. Begründung: {m.begruendungManuell}
          </p>
        )}
        <details className="erklaerung">
          <summary>Priorität ändern</summary>
          <div className="feldreihe">
            <Feld label="Priorität">
              {(id) => (
                <select
                  id={id}
                  value={wahl}
                  onChange={(e) => {
                    const w = e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as Prioritaet)
                    setWahl(w)
                    if (w === 'auto' && m.prioritaetManuell !== null) onPrioritaet(m, null, '')
                  }}
                >
                  <option value="auto">
                    automatisch: {m.prioritaet} – {PRIORITAET_TEXT[m.prioritaet]}
                  </option>
                  {PRIORITAETEN.filter((x) => x !== m.prioritaet).map((x) => (
                    <option key={x} value={x}>
                      {x} – {PRIORITAET_TEXT[x]}
                    </option>
                  ))}
                </select>
              )}
            </Feld>
            {wahl !== 'auto' && (
              <Feld label="Begründung (Pflicht)" hilfe="Warum weicht die Priorität von der automatischen ab?">
                {(id, beschreibung) => <input id={id} type="text" value={begruendung} aria-describedby={beschreibung} onChange={(e) => setBegruendung(e.target.value)} />}
              </Feld>
            )}
          </div>
          {wahl !== 'auto' && (abweichend || begruendung !== m.begruendungManuell) && (
            <button type="button" className="knopf knopf-klein" disabled={begruendung.trim() === ''} onClick={() => onPrioritaet(m, wahl, begruendung)}>
              Priorität übernehmen
            </button>
          )}
        </details>
      </div>
    </li>
  )
}
