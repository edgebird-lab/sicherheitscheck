import { useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'

/** Platzhalter bis Phase 3 (Außenprüfung DNS) */
export function AussenSchritt() {
  const { betrieb } = useAuswahl()
  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Außenprüfung</h1>
      <div className="karte">
        <p>
          <strong>Optional.</strong> Ohne Außenprüfung entfällt Teil B des Berichts.
        </p>
        <p className="leise">
          Die passive Prüfung von E-Mail-Domain und Website ist noch in Arbeit. Sie fragt nach Bestätigung der Zuständigkeit nur öffentliche DNS-Einträge ab (MX, SPF, DMARC, DKIM, MTA-STS,
          TLS-RPT, DNSSEC, CAA); die Website-Prüfung folgt im Windows-Programm.
        </p>
        <p className="leise">
          <Symbol art="info" /> Domain dieses Betriebs: {betrieb.domain ?? 'keine eingetragen (Schritt Betrieb)'}
        </p>
      </div>
    </section>
  )
}
