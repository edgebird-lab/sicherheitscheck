/**
 * Netz im Windows-Programm (Spezifikation 7.7): DNS über HTTPS wie im Browser über `fetch`
 * (die CSP des Programms erlaubt nur die beiden Anbieter, E32), HTTP und TLS über die
 * Rust-Befehle `http_abruf` und `tls_info`, vorher `freigabe_setzen` für die geprüfte Domain.
 * Die Brücke zu Rust (`rufe`) kommt von außen; so bleibt das Modul ohne Tauri testbar und wird
 * nur im Programm geladen (src/plattform/desktop.ts).
 */
import type { HttpAntwort, Netz, NetzFehler, TlsInfo } from '../modell/typen'
import { browserNetz, type BrowserNetzOptionen } from './browser'
import { istNetzFehler } from './schnittstelle'

/** Ruft einen Befehl des Rust-Teils auf; Fehler kommen als abgelehntes Versprechen. */
export type Rufe = <T>(befehl: string, args: Record<string, unknown>) => Promise<T>

export interface DesktopNetzOptionen extends BrowserNetzOptionen {
  rufe: Rufe
}

/** Fehler des Rust-Teils sind schon NetzFehler; alles andere (etwa eine fehlende Berechtigung) wird einer. */
function alsNetzFehler(e: unknown): NetzFehler {
  if (istNetzFehler(e) && typeof e.text === 'string') return { fehler: e.fehler, text: e.text, ...(e.httpStatus !== undefined && { httpStatus: e.httpStatus }) }
  return { fehler: 'verbindung', text: e instanceof Error ? e.message : String(e) }
}

async function versuche<T>(aufruf: () => Promise<T>): Promise<T | NetzFehler> {
  try {
    return await aufruf()
  } catch (e) {
    return alsNetzFehler(e)
  }
}

export function desktopNetz(o: DesktopNetzOptionen): Netz {
  const dns = browserNetz(o)
  return {
    modus: 'desktop',
    dns: (name, typ, ohneDnssecPruefung) => dns.dns(name, typ, ohneDnssecPruefung),
    http: (url) => versuche(() => o.rufe<HttpAntwort>('http_abruf', { url })),
    tls: (host) => versuche(() => o.rufe<TlsInfo>('tls_info', { host })),
    freigeben: async (domain) => {
      const r = await versuche(() => o.rufe<null>('freigabe_setzen', { domain }))
      return istNetzFehler(r) ? r : null
    },
  }
}
