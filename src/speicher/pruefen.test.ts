import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { beispielBetrieb } from '../modell/beispiel'
import { neuePruefung, neuerBetrieb } from '../modell/operationen'
import { FORMAT_VERSION, type Datenbestand } from '../modell/typen'
import { HEUTE, JETZT } from '../testhilfen/pruefung'
import { migriere } from './migration'
import { Formatfehler, leererBestand, pruefeDatenbestand, standardEinstellungen } from './pruefen'

function gueltig(): Datenbestand {
  const zweiter = neuePruefung(neuerBetrieb('Bäckerei Probe', JETZT, 'b-2'), KATALOG, 'Robin', HEUTE, JETZT, 'p-2').betrieb
  return {
    formatVersion: FORMAT_VERSION,
    einstellungen: { ...standardEinstellungen(), berater: { name: 'Robin Olbricht', firma: 'olbricht-digital', email: 'robin@example.com', telefon: '' } },
    betriebe: [beispielBetrieb(KATALOG, HEUTE), zweiter],
  }
}

const kopie = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

describe('Laden prüfen (Spezifikation 9.2)', () => {
  it('T-L01: gültiger Datenbestand bleibt unverändert', () => {
    const daten = gueltig()
    const { bestand, meldungen } = pruefeDatenbestand(kopie(daten), KATALOG)
    expect(meldungen).toEqual([])
    expect(bestand).toEqual(daten)
  })

  it('T-L02: Betrieb 2 ohne Namen → übrige geladen, Meldung „Betrieb 2: Name fehlt.“', () => {
    const daten = kopie(gueltig())
    const dritter = { ...kopie(daten.betriebe[1]), id: 'b-3', name: 'Dritter Betrieb' }
    daten.betriebe[1].name = '   '
    daten.betriebe.push(dritter)
    const { bestand, meldungen } = pruefeDatenbestand(daten, KATALOG)
    expect(meldungen).toEqual(['Betrieb 2: Name fehlt.'])
    expect(bestand.betriebe.map((b) => b.name)).toEqual(['Tischlerei Beispiel GmbH (fiktiv)', 'Dritter Betrieb'])
  })

  it('T-L03: formatVersion 2 → „Die Daten stammen aus einer neueren Version.“', () => {
    const daten = { ...kopie(gueltig()), formatVersion: 2 }
    expect(() => pruefeDatenbestand(daten, KATALOG)).toThrow(new Formatfehler('Die Daten stammen aus einer neueren Version.'))
    expect(() => pruefeDatenbestand(daten, KATALOG, { quelle: 'datei' })).toThrow('Die Datei stammt aus einer neueren Version.')
  })

  it('meldet Fehler in Prüfungen mit Ort', () => {
    const daten = kopie(gueltig())
    daten.betriebe[0].pruefungen[0].antworten.A05.bewertung = 'teilweise' as never
    expect(pruefeDatenbestand(daten, KATALOG).meldungen).toEqual(['Betrieb 1, Prüfung 1: Antwort zu A05 ungültig.'])
  })

  it('lehnt eine abgeschlossene Prüfung ohne Ergebnis ab', () => {
    const daten = kopie(gueltig())
    daten.betriebe[0].pruefungen[0].ergebnis = null
    expect(pruefeDatenbestand(daten, KATALOG).meldungen).toEqual(['Betrieb 1, Prüfung 1: abgeschlossen, aber ohne Ergebnis.'])
  })

  it('überspringt doppelte Kennungen', () => {
    const daten = kopie(gueltig())
    daten.betriebe.push(kopie(daten.betriebe[0]))
    const { bestand, meldungen } = pruefeDatenbestand(daten, KATALOG)
    expect(meldungen).toEqual(['Betrieb 3: Kennung doppelt.'])
    expect(bestand.betriebe).toHaveLength(2)
  })

  it('ersetzt ungültige Einstellungen beim Laden durch Standardwerte; beim strengen Prüfen ist es ein Fehler', () => {
    const daten = kopie(gueltig()) as unknown as Record<string, unknown>
    daten.einstellungen = { berater: null }
    const { bestand, meldungen } = pruefeDatenbestand(daten, KATALOG)
    expect(bestand.einstellungen).toEqual(standardEinstellungen())
    expect(meldungen).toEqual(['Einstellungen: Angaben zum Berater fehlen. Standardwerte verwendet.'])
    expect(() => pruefeDatenbestand(daten, KATALOG, { streng: true })).toThrow('Einstellungen: Angaben zum Berater fehlen.')
  })

  it('bricht beim strengen Prüfen beim ersten fehlerhaften Betrieb ab', () => {
    const daten = kopie(gueltig())
    daten.betriebe[1].name = ''
    expect(() => pruefeDatenbestand(daten, KATALOG, { streng: true, quelle: 'datei' })).toThrow('Betrieb 2: Name fehlt.')
  })

  it('ergänzt fehlende Antworten eines Entwurfs, lässt abgeschlossene Prüfungen unverändert', () => {
    const daten = kopie(gueltig())
    delete daten.betriebe[1].pruefungen[0].antworten.A27
    delete daten.betriebe[0].pruefungen[0].antworten.A27
    const { bestand } = pruefeDatenbestand(daten, KATALOG)
    expect(bestand.betriebe[1].pruefungen[0].antworten.A27).toEqual({ bewertung: 'offen', begruendung: '', nachweis: '', uebernommen: false })
    expect(bestand.betriebe[0].pruefungen[0].antworten.A27).toBeUndefined()
  })

  it('lehnt Unbrauchbares ab', () => {
    expect(() => pruefeDatenbestand(null, KATALOG)).toThrow('Die Daten enthalten keinen Sicherheitscheck-Datenbestand.')
    expect(() => pruefeDatenbestand({ betriebe: [] }, KATALOG)).toThrow('Die Daten haben keine Formatversion.')
    expect(() => pruefeDatenbestand({ formatVersion: 1 }, KATALOG, { quelle: 'datei' })).toThrow('Die Datei enthält keine Betriebsliste.')
    expect(() => pruefeDatenbestand({ formatVersion: 0, betriebe: [] }, KATALOG)).toThrow('Datenformat 0 wird nicht unterstützt.')
  })

  it('leerer Bestand ist gültig', () => {
    expect(pruefeDatenbestand(leererBestand(), KATALOG)).toEqual({ bestand: leererBestand(), meldungen: [] })
  })
})

