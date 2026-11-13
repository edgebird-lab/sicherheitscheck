import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { dateinameBeratungsakte, serialisiereBeratungsakte } from '../beratungsakte/beratungsakte'
import { KATALOG } from '../katalog'
import { beratungsakteAusPruefung, mandantAusBetrieb } from '../modell/beratungsakte'
import type { Betrieb, Pruefung } from '../modell/typen'
import { plattform } from '../plattform'
import { Dialog } from './Dialog'
import { Feld } from './Eingaben'

const anzahl = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`

/**
 * „Für die Beratungsakte speichern“ (Export im offenen Format Beratungsakte v1): fragt nach dem
 * Mandanten, zeigt Inhalt und Dateinamen und speichert über die Plattform (Programm: Speichern-
 * Dialog, Browser: Download). Bei Abbruch im Speichern-Dialog bleibt der Dialog offen.
 */
export function BeratungsakteDialog({ betrieb, pruefung, onFertig, onSchliessen }: { betrieb: Betrieb; pruefung: Pruefung; onFertig: (dateiname: string) => void; onSchliessen: () => void }) {
  const [jetzt] = useState(() => new Date())
  const [mandant, setMandant] = useState(() => mandantAusBetrieb(betrieb))
  const [kennung, setKennung] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const mandantFeld = useRef<HTMLInputElement>(null)
  // Der Inhalt hängt nicht vom Mandanten ab; einmal rechnen, nicht bei jedem Tastendruck
  const vorschau = useMemo(() => beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: 'Mandant' }, jetzt }), [betrieb, pruefung, jetzt])
  const dateiname = dateinameBeratungsakte({ ...vorschau, mandant: { name: mandant.trim() || 'Mandant' } })

  useEffect(() => {
    mandantFeld.current?.focus()
  }, [])

  const absenden = async (e: FormEvent) => {
    e.preventDefault()
    if (arbeitet) return
    if (!mandant.trim()) {
      setFehler('Bitte den Mandanten angeben.')
      mandantFeld.current?.focus()
      return
    }
    setArbeitet(true)
    setFehler(null)
    try {
      const akte = beratungsakteAusPruefung({ k: KATALOG, betrieb, pruefung, mandant: { name: mandant, kennung }, jetzt })
      const name = await plattform.speichernUnter(dateinameBeratungsakte(akte), serialisiereBeratungsakte(akte), 'beratungsakte')
      if (name === null) {
        setArbeitet(false)
        return
      }
      onFertig(name)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Die Datei ließ sich nicht speichern.')
      setArbeitet(false)
    }
  }

  return (
    <Dialog titel="Für die Beratungsakte speichern" onSchliessen={onSchliessen}>
      <form className="formular" onSubmit={(e) => void absenden(e)} noValidate>
        <p className="leise">
          Kennzahlen, Befunde und Maßnahmen dieser Prüfung als Datei im offenen Format Beratungsakte v1 (JSON). Die Datei ist nicht verschlüsselt.
        </p>
        <Feld label="Mandant" fehler={fehler}>
          {(id, beschreibung) => (
            <input
              id={id}
              ref={mandantFeld}
              type="text"
              autoComplete="off"
              required
              aria-required="true"
              aria-invalid={fehler ? true : undefined}
              aria-describedby={beschreibung}
              value={mandant}
              onChange={(e) => {
                setMandant(e.target.value)
                setFehler(null)
              }}
            />
          )}
        </Feld>
        <Feld label="Mandantennummer (optional)">
          {(id) => <input id={id} type="text" autoComplete="off" value={kennung} onChange={(e) => setKennung(e.target.value)} />}
        </Feld>
        <p className="akte-inhalt">
          Enthält: {anzahl(vorschau.kennzahlen.length, 'Kennzahl', 'Kennzahlen')}, {anzahl(vorschau.befunde.length, 'Befund', 'Befunde')},{' '}
          {anzahl(vorschau.massnahmen.length, 'Maßnahme', 'Maßnahmen')}
          <span className="akte-datei">Datei: {dateiname}</span>
        </p>
        <p className="akte-datenschutz">Die Datei ist unverschlüsselt und enthält Daten des Mandanten.</p>
        <div className="knopfreihe dialog-knoepfe">
          <button type="button" className="knopf" onClick={onSchliessen} disabled={arbeitet}>
            Abbrechen
          </button>
          <button type="submit" className="knopf knopf-haupt" disabled={arbeitet}>
            {arbeitet ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
