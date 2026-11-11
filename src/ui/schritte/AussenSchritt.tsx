import { useEffect, useRef, useState, type RefObject } from 'react'
import { KATALOG } from '../../katalog'
import { zeitpunktDeutsch } from '../../modell/datum'
import { setzeAussenpruefung } from '../../modell/operationen'
import type { Aussenpruefung, Bestaetigung, PruefId } from '../../modell/typen'
import { ANBIETER_NAME } from '../../netz/browser'
import { plattform } from '../../plattform'
import { bestaetigungsText } from '../../pruefung/bestaetigung'
import type { DomainErgebnis } from '../../pruefung/domain'
import { STANDARD_GRENZEN } from '../../pruefung/lauf'
import { GRUPPEN, PRUEF_IDS } from '../../pruefung/stufen'
import { Abrufprotokoll, BefundGruppen, Zaehlung } from '../Befunde'
import { Auswahl, Feld, Kontrollkaestchen } from '../Eingaben'
import { useBestaetigen } from '../frage'
import { useApp, useAuswahl } from '../kontext'
import { Symbol } from '../Symbole'
import { MODUS_TEXT, ROLLE_BESTAETIGUNG_TEXT } from '../texte'
import { useAendern } from './aendern'
import { AbgeschlossenHinweis } from './gemeinsam'

/** Domain nach 6.3 prüfen; die Public Suffix List (tldts) wird erst hier geladen. */
async function pruefeDomainSpaeter(text: string): Promise<DomainErgebnis> {
  const { pruefeDomain } = await import('../../pruefung/domain')
  return pruefeDomain(text)
}