describe('Migrationsgerüst', () => {
  it('lässt aktuelle Daten unverändert', () => {
    const daten = gueltig()
    expect(migriere(kopie(daten))).toEqual(daten)
  })

  it('wendet Migrationen der Reihe nach an', () => {
    const alt = { formatVersion: -1, betriebe: [], eintraege: [] as string[] }
    const ergebnis = migriere(alt, {
      [-1]: (d) => (d.eintraege as string[]).push('von -1'),
      0: (d) => {
        ;(d.eintraege as string[]).push('von 0')
        d.einstellungen = standardEinstellungen()
      },
    })
    expect(ergebnis).toEqual({ formatVersion: 1, betriebe: [], eintraege: ['von -1', 'von 0'], einstellungen: standardEinstellungen() })
  })

  it('meldet eine ältere Version ohne Migration', () => {
    expect(() => migriere({ formatVersion: 0, betriebe: [] })).toThrow('Datenformat 0 wird nicht unterstützt.')
  })
})

describe('Außenprüfung beim Laden prüfen', () => {
  const aussen = {
    domain: 'example.com',
    dkimSelektoren: [],
    modus: 'browser',
    dohAnbieter: 'cloudflare',
    bestaetigung: { name: 'Robin', rolle: 'beauftragt', text: 'Ich bestätige …', zeit: '2026-11-11T12:00:00.000Z' },
    gestartet: '2026-11-11T12:00:00.000Z',
    beendet: '2026-11-11T12:00:01.000Z',
    abgebrochen: false,
    befunde: [{ pruefId: 'dmarc', ziel: 'example.com', stufe: 'warnung', regel: 'DMARC-05', weitere: [], messwert: 'v=DMARC1; p=none', werte: { p: 'none', pct: null } }],
    protokoll: [{ zeit: '2026-11-11T12:00:00.000Z', art: 'dns', anfrage: 'TXT _dmarc.example.com', ergebnis: 'NOERROR, 1 Antwort', dauerMs: 12 }],
  }

  function mitAussen(a: unknown): Datenbestand {
    const daten = kopie(gueltig())
    ;(daten.betriebe[1].pruefungen[0] as { aussen: unknown }).aussen = a
    return daten
  }

  it('eine gültige Außenprüfung bleibt erhalten', () => {
    const { bestand, meldungen } = pruefeDatenbestand(mitAussen(kopie(aussen)), KATALOG)
    expect(meldungen).toEqual([])
    expect(bestand.betriebe[1].pruefungen[0].aussen).toEqual(aussen)
  })

  it('unbekannte Stufe, Prüfung oder fehlender Messwert: der Betrieb wird übersprungen und gemeldet', () => {
    for (const befund of [
      { ...aussen.befunde[0], stufe: 'gelb' },
      { ...aussen.befunde[0], pruefId: 'ftp' },
      { ...aussen.befunde[0], messwert: undefined },
      { ...aussen.befunde[0], werte: { liste: [1, 2] } },
    ]) {
      const { meldungen } = pruefeDatenbestand(mitAussen({ ...kopie(aussen), befunde: [befund] }), KATALOG)
      expect(meldungen).toEqual(['Betrieb 2, Prüfung 1: Befunde ungültig.'])
    }
    const { meldungen } = pruefeDatenbestand(mitAussen({ ...kopie(aussen), protokoll: [{ ...aussen.protokoll[0], art: 'ftp' }] }), KATALOG)
    expect(meldungen).toEqual(['Betrieb 2, Prüfung 1: Abrufprotokoll ungültig.'])
  })

  it('Regel ohne Text in dieser Version (Hauptregel oder weitere): übersprungen statt Absturz der Anzeige', () => {
    for (const [befund, regel] of [
      [{ ...aussen.befunde[0], regel: 'WEB-99' }, 'WEB-99'],
      [{ ...aussen.befunde[0], weitere: [{ regel: 'DMARC-99', stufe: 'hinweis' }] }, 'DMARC-99'],
    ] as const) {
      const { bestand, meldungen } = pruefeDatenbestand(mitAussen({ ...kopie(aussen), befunde: [befund] }), KATALOG)
      expect(meldungen).toEqual([`Betrieb 2, Prüfung 1: Befund mit unbekannter Regel „${regel}“ (Daten einer neueren Version?).`])
      expect(bestand.betriebe).toHaveLength(1)
      // Beim Import bricht derselbe Fehler ab
      expect(() => pruefeDatenbestand(mitAussen({ ...kopie(aussen), befunde: [befund] }), KATALOG, { streng: true, quelle: 'datei' })).toThrow(`unbekannter Regel „${regel}“`)
    }
  })
})

