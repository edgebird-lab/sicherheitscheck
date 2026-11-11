/** Anzeige des Vergleichs mit der letzten Prüfung (6.9) für Auswertung und Bericht */
import type { ReactNode } from 'react'
import { anforderung } from '../katalog'
import { datumDeutsch } from '../modell/datum'
import type { Katalog, Pruefung, Veraenderung, Vergleich } from '../modell/typen'
import { PRUEF_NAME } from '../pruefung/stufen'
import { Symbol, type SymbolArt } from './Symbole'
import { BEWERTUNG_TEXT, mitVorzeichen, punkteText, STUFE_TEXT } from './texte'

const LISTEN: { art: Veraenderung; titel: string; symbol: SymbolArt; klasse: string }[] = [
  { art: 'besser', titel: 'Besser', symbol: 'haken', klasse: 'farbe-gut' },
  { art: 'schlechter', titel: 'Schlechter', symbol: 'kreuz', klasse: 'farbe-schlecht' },
  { art: 'neu', titel: 'Neu', symbol: 'info', klasse: '' },
  { art: 'entfallen', titel: 'Entfallen', symbol: 'strich', klasse: '' },
]

function eintraege(k: Katalog, v: Vergleich, art: Veraenderung): ReactNode[] {
  const liste: ReactNode[] = []
  for (const a of v.anforderungen.filter((x) => x.veraenderung === art)) {
    const anf = anforderung(k, a.id)
    liste.push(
      <li key={`a-${a.id}`}>
        {anf ? `${anf.normNr} ${anf.titel}` : a.id}{' '}
        <span className="leise">
          ({BEWERTUNG_TEXT[a.vorher]} → {BEWERTUNG_TEXT[a.jetzt]})
        </span>
      </li>,
    )
  }
  for (const b of v.befunde.filter((x) => x.veraenderung === art)) {
    const stufen = b.vorher && b.jetzt ? `${STUFE_TEXT[b.vorher]} → ${STUFE_TEXT[b.jetzt]}` : b.jetzt ? STUFE_TEXT[b.jetzt] : `vorher ${STUFE_TEXT[b.vorher!]}`
    liste.push(
      <li key={`b-${b.pruefId}-${b.ziel}`}>
        Außenprüfung: {PRUEF_NAME[b.pruefId]} ({b.ziel}) <span className="leise">({stufen})</span>
      </li>,
    )
  }
  return liste
}

export function VergleichAnzeige({ k, vorher, jetzt, v, ebene = 3 }: { k: Katalog; vorher: Pruefung; jetzt: Pruefung; v: Vergleich; ebene?: 3 | 4 }) {
  const s = v.statuswert
  const Kopf = ebene === 3 ? 'h3' : 'h4'
  const nichtVergleichbar = v.anforderungen.filter((a) => a.veraenderung === 'nicht_vergleichbar').length + v.befunde.filter((b) => b.veraenderung === 'nicht_vergleichbar').length
  return (
    <div className="vergleich">
      <p data-testid="vergleich-statuswert">
        Prüfung {vorher.nr} vom {datumDeutsch(vorher.datum)}: {punkteText(s.vorher, s.maximalVorher)} ({s.prozentVorher} %) · jetzt {punkteText(s.jetzt, s.maximalJetzt)} ({s.prozentJetzt} %)
      </p>
      <p className="vergleich-differenz">
        <strong>{s.direktVergleichbar ? `${mitVorzeichen(s.jetzt - s.vorher)} Punkte` : `${mitVorzeichen(s.prozentJetzt - s.prozentVorher)} Prozentpunkte`}</strong>
        {!s.direktVergleichbar && ` (Relevanz geändert: Höchstwert ${s.maximalVorher} → ${s.maximalJetzt}; verglichen werden die Prozentwerte)`}
      </p>
      <div className="vergleich-listen">
        {LISTEN.map((l) => {
          const liste = eintraege(k, v, l.art)
          return (
            <div key={l.art}>
              <Kopf>
                <Symbol art={l.symbol} className={l.klasse} /> {l.titel}
              </Kopf>
              {liste.length === 0 ? <p className="leise">keine</p> : <ul className="liste-anforderungen">{liste}</ul>}
            </div>
          )
        })}
      </div>
      {nichtVergleichbar > 0 && <p className="leise klein">{nichtVergleichbar === 1 ? '1 Punkt ist' : `${nichtVergleichbar} Punkte sind`} nicht vergleichbar (Relevanz geändert oder nicht prüfbar).</p>}
      {!(vorher.aussen && jetzt.aussen) && <p className="leise klein">Befunde der Außenprüfung werden verglichen, sobald beide Prüfungen eine Außenprüfung haben.</p>}
      <p>
        Maßnahmen aus Prüfung {vorher.nr}: {v.massnahmenVorher.erledigt} erledigt, {v.massnahmenVorher.offen} offen oder in Arbeit.
      </p>
    </div>
  )
}
