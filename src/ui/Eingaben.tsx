import { useId, type ReactNode } from 'react'

/** Beschriftetes Feld; `children` bekommt die Kennung für das Eingabeelement und die der Hilfe. */
export function Feld({
  label,
  hilfe,
  fehler,
  children,
}: {
  label: ReactNode
  hilfe?: ReactNode
  fehler?: string | null
  children: (id: string, beschreibung: string | undefined) => ReactNode
}) {
  const id = useId()
  const hilfeId = `${id}-hilfe`
  const fehlerId = `${id}-fehler`
  const beschreibung = [hilfe ? hilfeId : '', fehler ? fehlerId : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`feld${fehler ? ' feld-fehler' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, beschreibung)}
      {hilfe && (
        <p className="feld-hilfe" id={hilfeId}>
          {hilfe}
        </p>
      )}
      {fehler && (
        <p className="feld-meldung" id={fehlerId} role="alert">
          {fehler}
        </p>
      )}
    </div>
  )
}

export interface Option<T extends string> {
  wert: T
  text: string
  beschreibung?: string
}

/** Auswahl als Gruppe von Optionsfeldern; mit Pfeiltasten bedienbar. */
export function Auswahl<T extends string>({
  label,
  wert,
  optionen,
  onAendern,
  hilfe,
  spalten,
  klein,
}: {
  label: ReactNode
  wert: T | null
  optionen: Option<T>[]
  onAendern: (w: T) => void
  hilfe?: ReactNode
  spalten?: number
  klein?: boolean
}) {
  const name = useId()
  const hilfeId = `${name}-hilfe`
  return (
    <fieldset className={`auswahl${klein ? ' auswahl-klein' : ''}`} aria-describedby={hilfe ? hilfeId : undefined}>
      <legend>{label}</legend>
      <div className="auswahl-optionen" style={spalten ? { gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))` } : undefined}>
        {optionen.map((o) => (
          <label key={o.wert} className={`auswahl-option${wert === o.wert ? ' an' : ''}`}>
            <input type="radio" name={name} value={o.wert} checked={wert === o.wert} onChange={() => onAendern(o.wert)} />
            <span>
              {o.text}
              {o.beschreibung && <small>{o.beschreibung}</small>}
            </span>
          </label>
        ))}
      </div>
      {hilfe && (
        <p className="feld-hilfe" id={hilfeId}>
          {hilfe}
        </p>
      )}
    </fieldset>
  )
}

export function Kontrollkaestchen({ an, onAendern, children, beschreibung }: { an: boolean; onAendern: (an: boolean) => void; children: ReactNode; beschreibung?: string }) {
  return (
    <label className="kontroll">
      <input type="checkbox" checked={an} onChange={(e) => onAendern(e.target.checked)} aria-describedby={beschreibung} />
      <span>{children}</span>
    </label>
  )
}
