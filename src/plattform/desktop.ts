/**
 * Windows-Programm (Tauri): Die Oberfläche ruft Befehle des Rust-Teils auf
 * (src-tauri/src/lib.rs). Dateizugriff gibt es nur über diese Befehle und nur für
 * Dateien, die der Benutzer selbst wählt. Die Tauri-Bibliotheken werden erst beim
 * ersten Aufruf geladen, damit die Web-Version sie nie mitlädt.
 */
import type { InvokeArgs } from '@tauri-apps/api/core'
import type { Datei, Plattform } from './typen'

const kern = () => import('@tauri-apps/api/core')
const ereignisse = () => import('@tauri-apps/api/event')
const fenster = () => import('@tauri-apps/api/window')

/** Ruft einen Befehl auf; Fehler des Rust-Teils (Text) werden zu `Error`. */
export async function rufe<T>(befehl: string, args?: InvokeArgs): Promise<T> {
  const { invoke } = await kern()
  try {
    return await invoke<T>(befehl, args)
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e))
  }
}

/** Meldet einen Listener an, der sich auch abmelden lässt, bevor die Anmeldung fertig ist. */
function horche(anmelden: () => Promise<() => void>): () => void {
  let abmelden: (() => void) | null = null
  let beendet = false
  void anmelden().then((f) => {
    if (beendet) f()
    else abmelden = f
  })
  return () => {
    beendet = true
    abmelden?.()
  }
}

export const desktopPlattform: Plattform = {
  desktop: true,
  ort: 'in diesem Programm',
  oeffnen: () => rufe<Datei | null>('oeffnen'),
  startDatei: () => rufe<Datei | null>('start_datei'),
  speichernUnter: (vorschlag, inhalt, art = 'sicherung') => rufe<string | null>('speichern_unter', { vorschlag, inhalt, art }),
  alsPdf: (vorschlag) => rufe<string | null>('als_pdf', { vorschlag }),
  setzeTitel: (titel) => {
    document.title = titel
    void fenster().then(({ getCurrentWindow }) => getCurrentWindow().setTitle(titel))
  },
  beiDatei: (f) => horche(async () => (await ereignisse()).listen<Datei>('datei-oeffnen', (e) => f(e.payload))),
  // Tauri schließt das Fenster nach dem Handler selbst (destroy), sofern er es nicht verhindert
  beimSchliessen: (vorher) =>
    horche(async () =>
      (await fenster()).getCurrentWindow().onCloseRequested(async () => {
        try {
          await vorher()
        } catch {
          // Schließen nie verhindern; ein Speicherfehler steht schon im Kopf der App
        }
      }),
    ),
  // DNS über HTTPS wie im Browser (CSP connect-src erlaubt nur die beiden Anbieter), HTTP und TLS
  // über Rust. Fehler des Rust-Teils sind NetzFehler und gehen unverändert an den Lauf.
  netz: async (o) => {
    const { desktopNetz } = await import('../netz/desktop')
    const { invoke } = await kern()
    return desktopNetz({ ...o, rufe: (befehl, args) => invoke(befehl, args) })
  },
}