export function AussenSchritt() {
  const { z, melde, dispatch } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const aendern = useAendern()
  const bestaetigen = useBestaetigen()
  const anbieter = z.bestand.einstellungen.dohAnbieter

  const [domainText, setDomainText] = useState(betrieb.domain ?? '')
  const [domain, setDomain] = useState<DomainErgebnis | null>(null)
  const [rolle, setRolle] = useState<Bestaetigung['rolle'] | null>(null)
  const [name, setName] = useState(pruefung?.berater || z.bestand.einstellungen.berater.name)
  const [zugestimmt, setZugestimmt] = useState(false)
  const [neuerLauf, setNeuerLauf] = useState(false)
  const [fertig, setFertig] = useState<PruefId[] | null>(null)
  const abbruch = useRef<AbortController | null>(null)
  const ergebnisTitel = useRef<HTMLHeadingElement>(null)
  const zuletzt = useRef(pruefung?.aussen?.gestartet ?? null)

  // Verlässt man den Schritt während eines Laufs, wird er abgebrochen; das Teilergebnis bleibt
  useEffect(() => () => abbruch.current?.abort(), [])

  // Domain des Betriebs beim Öffnen prüfen
  useEffect(() => {
    let aktiv = true
    if (betrieb.domain) void pruefeDomainSpaeter(betrieb.domain).then((r) => aktiv && setDomain(r))
    return () => {
      aktiv = false
    }
  }, [betrieb.domain])

  // Nach einem neuen Ergebnis den Fokus auf dessen Überschrift setzen
  const gestartet = pruefung?.aussen?.gestartet ?? null
  useEffect(() => {
    if (gestartet && gestartet !== zuletzt.current) ergebnisTitel.current?.focus()
    zuletzt.current = gestartet
  }, [gestartet])

  if (!pruefung) return null
  const p = pruefung
  const gesperrt = p.status === 'abgeschlossen'
  const D = domain?.ok ? domain.domain : null
  const bereit = D !== null && rolle !== null && name.trim() !== '' && zugestimmt

  const domainUebernehmen = async () => {
    if (domainText.trim() === '') {
      setDomain({ ok: false, fehler: 'Bitte eine Domain eingeben.' })
      return
    }
    const r = await pruefeDomainSpaeter(domainText)
    setDomain(r)
    if (!r.ok) return
    if (r.domain !== D) setZugestimmt(false)
    setDomainText(r.domain)
    if (r.domain !== betrieb.domain) aendern.betrieb({ domain: r.domain })
  }

  const starte = async () => {
    if (!bereit || D === null || rolle === null) return
    const steuerung = new AbortController()
    abbruch.current = steuerung
    setFertig([])
    try {
      const { aussenpruefung } = await import('../../pruefung/ablauf')
      const netz = plattform.netz({ anbieter, signal: steuerung.signal })
      const r = await aussenpruefung(
        { domain: D, dkimSelektoren: betrieb.dkimSelektoren, dohAnbieter: anbieter, bestaetigung: { name, rolle, zugestimmt } },
        netz,
        { signal: steuerung.signal, fortschritt: setFertig },
      )
      if (!r.ok) {
        melde(r.fehler)
        return
      }
      aendern.pruefung((alt, jetzt) => setzeAussenpruefung(KATALOG, alt, r.aussen, jetzt))
      setZugestimmt(false)
      setNeuerLauf(false)
      melde(r.aussen.abgebrochen ? 'Außenprüfung abgebrochen; die bis dahin geprüften Ergebnisse sind gespeichert.' : `Außenprüfung von ${r.aussen.domain} abgeschlossen.`)
    } finally {
      abbruch.current = null
      setFertig(null)
    }
  }

  const fragNeuerLauf = async () => {
    const ok = await bestaetigen(
      'Neue Außenprüfung?',
      'Ein neuer Lauf ersetzt das bisherige Ergebnis dieser Prüfung. Die Zuständigkeit ist erneut zu bestätigen.',
      'Neuen Lauf vorbereiten',
      'haupt',
    )
    if (ok) setNeuerLauf(true)
  }

  const zeigeFormular = !gesperrt && fertig === null && (p.aussen === null || neuerLauf)

  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Außenprüfung</h1>
      {gesperrt && <AbgeschlossenHinweis />}

      {p.aussen === null && (
        <p className="banner banner-hinweis">
          <Symbol art="info" /> Optional. Ohne Außenprüfung entfällt Teil B des Berichts.
        </p>
      )}

      {zeigeFormular && (
        <div className="karte" role="group" aria-labelledby="vorbereitung-titel">
          <h2 id="vorbereitung-titel">{p.aussen ? 'Neue Außenprüfung' : 'Prüfung vorbereiten'}</h2>
          <p className="leise">
            Passive Prüfung von außen: Die App liest nur öffentliche DNS-Einträge, so wie es jeder Mailserver tut. Keine Portscans, keine Anmeldeversuche. Geprüft werden MX, SPF, DMARC, DKIM, MTA-STS,
            TLS-RPT, DNSSEC und CAA.
          </p>
          <div className="feldreihe">
            <Feld label="Domain" fehler={domain && !domain.ok ? domain.fehler : null} hilfe={domain?.ok ? (domain.hinweis ?? 'geprüft nach 6.3: registrierbare Domain') : 'z. B. firma.de'}>
              {(id, beschreibung) => (
                <input
                  id={id}
                  type="text"
                  spellCheck={false}
                  autoCapitalize="off"
                  value={domainText}
                  aria-describedby={beschreibung}
                  onChange={(e) => {
                    setDomainText(e.target.value)
                    setZugestimmt(false)
                  }}
                  onBlur={() => void domainUebernehmen()}
                  onKeyDown={(e) => e.key === 'Enter' && void domainUebernehmen()}
                />
              )}
            </Feld>
            <dl className="angaben">
              <dt>DKIM-Selektoren</dt>
              <dd>
                {betrieb.dkimSelektoren.length > 0 ? betrieb.dkimSelektoren.join(', ') : 'keine'}{' '}
                <button type="button" className="verweis" onClick={() => dispatch({ typ: 'schritt', schritt: 'betrieb' })}>
                  im Schritt Betrieb ändern
                </button>
              </dd>
              <dt>Modus</dt>
              <dd>{MODUS_TEXT.browser}</dd>
              <dt>DNS-Anbieter</dt>
              <dd>{ANBIETER_NAME[anbieter]} (in den Einstellungen wählbar)</dd>
            </dl>
          </div>
          <p>
            <strong>Geplante Abrufe:</strong> bis zu {STANDARD_GRENZEN.dns} DNS-Abfragen über {ANBIETER_NAME[anbieter]} zu {D ?? 'der Domain'} und ihren Unternamen (_dmarc, _mta-sts, _smtp._tls
            {betrieb.dkimSelektoren.length > 0 ? ', DKIM-Selektoren' : ''}). Die Website wird im Browser nicht abgerufen; das kann nur das Windows-Programm. Der Anbieter sieht die abgefragten Namen und die
            IP-Adresse dieses Rechners.
          </p>

          <Auswahl<Bestaetigung['rolle']>
            label="Rolle"
            wert={rolle}
            optionen={[
              { wert: 'beauftragt', text: 'Beauftragt', beschreibung: 'vom Inhaber der Domain mit der Prüfung beauftragt' },
              { wert: 'verantwortlich', text: 'Verantwortlich', beschreibung: 'selbst für die Domain verantwortlich' },
            ]}
            onAendern={setRolle}
            spalten={2}
          />
          <Feld label="Name">{(id) => <input id={id} type="text" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} />}</Feld>
          <div className="bestaetigung">
            {D ? (
              <Kontrollkaestchen an={zugestimmt} onAendern={setZugestimmt}>
                {bestaetigungsText(D)}
              </Kontrollkaestchen>
            ) : (
              <p className="leise">Erst eine gültige Domain eintragen; dann erscheint hier die Bestätigung.</p>
            )}
          </div>
          <div className="knopfreihe">
            <button type="button" className="knopf knopf-haupt" disabled={!bereit} aria-describedby={bereit ? undefined : 'start-grund'} onClick={() => void starte()}>
              Prüfung starten
            </button>
            {neuerLauf && (
              <button type="button" className="knopf" onClick={() => setNeuerLauf(false)}>
                Abbrechen
              </button>
            )}
          </div>
          {!bereit && (
            <p id="start-grund" className="feld-hilfe">
              Starten lässt sich die Prüfung, wenn Domain, Rolle und Name angegeben sind und die Zuständigkeit bestätigt ist.
            </p>
          )}
        </div>
      )}

      {fertig !== null && <Laufanzeige fertig={fertig} onAbbrechen={() => abbruch.current?.abort()} />}

      {p.aussen && fertig === null && (
        <>
          <Ergebnis aussen={p.aussen} titelRef={ergebnisTitel} />
          <BefundGruppen aussen={p.aussen} />
          <details className="karte protokoll-karte">
            <summary>
              Abrufprotokoll ({p.aussen.protokoll.length} {p.aussen.protokoll.length === 1 ? 'Abruf' : 'Abrufe'})
            </summary>
            <Abrufprotokoll protokoll={p.aussen.protokoll} />
          </details>
          {!gesperrt && !neuerLauf && (
            <div className="schritt-fuss knopfreihe">
              <button type="button" className="knopf" onClick={() => void fragNeuerLauf()}>
                Neue Außenprüfung
              </button>
            </div>
          )}
        </>
      )}

      {gesperrt && p.aussen === null && <p className="leise">Für diese Prüfung gibt es keine Außenprüfung.</p>}
    </section>
  )
}

