import { useState } from 'react'
import { zeitpunktDeutsch } from '../modell/datum'
import type { Darstellung, DohAnbieter, Einstellungen } from '../modell/typen'
import { Auswahl, Feld } from './Eingaben'
import { useApp } from './kontext'
import { APP_NAME, VERSION } from './marke'

const BESTAETIGUNG = 'LÖSCHEN'

export function EinstellungenSeite() {
  const { z, dispatch, speicher, datei, melde } = useApp()
  const e = z.bestand.einstellungen
  const [loeschen, setLoeschen] = useState('')

  const berater = (feld: keyof Einstellungen['berater'], wert: string) => dispatch({ typ: 'einstellungen', aendere: (alt) => ({ ...alt, berater: { ...alt.berater, [feld]: wert } }) })

  return (
    <main id="inhalt" className="seite seite-schmal">
      <h1>Einstellungen</h1>

      <section className="karte" aria-labelledby="einst-berater">
        <h2 id="einst-berater">Berater</h2>
        <p className="leise klein">Erscheint als Vorbelegung in jeder neuen Prüfung und später im Bericht.</p>
        <div className="feldreihe">
          <Feld label="Name">{(id) => <input id={id} type="text" autoComplete="name" value={e.berater.name} onChange={(x) => berater('name', x.target.value)} />}</Feld>
          <Feld label="Firma">{(id) => <input id={id} type="text" autoComplete="organization" value={e.berater.firma} onChange={(x) => berater('firma', x.target.value)} />}</Feld>
          <Feld label="E-Mail">{(id) => <input id={id} type="email" autoComplete="email" value={e.berater.email} onChange={(x) => berater('email', x.target.value)} />}</Feld>
          <Feld label="Telefon">{(id) => <input id={id} type="tel" autoComplete="tel" value={e.berater.telefon} onChange={(x) => berater('telefon', x.target.value)} />}</Feld>
        </div>
      </section>

      <section className="karte" aria-labelledby="einst-dns">
        <h2 id="einst-dns">DNS-Anbieter für die Außenprüfung</h2>
        <Auswahl<DohAnbieter>
          label="Anbieter für DNS über HTTPS"
          wert={e.dohAnbieter}
          optionen={[
            { wert: 'cloudflare', text: 'Cloudflare', beschreibung: 'Standard' },
            { wert: 'google', text: 'Google Public DNS' },
          ]}
          onAendern={(w) => dispatch({ typ: 'einstellungen', aendere: (alt) => ({ ...alt, dohAnbieter: w }) })}
          hilfe="Datenschutz: Der Anbieter sieht die abgefragten Domainnamen und die IP-Adresse dieses Rechners. Beide Anbieter sitzen in den USA. Google erhält keine Angaben zum Netz des Beraters (edns_client_subnet=0.0.0.0/0)."
          spalten={2}
        />
      </section>

      <section className="karte" aria-labelledby="einst-darstellung">
        <h2 id="einst-darstellung">Darstellung</h2>
        <Auswahl<Darstellung>
          label="Farbschema"
          wert={e.darstellung}
          optionen={[
            { wert: 'system', text: 'Wie das System' },
            { wert: 'hell', text: 'Hell' },
            { wert: 'dunkel', text: 'Dunkel' },
          ]}
          onAendern={(w) => dispatch({ typ: 'einstellungen', aendere: (alt) => ({ ...alt, darstellung: w }) })}
          spalten={3}
        />
      </section>

      <section className="karte" aria-labelledby="einst-daten">
        <h2 id="einst-daten">Daten</h2>
        <dl className="angaben">
          <dt>Speicherort</dt>
          <dd>{speicher.aktiv ? 'IndexedDB dieses Browsers, nur auf diesem Rechner' : 'nicht verfügbar: Änderungen gehen beim Schließen verloren'}</dd>
          <dt>Dauerhafte Speicherung</dt>
          <dd>
            {speicher.dauerhaft === true
              ? 'zugesagt: Der Browser löscht die Daten nicht bei Platzmangel.'
              : speicher.dauerhaft === false
                ? 'nicht zugesagt: Bei Platzmangel könnte der Browser die Daten löschen. Regelmäßig sichern.'
                : 'unbekannt'}
          </dd>
          <dt>Letzte Sicherung</dt>
          <dd>{e.letzteSicherung ? zeitpunktDeutsch(e.letzteSicherung) : 'noch keine'}</dd>
        </dl>
        <div className="knopfreihe">
          <button type="button" className="knopf" onClick={() => datei.exportieren('alles')} disabled={z.bestand.betriebe.length === 0}>
            Sicherung exportieren
          </button>
          <button type="button" className="knopf" onClick={datei.importieren}>
            Datei importieren
          </button>
        </div>

        <div className="gefahrenzone">
          <h3>Alle Daten löschen</h3>
          <p className="leise klein">Löscht alle Betriebe, Prüfungen und Einstellungen in diesem Browser. Das lässt sich nicht rückgängig machen; exportierte Dateien bleiben erhalten.</p>
          <div className="inline-anlegen">
            <Feld label={`Zur Bestätigung „${BESTAETIGUNG}“ eingeben`}>
              {(id) => <input id={id} type="text" autoComplete="off" value={loeschen} onChange={(x) => setLoeschen(x.target.value)} />}
            </Feld>
            <button
              type="button"
              className="knopf knopf-gefahr"
              disabled={loeschen !== BESTAETIGUNG}
              onClick={() =>
                void speicher.allesLoeschen().then(() => {
                  setLoeschen('')
                  melde('Alle Daten wurden gelöscht.')
                })
              }
            >
              Alle Daten löschen
            </button>
          </div>
        </div>
      </section>

      <p className="leise klein">
        {APP_NAME} {VERSION}. Läuft ohne Server und ohne KI. Interviewdaten verlassen den Rechner nur als selbst exportierte Datei; die Außenprüfung fragt öffentliche DNS-Einträge beim gewählten Anbieter ab.
      </p>
    </main>
  )
}
