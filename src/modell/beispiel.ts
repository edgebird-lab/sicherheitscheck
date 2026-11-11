/**
 * Fiktiver Beispielbetrieb zum Ausprobieren und für die Bilder in der README (9.10).
 * Eine abgeschlossene Prüfung: 3 TOP erfüllt, 2 TOP nicht erfüllt, 15 Basis erfüllt,
 * 7 Basis nicht erfüllt → Statuswert 18 von 37 (49 %). Die README nennt diese Zahl;
 * beispiel.test.ts sichert sie.
 *
 * Dazu eine fiktive Außenprüfung von example.com (reserviert nach RFC 2606) am Tag vor dem
 * Interview. Ihre Befunde und das Protokoll entsprechen dem, was der Ablauf aus der fiktiven Zone
 * testdaten/dns/beispiel-zone.json ermittelt; auch das prüft beispiel.test.ts.
 */
import { bestaetigungsText } from '../pruefung/bestaetigung'
import { befund, WEBSITE_PRUEF_IDS } from '../pruefung/stufen'
import { berechneErgebnis } from './bewertung'
import { plusTage } from './datum'
import { gleicheMassnahmenAb } from './massnahmen'
import type { Abruf, Antwort, Aussenpruefung, Betrieb, Datum, Katalog, Massnahme, Pruefung } from './typen'

export const BEISPIEL_BETRIEB_ID = '00000000-0000-4000-8000-00000000b001'
export const BEISPIEL_PRUEFUNG_ID = '00000000-0000-4000-8000-00000000a001'
const D = 'example.com'

/** [erfüllt?, Begründung in Stichpunkten, Nachweis] je Anforderung */
const ANTWORTEN: Record<string, [boolean, string, string?]> = {
  A01: [true, 'Inhaberin kümmert sich selbst; Budget für IT jährlich eingeplant; IT-Service berichtet vierteljährlich'],
  A02: [false, 'bisher keine Schulung; Phishing nur aus den Medien bekannt; keine Meldestelle festgelegt'],
  A03: [true, 'Werkstattleiter zuständig, Vertretung durch IT-Service Muster; Aushang im Büro'],
  A04: [false, 'kein Notfallplan; Nummer des IT-Service nur im Handy der Inhaberin'],
  A05: [true, 'zwei Beschäftigte zeitweise im Homeoffice; Regeln schriftlich und unterschrieben'],
  A06: [false, 'keine Übersicht; Geräte und Online-Dienste kennt nur der IT-Service'],
  A07: [true, 'eigene Konten an allen Büroarbeitsplätzen; Werkstatt-PC mit begründetem Sammelkonto'],
  A08: [true, 'Passwortmanager seit 2025; Regeln allen bekannt'],
  A09: [false, 'E-Mail und Cloud-Ablage nur mit Passwort; Online-Banking mit App-Freigabe'],
  A10: [false, 'alle Büro-Konten mit Administratorrechten'],
  A11: [true, 'Checkliste für Austritte vorhanden, zuletzt im Juni genutzt'],
  A12: [true, 'tägliche Sicherung auf NAS; Fehlermeldung per E-Mail an IT-Service', 'Sicherungsprotokoll der letzten Woche gesehen'],
  A13: [true, 'Server, Postfächer und Cloud-Ablage in der Sicherung'],
  A14: [false, 'Sicherung nur auf dem NAS im Serverraum; keine getrennte Kopie'],
  A15: [false, 'Wiederherstellung nie getestet'],
  A16: [true, 'automatische Updates auf allen PCs; Router und NAS monatlich durch IT-Service'],
  A17: [true, 'keine veralteten Systeme; alter CNC-Rechner ohne Netzanbindung'],
  A18: [true, 'Installationen nur durch IT-Service'],
  A19: [false, 'Makros für alle Dateien erlaubt; Kalkulationsvorlagen nutzen Makros'],
  A20: [true, 'Microsoft Defender auf allen PCs aktiv und überwacht', 'Übersicht im Defender-Portal gezeigt'],
  A21: [true, 'Spam- und Schadprogrammfilter des E-Mail-Anbieters eingeschaltet'],
  A22: [true, 'Router mit Firewall, keine Portfreigaben'],
  A23: [true, 'WPA3; eigenes Gäste-WLAN für Kunden'],
  A24: [false, 'Fernwartungsprogramm des IT-Service dauerhaft aktiv, ohne Freigabe je Sitzung'],
  A25: [true, 'zwei Firmenhandys mit PIN, Verschlüsselung und Fernlöschung'],
  A26: [true, 'Standardpasswörter von Router, NAS und Drucker geändert'],
  A27: [true, 'Bildschirmsperre nach 5 Minuten; Laptops mit BitLocker'],
}

