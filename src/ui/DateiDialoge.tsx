/** Dialoge für Export (mit Verschlüsselung und Passwort) und für das Passwort beim Import */
import { useState, type FormEvent } from 'react'
import type { Datenbestand, Id, Umfang } from '../modell/typen'
import { plattform } from '../plattform'
import { erzeugeExport, MIN_PASSWORT } from '../speicher/datei'
import { browserKrypto } from '../speicher/krypto-auftrag'
import { Dialog } from './Dialog'
import { Feld, Kontrollkaestchen } from './Eingaben'
import { APP_NAME, VERSION } from './marke'

export interface ExportAuftrag {
  umfang: Umfang
  betriebId?: Id
}

export function ExportDialog({ auftrag, bestand, onFertig, onSchliessen }: { auftrag: ExportAuftrag; bestand: Datenbestand; onFertig: (dateiname: string) => void; onSchliessen: () => void }) {
  const [verschluesseln, setVerschluesseln] = useState(true)
  const [passwort, setPasswort] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [arbeitet, setArbeitet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const betrieb = auftrag.betriebId ? bestand.betriebe.find((b) => b.id === auftrag.betriebId) : undefined

  const zuKurz = passwort.length > 0 && passwort.length < MIN_PASSWORT
  const ungleich = wiederholung.length > 0 && passwort !== wiederholung
  const bereit = !verschluesseln || (passwort.length >= MIN_PASSWORT && passwort === wiederholung)

  const absenden = async (e: FormEvent) => {
    e.preventDefault()
    if (!bereit || arbeitet) return
    setArbeitet(true)
    setFehler(null)
    try {
      const ex = await erzeugeExport({
        bestand,
        umfang: auftrag.umfang,
        betriebId: auftrag.betriebId,
        passwort: verschluesseln ? passwort : null,
        jetzt: new Date(),
        programm: `${APP_NAME} ${VERSION}`,
        krypto: browserKrypto,
      })
      // Browser: Download; Programm: Speichern-Dialog. Bei Abbruch bleibt der Dialog offen.
      const name = await plattform.speichernUnter(ex.dateiname, ex.text)
      if (name === null) {
        setArbeitet(false)
        return
      }
      onFertig(name)
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Der Export ist fehlgeschlagen.')
      setArbeitet(false)
    }
  }

  return (
    <Dialog titel={auftrag.umfang === 'alles' ? 'Sicherung exportieren' : 'Betrieb exportieren'} onSchliessen={onSchliessen}>
      <form className="formular" onSubmit={(e) => void absenden(e)}>
        <p className="leise">
          {auftrag.umfang === 'alles'
            ? `Alle ${bestand.betriebe.length} Betriebe mit allen Prüfungen und die Einstellungen in einer Datei.`
            : `„${betrieb?.name ?? ''}“ mit allen Prüfungen.`}
        </p>
        <Kontrollkaestchen an={verschluesseln} onAendern={setVerschluesseln}>
          Datei mit Passwort verschlüsseln (empfohlen)
        </Kontrollkaestchen>
        {verschluesseln ? (
          <>
            <Feld label="Passwort" hilfe={`Mindestens ${MIN_PASSWORT} Zeichen. Ohne Passwort lässt sich die Datei nicht öffnen; es gibt keine Wiederherstellung.`} fehler={zuKurz ? `Zu kurz: noch ${MIN_PASSWORT - passwort.length} Zeichen.` : null}>
              {(id, beschreibung) => (
                <input id={id} type="password" autoComplete="new-password" value={passwort} aria-describedby={beschreibung} onChange={(e) => setPasswort(e.target.value)} />
              )}
            </Feld>
            <Feld label="Passwort wiederholen" fehler={ungleich ? 'Die Passwörter stimmen nicht überein.' : null}>
              {(id, beschreibung) => (
                <input id={id} type="password" autoComplete="new-password" value={wiederholung} aria-describedby={beschreibung} onChange={(e) => setWiederholung(e.target.value)} />
              )}
            </Feld>
          </>
        ) : (
          <p className="banner banner-warnung">Ohne Verschlüsselung stehen alle Angaben im Klartext in der Datei, auch die Schwachstellen der Betriebe.</p>
        )}
        {fehler && (
          <p className="feld-meldung" role="alert">
            {fehler}
          </p>
        )}
        <div className="knopfreihe dialog-knoepfe">
          <button type="button" className="knopf" onClick={onSchliessen} disabled={arbeitet}>
            Abbrechen
          </button>
          <button type="submit" className="knopf knopf-haupt" disabled={!bereit || arbeitet}>
            {arbeitet ? (verschluesseln ? 'Wird verschlüsselt …' : 'Wird erstellt …') : 'Exportieren'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export function PasswortDialog({ dateiname, onEntschluesseln, onSchliessen }: { dateiname: string; onEntschluesseln: (passwort: string) => Promise<string | null>; onSchliessen: () => void }) {
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [arbeitet, setArbeitet] = useState(false)
  const absenden = async (e: FormEvent) => {
    e.preventDefault()
    if (!passwort || arbeitet) return
    setArbeitet(true)
    setFehler(await onEntschluesseln(passwort))
    setArbeitet(false)
  }
  return (
    <Dialog titel="Datei entschlüsseln" onSchliessen={onSchliessen}>
      <form className="formular" onSubmit={(e) => void absenden(e)}>
        <p className="leise">„{dateiname}“ ist verschlüsselt.</p>
        <Feld label="Passwort der Datei" fehler={fehler}>
          {(id, beschreibung) => <input id={id} type="password" autoComplete="current-password" value={passwort} aria-describedby={beschreibung} onChange={(e) => setPasswort(e.target.value)} />}
        </Feld>
        <div className="knopfreihe dialog-knoepfe">
          <button type="button" className="knopf" onClick={onSchliessen} disabled={arbeitet}>
            Abbrechen
          </button>
          <button type="submit" className="knopf knopf-haupt" disabled={!passwort || arbeitet}>
            {arbeitet ? 'Wird entschlüsselt …' : 'Entschlüsseln'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
