/**
 * Nachrichten zwischen Oberfläche und Krypto-Worker und die Krypto-Umsetzung für den Browser.
 */
import { direkteKrypto, Entschluesselungsfehler, type KdfParameter, type Krypto, type Verschluesselt } from './krypto'

export type KryptoAuftrag =
  | { art: 'verschluesseln'; klartext: string; passwort: string; aad: string; kdf: KdfParameter }
  | { art: 'entschluesseln'; verschluesselt: Verschluesselt; passwort: string; aad: string; kdf: KdfParameter }

export type KryptoAntwort = { ok: true; ergebnis: Verschluesselt | string } | { ok: false; name: string; text: string }

function imWorker<T>(auftrag: KryptoAuftrag): Promise<T> {
  return new Promise<T>((erfuellt, abgelehnt) => {
    const worker = new Worker(new URL('./krypto.worker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', (e: MessageEvent<KryptoAntwort>) => {
      worker.terminate()
      const a = e.data
      if (a.ok) erfuellt(a.ergebnis as T)
      else abgelehnt(a.name === 'Entschluesselungsfehler' ? new Entschluesselungsfehler() : new Error(a.text))
    })
    worker.addEventListener('error', (e) => {
      worker.terminate()
      abgelehnt(new Error(e.message || 'Der Verschlüsselungsdienst ließ sich nicht starten.'))
    })
    worker.postMessage(auftrag)
  })
}

/** Rechnet im Web Worker; ohne Worker-Unterstützung direkt im Hauptthread. */
export const browserKrypto: Krypto =
  typeof Worker === 'undefined'
    ? direkteKrypto
    : {
        verschluessele: (klartext, passwort, aad, kdf) => imWorker<Verschluesselt>({ art: 'verschluesseln', klartext, passwort, aad, kdf }),
        entschluessele: (verschluesselt, passwort, aad, kdf) => imWorker<string>({ art: 'entschluesseln', verschluesselt, passwort, aad, kdf }),
      }
