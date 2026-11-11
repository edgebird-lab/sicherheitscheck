/**
 * Hülle für krypto.ts im Web Worker: Argon2id braucht rund eine Sekunde und 64 MiB und
 * soll die Oberfläche nicht blockieren. Ein Auftrag je Worker; danach beendet ihn der Aufrufer.
 */
import { entschluessele, verschluessele } from './krypto'
import type { KryptoAuftrag, KryptoAntwort } from './krypto-auftrag'

addEventListener('message', (e: MessageEvent<KryptoAuftrag>) => {
  const a = e.data
  const arbeit = a.art === 'verschluesseln' ? verschluessele(a.klartext, a.passwort, a.aad, a.kdf) : entschluessele(a.verschluesselt, a.passwort, a.aad, a.kdf)
  arbeit.then(
    (ergebnis) => postMessage({ ok: true, ergebnis } satisfies KryptoAntwort),
    (fehler: unknown) => postMessage({ ok: false, name: fehler instanceof Error ? fehler.name : 'Error', text: fehler instanceof Error ? fehler.message : String(fehler) } satisfies KryptoAntwort),
  )
})
