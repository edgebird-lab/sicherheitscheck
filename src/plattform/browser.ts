import { browserNetz } from '../netz/browser'
import type { Plattform } from './typen'

function herunterladen(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Browser: Import über das Dateifeld der Oberfläche, Export als Download, PDF über den
 * Druckdialog. Gespeichert wird beim Verlassen der Seite (pagehide, src/ui/daten.ts).
 */
export const browserPlattform: Plattform = {
  desktop: false,
  ort: 'in diesem Browser',
  oeffnen: async () => null,
  startDatei: async () => null,
  // Sicherung und Beratungsakte sind JSON; der Blob schreibt den Text als UTF-8
  speichernUnter: async (vorschlag, inhalt) => {
    herunterladen(inhalt, vorschlag)
    return vorschlag
  },
  alsPdf: async () => null,
  setzeTitel: (titel) => {
    document.title = titel
  },
  beiDatei: () => () => {},
  beimSchliessen: () => () => {},
  netz: async (o) => browserNetz(o),
}
