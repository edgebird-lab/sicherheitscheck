/**
 * Was die Oberfläche vom Betriebssystem braucht: Sicherungen exportieren und importieren,
 * Bericht als PDF, Fenstertitel, Speichern vor dem Schließen und das Netz der Außenprüfung.
 * Im Browser gibt es davon nur einen Teil (Herunterladen statt Speichern, kein PDF ohne
 * Druckdialog, nur DNS); im Windows-Programm (Tauri) erledigt das der Rust-Teil.
 */
import type { DohAnbieter, Netz } from '../modell/typen'

/** Eine vom Benutzer gewählte Datei für den Import */
export interface Datei {
  name: string
  inhalt: string
}

/** Art einer Exportdatei: Sicherung (`.sicherheitscheck`) oder Beratungsakte (`.beratungsakte.json`) */
export type DateiArt = 'sicherung' | 'beratungsakte'

export interface NetzOptionen {
  anbieter: DohAnbieter
  /** bricht laufende Abfragen ab (Knopf „Abbrechen“) */
  signal?: AbortSignal
}

export interface Plattform {
  /** true im Windows-Programm */
  readonly desktop: boolean
  /** „in diesem Browser“ bzw. „in diesem Programm“, für Texte zum Speicherort */
  readonly ort: string
  /** Dialog zum Importieren; null bei Abbruch. Im Browser öffnet die Oberfläche ihr eigenes Dateifeld. */
  oeffnen(): Promise<Datei | null>
  /** Sicherung, mit der das Programm gestartet wurde (Doppelklick im Explorer) */
  startDatei(): Promise<Datei | null>
  /**
   * Speichert eine Exportdatei (JSON): im Programm mit Dialog und dem Filter der Dateiart
   * (Standard: Sicherung), im Browser als Download. Rückgabe: Dateiname, null bei Abbruch.
   */
  speichernUnter(vorschlag: string, inhalt: string, art?: DateiArt): Promise<string | null>
  /** Bericht als PDF ohne Druckdialog (nur im Programm). Rückgabe: Dateiname, null bei Abbruch. */
  alsPdf(vorschlag: string): Promise<string | null>
  setzeTitel(titel: string): void
  /** Weitere Sicherung soll importiert werden (Doppelklick bei laufendem Programm, ins Fenster gezogen) */
  beiDatei(f: (d: Datei) => void): () => void
  /** Vor dem Schließen des Fensters läuft `vorher` (Speichern), danach schließt das Fenster. */
  beimSchliessen(vorher: () => Promise<void>): () => void
  /** Netz der Außenprüfung: im Browser nur DNS, im Programm auch Website und TLS (nur dann geladen) */
  netz(o: NetzOptionen): Promise<Netz>
}