function Laufanzeige({ fertig, onAbbrechen }: { fertig: PruefId[]; onAbbrechen: () => void }) {
  return (
    <div className="karte laufanzeige" role="group" aria-labelledby="lauf-titel">
      <h2 id="lauf-titel">Prüfung läuft …</h2>
      <progress max={PRUEF_IDS.length} value={fertig.length} aria-labelledby="lauf-titel" />
      <ul className="lauf-gruppen">
        {GRUPPEN.map((g) => {
          const n = g.pruefIds.filter((id) => fertig.includes(id)).length
          return (
            <li key={g.id}>
              <strong>{g.name}:</strong> {g.id === 'website' ? 'nur im Windows-Programm' : `${n} von ${g.pruefIds.length} fertig`}
            </li>
          )
        })}
      </ul>
      <button type="button" className="knopf" autoFocus onClick={onAbbrechen}>
        Abbrechen
      </button>
    </div>
  )
}

function Ergebnis({ aussen, titelRef }: { aussen: Aussenpruefung; titelRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <div className="karte" role="group" aria-labelledby="ergebnis-titel">
      <h2 id="ergebnis-titel" ref={titelRef} tabIndex={-1}>
        Ergebnis vom {zeitpunktDeutsch(aussen.gestartet)}
      </h2>
      {aussen.abgebrochen && (
        <p className="banner banner-warnung">
          <Symbol art="warnung" /> Der Lauf wurde abgebrochen. Prüfungen, die noch offen waren, sind „nicht prüfbar“.
        </p>
      )}
      <dl className="angaben">
        <dt>Domain</dt>
        <dd>
          <code>{aussen.domain}</code>
        </dd>
        <dt>Modus</dt>
        <dd>{MODUS_TEXT[aussen.modus]}</dd>
        <dt>DNS-Anbieter</dt>
        <dd>{ANBIETER_NAME[aussen.dohAnbieter]}</dd>
        <dt>Bestätigt von</dt>
        <dd>
          {aussen.bestaetigung.name} ({ROLLE_BESTAETIGUNG_TEXT[aussen.bestaetigung.rolle]}), {zeitpunktDeutsch(aussen.bestaetigung.zeit)}
        </dd>
      </dl>
      <Zaehlung befunde={aussen.befunde} />
      <details className="erklaerung">
        <summary>Wortlaut der Bestätigung</summary>
        <p>{aussen.bestaetigung.text}</p>
      </details>
    </div>
  )
}