describe('Ergebnis beim Laden prüfen', () => {
  it('jeder Themenbereich braucht Punkte, Höchstwert und Anteil (Netzdiagramm und Tabelle lesen sie)', () => {
    type JeThema = Record<string, unknown>
    const faelle: ((j: JeThema) => void)[] = [
      (j) => delete j.patch,
      (j) => (j.systeme = { roh: 5, maximal: 6 }),
      (j) => (j.organisation = { roh: '2', maximal: 10, anteil: 0.2 }),
      (j) => (j.datensicherung = { roh: 4, maximal: 6, anteil: '67 %' }),
    ]
    for (const aendere of faelle) {
      const daten = kopie(gueltig())
      aendere(daten.betriebe[0].pruefungen[0].ergebnis!.jeThema as unknown as JeThema)
      expect(pruefeDatenbestand(daten, KATALOG).meldungen).toEqual(['Betrieb 1, Prüfung 1: Ergebnis ungültig.'])
    }
    // Anteil null (Themenbereich ganz nicht relevant) ist gültig
    const daten = kopie(gueltig())
    daten.betriebe[0].pruefungen[0].ergebnis!.jeThema.systeme = { roh: 0, maximal: 0, anteil: null }
    expect(pruefeDatenbestand(daten, KATALOG).meldungen).toEqual([])
  })
})
