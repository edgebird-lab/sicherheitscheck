import { useId } from 'react'
import { MITTE, netzdiagramm, RADIUS } from '../modell/diagramm'
import type { Ergebnis, Thema } from '../modell/typen'

const prozent = (anteil: number | null) => (anteil === null ? 'nicht bewertet' : `${Math.round(anteil * 100)} %`)

/**
 * Netzdiagramm nach 6.12 (Annahme bis zum Abgleich mit der Norm). Das SVG ist ein Bild mit
 * Titel; dieselben Werte stehen in der Tabelle daneben (Barrierefreiheit).
 */
export function Netzdiagramm({ themen, ergebnis }: { themen: Thema[]; ergebnis: Ergebnis }) {
  const titelId = useId()
  const d = netzdiagramm(themen, ergebnis.jeThema)
  return (
    <div className="netz">
      <figure className="netz-bild">
        <svg viewBox="-80 0 460 300" role="img" aria-labelledby={titelId}>
          <title id={titelId}>
            {`Netzdiagramm: Anteil der erreichten Punkte je Themenbereich. ${d.achsen.map((a) => `${a.name}: ${prozent(a.anteil)}`).join('; ')}.`}
          </title>
          {d.ringe.map((r) => (
            <polygon key={r.anteil} points={r.punkte} className={`netz-ring${r.anteil === 1 ? ' netz-ring-aussen' : ''}`} />
          ))}
          {d.achsen.map((a) => (
            <line key={a.thema} x1={MITTE} y1={MITTE} x2={a.ende.x} y2={a.ende.y} className="netz-achse" />
          ))}
          {d.ringe.map((r) => (
            <text key={r.anteil} x={MITTE + 4} y={MITTE - RADIUS * r.anteil + 9} className="netz-skala">
              {r.anteil * 100} %
            </text>
          ))}
          <polygon points={d.flaeche} className="netz-flaeche" />
          {d.achsen.map((a) => (
            <circle key={a.thema} cx={a.punkt.x} cy={a.punkt.y} r={a.anteil === null ? 0 : 3.5} className="netz-punkt" />
          ))}
          {d.achsen.map((a) => (
            <text key={a.thema} x={a.beschriftungPunkt.x} y={a.beschriftungPunkt.y} textAnchor={a.textAnker} className={`netz-text${a.anteil === null ? ' netz-text-leise' : ''}`}>
              {a.beschriftung.map((zeile, i) => (
                <tspan key={zeile} x={a.beschriftungPunkt.x} dy={i === 0 ? (a.winkelGrad === 0 ? -2 : a.winkelGrad === 180 ? 10 : 4) : 13}>
                  {zeile}
                </tspan>
              ))}
            </text>
          ))}
        </svg>
      </figure>
      <div className="tabelle-wrap">
      <table className="tabelle netz-tabelle">
        <caption>Ergebnis je Themenbereich</caption>
        <thead>
          <tr>
            <th scope="col">Themenbereich</th>
            <th scope="col" className="zahl-zelle">
              Punkte
            </th>
            <th scope="col" className="zahl-zelle">
              Höchstens
            </th>
            <th scope="col" className="zahl-zelle">
              Anteil
            </th>
          </tr>
        </thead>
        <tbody>
          {d.achsen.map((a) => {
            const t = ergebnis.jeThema[a.thema]
            return (
              <tr key={a.thema}>
                <th scope="row">
                  {a.nr} {a.name}
                </th>
                <td className="zahl-zelle">{t.roh < 0 ? `−${Math.abs(t.roh)} (zählt als 0)` : t.roh}</td>
                <td className="zahl-zelle">{t.maximal}</td>
                <td className="zahl-zelle">{prozent(t.anteil)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}
