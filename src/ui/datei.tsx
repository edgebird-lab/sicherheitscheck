/**
 * Export und Import in der Oberfläche (6.11): Exportdialog mit Verschlüsselung (Standard)
 * und Passwort, Import mit Passwortabfrage, Rückfrage bei bekannten Betrieben und
 * ausdrücklicher Wahl für die Einstellungen.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type Dispatch, type ReactNode } from 'react'
import { KATALOG } from '../katalog'
import type { Datenbestand, Id, Umfang } from '../modell/typen'
import { bekannteBetriebe, fuehreZusammen, ImportFehler, leseInhalt, leseKopf, MAX_DATEIGROESSE, type Konfliktwahl, type Kopf } from '../speicher/datei'
import { Entschluesselungsfehler } from '../speicher/krypto-grundlagen'
import { browserKrypto } from '../speicher/krypto-auftrag'
import { ExportDialog, PasswortDialog, type ExportAuftrag } from './DateiDialoge'
import { useFrage } from './frage'
import type { Aktion } from './zustand'

/** Export- und Importabläufe; `element` enthält Dialoge und das versteckte Dateifeld. */
export function useDatei(bestand: Datenbestand, dispatch: Dispatch<Aktion>, melde: (text: string) => void) {
  const [exportAuftrag, setExportAuftrag] = useState<ExportAuftrag | null>(null)
  const [verschluesselt, setVerschluesselt] = useState<{ kopf: Kopf; name: string } | null>(null)
  const feld = useRef<HTMLInputElement>(null)
  const frage = useFrage()
  // aktueller Bestand für die Rückfragen beim Import (die zwischendurch auf Antworten warten)
  const aktuell = useRef(bestand)
  useEffect(() => {
    aktuell.current = bestand
  }, [bestand])

  const zeigeFehler = useCallback(
    (text: string) => frage({ titel: 'Import nicht möglich', text: `${text} Die vorhandenen Daten bleiben unverändert.`, knoepfe: [{ wert: 'ok', text: 'Schließen', art: 'haupt' }], abbrechen: 'ok' }),
    [frage],
  )

  /** Schritte nach dem Entschlüsseln: Rückfragen, Zusammenführen, Meldung */
  const uebernehmen = useCallback(
    async (kopf: Kopf, neu: Datenbestand) => {
      const wahl: Record<Id, Konfliktwahl> = {}
      for (const b of bekannteBetriebe(aktuell.current, neu)) {
        wahl[b.id] = await frage<Konfliktwahl>({
          titel: 'Betrieb schon vorhanden',
          text: `„${b.name}“ gibt es schon. Was soll mit dem Betrieb aus der Datei geschehen?`,
          knoepfe: [
            { wert: 'ueberspringen', text: 'Überspringen' },
            { wert: 'kopie', text: 'Als Kopie' },
            { wert: 'ersetzen', text: 'Ersetzen', art: 'gefahr' },
          ],
          abbrechen: 'ueberspringen',
        })
      }
      let einstellungenUebernehmen = false
      if (kopf.umfang === 'alles') {
        einstellungenUebernehmen =
          (await frage({
            titel: 'Einstellungen übernehmen?',
            text: 'Die Sicherung enthält auch Einstellungen (Berater, DNS-Anbieter, Darstellung). Sollen sie die aktuellen ersetzen?',
            knoepfe: [
              { wert: 'nein', text: 'Nein, behalten' },
              { wert: 'ja', text: 'Übernehmen', art: 'haupt' },
            ],
            abbrechen: 'nein',
          })) === 'ja'
      }
      const z = fuehreZusammen(aktuell.current, neu, wahl, { umfang: kopf.umfang, einstellungenUebernehmen })
      dispatch({ typ: 'bestand', bestand: z.bestand })
      const teile = [
        z.hinzugefuegt && `${z.hinzugefuegt} hinzugefügt`,
        z.ersetzt && `${z.ersetzt} ersetzt`,
        z.kopiert && `${z.kopiert} als Kopie`,
        z.uebersprungen && `${z.uebersprungen} übersprungen`,
      ].filter(Boolean)
      melde(`Import: ${teile.length > 0 ? teile.join(', ') : 'keine Betriebe in der Datei'}.`)
    },
    [dispatch, frage, melde],
  )

  const dateiGewaehlt = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      e.target.value = ''
      if (!f) return
      if (f.size > MAX_DATEIGROESSE) return void zeigeFehler('Die Datei ist größer als 50 MB.')
      try {
        const kopf = leseKopf(await f.text())
        if (kopf.verschluesselung) {
          setVerschluesselt({ kopf, name: f.name })
          return
        }
        await uebernehmen(kopf, await leseInhalt(kopf, null, browserKrypto, KATALOG))
      } catch (err) {
        await zeigeFehler(err instanceof ImportFehler ? err.message : 'Die Datei ließ sich nicht lesen.')
      }
    },
    [uebernehmen, zeigeFehler],
  )

  const entschluesseln = useCallback(
    async (passwort: string): Promise<string | null> => {
      if (!verschluesselt) return null
      let neu: Datenbestand
      try {
        neu = await leseInhalt(verschluesselt.kopf, passwort, browserKrypto, KATALOG)
      } catch (err) {
        if (err instanceof Entschluesselungsfehler) return err.message
        setVerschluesselt(null)
        await zeigeFehler(err instanceof ImportFehler ? err.message : 'Die Datei ließ sich nicht lesen.')
        return null
      }
      setVerschluesselt(null)
      await uebernehmen(verschluesselt.kopf, neu)
      return null
    },
    [verschluesselt, uebernehmen, zeigeFehler],
  )

  const exportieren = useCallback((umfang: Umfang, betriebId?: Id) => setExportAuftrag({ umfang, betriebId }), [])
  const importieren = useCallback(() => feld.current?.click(), [])

  const element: ReactNode = (
    <>
      <input ref={feld} type="file" accept=".sicherheitscheck,application/json" hidden aria-label="Datei zum Importieren" onChange={(e) => void dateiGewaehlt(e)} />
      {exportAuftrag && (
        <ExportDialog
          auftrag={exportAuftrag}
          bestand={bestand}
          onSchliessen={() => setExportAuftrag(null)}
          onFertig={(name) => {
            if (exportAuftrag.umfang === 'alles') {
              const zeit = new Date().toISOString()
              dispatch({ typ: 'einstellungen', aendere: (e) => ({ ...e, letzteSicherung: zeit }) })
            }
            setExportAuftrag(null)
            melde(`Gespeichert als „${name}“.`)
          }}
        />
      )}
      {verschluesselt && <PasswortDialog dateiname={verschluesselt.name} onEntschluesseln={entschluesseln} onSchliessen={() => setVerschluesselt(null)} />}
    </>
  )

  return { exportieren, importieren, element }
}