/** Befunde, wie sie der Ablauf aus testdaten/dns/beispiel-zone.json ermittelt (Browser-Modus) */
export function beispielBefunde() {
  return [
    befund('mx', D, ['MX-03'], '10 mail.example.com', { anzahl: 1, mx: '10 mail.example.com' }),
    befund('spf', D, ['SPF-04'], 'v=spf1 mx a ?all (2 DNS-Abfragen)', { lookups: 2, qualifier: '?all', eintrag: 'v=spf1 mx a ?all' }),
    befund('dmarc', D, ['DMARC-05'], 'v=DMARC1; p=none', { p: 'none', sp: null, pct: null, rua: null }),
    befund('dkim', D, ['DKIM-01'], 'kein Selektor bekannt'),
    befund('mta_sts', D, ['STS-01'], 'kein MTA-STS-Eintrag'),
    befund('tls_rpt', D, ['RPT-01'], 'kein TLS-RPT-Eintrag'),
    befund('dnssec', D, ['DNSSEC-02'], 'nicht signiert (kein AD)', { ad: false }),
    befund('caa', D, ['CAA-01'], 'kein CAA-Eintrag', { name: null, stellen: null }),
    ...WEBSITE_PRUEF_IDS.map((pruefId) => befund(pruefId, D, ['BROWSER-01'], 'nur im Windows-Programm')),
  ]
}

const PROTOKOLL: [string, string, number][] = [
  ['MX example.com', 'NOERROR, 1 Antwort', 31],
  ['TXT example.com', 'NOERROR, 2 Antworten', 28],
  ['TXT _dmarc.example.com', 'NOERROR, 1 Antwort', 26],
  ['TXT _mta-sts.example.com', 'NXDOMAIN', 24],
  ['TXT _smtp._tls.example.com', 'NXDOMAIN', 25],
  ['SOA example.com', 'NOERROR, 1 Antwort', 27],
  ['CAA example.com', 'NOERROR, keine Antwort', 23],
  ['CAA com', 'NOERROR, keine Antwort', 22],
]

function beispielAussenpruefung(tag: Datum): Aussenpruefung {
  const zeit = (sekunde: number) => `${tag}T09:15:${String(sekunde).padStart(2, '0')}.000Z`
  return {
    domain: D,
    dkimSelektoren: [],
    modus: 'browser',
    dohAnbieter: 'cloudflare',
    bestaetigung: {
      name: 'Beraterin Beispiel',
      rolle: 'beauftragt',
      text: bestaetigungsText(D),
      zeit: zeit(0),
    },
    gestartet: zeit(0),
    beendet: zeit(2),
    abgebrochen: false,
    befunde: beispielBefunde(),
    protokoll: PROTOKOLL.map(([anfrage, ergebnis, dauerMs], i): Abruf => ({ zeit: zeit(i < 4 ? 0 : 1), art: 'dns', anfrage, ergebnis, dauerMs })),
  }
}

/** Feste Kennungen der Maßnahmen, damit der Beispielbetrieb immer gleich aussieht */
function kennungen() {
  let n = 0
  return () => `00000000-0000-4000-8000-0000000c${String(++n).padStart(4, '0')}`
}

