/**
 * Tab-Sperre (7.4): Nur ein Tab darf die Daten bearbeiten, sonst überschreiben sich zwei
 * Tabs gegenseitig. Die Sperre gilt, solange der Tab offen ist.
 *
 * Einmal je Seite angefordert (nicht in einem React-Effekt), weil der Strict Mode Effekte
 * doppelt ausführt und die zweite Anfrage sonst am eigenen Tab scheitern würde.
 */
const NAME = 'sicherheitscheck'

let anfrage: Promise<boolean> | null = null

function fordereAn(): Promise<boolean> {
  // Ohne Web Locks (sehr alte Browser) gibt es keinen Schutz; dann wird normal gearbeitet
  if (typeof navigator === 'undefined' || !navigator.locks) return Promise.resolve(true)
  return new Promise((erteilt) => {
    navigator.locks
      .request(NAME, { ifAvailable: true }, (lock) => {
        if (!lock) {
          erteilt(false)
          return
        }
        erteilt(true)
        // Sperre halten, bis der Tab geschlossen wird
        return new Promise<void>(() => {})
      })
      .catch(() => erteilt(true))
  })
}

/** true: dieser Tab darf speichern; false: ein anderer Tab hat die Daten geöffnet. */
export function tabSperre(): Promise<boolean> {
  anfrage ??= fordereAn()
  return anfrage
}

/** Neuer Versuch, z. B. nachdem der andere Tab geschlossen wurde. */
export function tabSperreErneut(): Promise<boolean> {
  anfrage = null
  return tabSperre()
}