/** Stand der Maßnahmen vier Wochen nach dem Interview (fiktiv) */
function bearbeite(m: Massnahme, heute: Datum): Massnahme {
  const a = m.quelle.art === 'anforderung' ? m.quelle.anforderungId : `${m.quelle.pruefId}`
  switch (a) {
    case 'A02':
      return { ...m, status: 'in_arbeit', verantwortlich: 'Erika Beispiel', notiz: 'Schulung mit dem IT-Service Muster für Anfang Dezember vereinbart.' }
    case 'A14':
      return { ...m, status: 'erledigt', erledigtAm: plusTage(heute, -10), verantwortlich: 'IT-Service Muster', notiz: 'Zweite Sicherung auf externer Festplatte, wöchentlich gewechselt.' }
    case 'spf':
    case 'dmarc':
      return { ...m, verantwortlich: 'IT-Service Muster' }
    default:
      return m
  }
}

export function beispielBetrieb(k: Katalog, heute: Datum): Betrieb {
  const datum = plusTage(heute, -28)
  const angelegt = `${plusTage(heute, -35)}T09:00:00.000Z`
  const abgeschlossenAm = `${plusTage(heute, -27)}T15:30:00.000Z`

  const antworten: Record<string, Antwort> = {}
  for (const a of k.anforderungen) {
    const [erfuellt, begruendung, nachweis] = ANTWORTEN[a.id] ?? [false, 'im Beispiel nicht erfasst']
    antworten[a.id] = { bewertung: erfuellt ? 'erfuellt' : 'nicht_erfuellt', begruendung, nachweis: nachweis ?? '', uebernommen: false }
  }

  let pruefung: Pruefung = {
    id: BEISPIEL_PRUEFUNG_ID,
    nr: 1,
    status: 'entwurf',
    katalogVersion: k.version,
    datum,
    vorgaengerId: null,
    berater: 'Beraterin Beispiel',
    teilnehmende: [
      { name: 'Erika Beispiel', rolle: 'geschaeftsfuehrung' },
      { name: 'Jonas Beispiel', rolle: 'it_intern' },
      { name: 'IT-Service Muster', rolle: 'it_extern' },
    ],
    vorfragen: Object.fromEntries(k.vorfragen.map((v) => [v.id, true])),
    antworten,
    vorbereitung: Object.fromEntries(k.vorbereitung.map((v) => [v.id, v.id !== 'notfallplan'])),
    aussen: beispielAussenpruefung(plusTage(heute, -29)),
    massnahmen: [],
    foerderhinweise: 'Landesförderung für Digitalisierung und IT-Sicherheit prüfen (Förderdatenbank des Bundes).',
    ergebnis: null,
    abgeschlossenAm: null,
    angelegt,
    geaendert: abgeschlossenAm,
  }
  // Maßnahmen wie beim Abschließen abgeleitet, danach fiktiv bearbeitet
  pruefung = gleicheMassnahmenAb(k, pruefung, new Date(abgeschlossenAm), kennungen())
  pruefung = {
    ...pruefung,
    massnahmen: pruefung.massnahmen.map((m) => bearbeite(m, heute)),
    status: 'abgeschlossen',
    ergebnis: berechneErgebnis(k, pruefung),
    abgeschlossenAm,
    geaendert: abgeschlossenAm,
  }

  return {
    id: BEISPIEL_BETRIEB_ID,
    name: 'Tischlerei Beispiel GmbH (fiktiv)',
    branche: 'Handwerk, Tischlerei',
    beschaeftigte: 14,
    anschrift: 'Musterweg 1, 12345 Musterstadt',
    ansprechpartner: [{ name: 'Erika Beispiel', funktion: 'Geschäftsführerin', email: 'erika@example.com', telefon: '' }],
    // reservierte Domain (RFC 2606), damit eine Außenprüfung keinen echten Betrieb trifft
    domain: D,
    dkimSelektoren: [],
    notiz: 'Fiktiver Betrieb zum Ausprobieren. Alle Angaben sind erfunden.',
    angelegt,
    geaendert: abgeschlossenAm,
    pruefungen: [pruefung],
  }
}
