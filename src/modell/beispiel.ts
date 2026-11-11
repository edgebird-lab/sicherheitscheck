/**
 * Fiktiver Beispielbetrieb zum Ausprobieren und für die Bilder in der README (9.10).
 * Eine abgeschlossene Prüfung: 3 TOP erfüllt, 2 TOP nicht erfüllt, 15 Basis erfüllt,
 * 7 Basis nicht erfüllt → Statuswert 18 von 37 (49 %). Die README nennt diese Zahl;
 * beispiel.test.ts sichert sie.
 */
import { berechneErgebnis } from './bewertung'
import { plusTage } from './datum'
import type { Antwort, Betrieb, Datum, Katalog, Pruefung } from './typen'

export const BEISPIEL_BETRIEB_ID = '00000000-0000-4000-8000-00000000b001'
export const BEISPIEL_PRUEFUNG_ID = '00000000-0000-4000-8000-00000000a001'

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

export function beispielBetrieb(k: Katalog, heute: Datum): Betrieb {
  const datum = plusTage(heute, -28)
  const angelegt = `${plusTage(heute, -35)}T09:00:00.000Z`
  const abgeschlossenAm = `${plusTage(heute, -27)}T15:30:00.000Z`

  const antworten: Record<string, Antwort> = {}
  for (const a of k.anforderungen) {
    const [erfuellt, begruendung, nachweis] = ANTWORTEN[a.id] ?? [false, 'im Beispiel nicht erfasst']
    antworten[a.id] = { bewertung: erfuellt ? 'erfuellt' : 'nicht_erfuellt', begruendung, nachweis: nachweis ?? '', uebernommen: false }
  }

  const pruefung: Pruefung = {
    id: BEISPIEL_PRUEFUNG_ID,
    nr: 1,
    status: 'abgeschlossen',
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
    aussen: null,
    massnahmen: [],
    foerderhinweise: 'Landesförderung für Digitalisierung und IT-Sicherheit prüfen (Förderdatenbank des Bundes).',
    ergebnis: null,
    abgeschlossenAm,
    angelegt,
    geaendert: abgeschlossenAm,
  }
  pruefung.ergebnis = berechneErgebnis(k, pruefung)

  return {
    id: BEISPIEL_BETRIEB_ID,
    name: 'Tischlerei Beispiel GmbH (fiktiv)',
    branche: 'Handwerk, Tischlerei',
    beschaeftigte: 14,
    anschrift: 'Musterweg 1, 12345 Musterstadt',
    ansprechpartner: [{ name: 'Erika Beispiel', funktion: 'Geschäftsführerin', email: 'erika@example.com', telefon: '' }],
    // reservierte Domain (RFC 2606), damit eine Außenprüfung keinen echten Betrieb trifft
    domain: 'example.com',
    dkimSelektoren: [],
    notiz: 'Fiktiver Betrieb zum Ausprobieren. Alle Angaben sind erfunden.',
    angelegt,
    geaendert: abgeschlossenAm,
    pruefungen: [pruefung],
  }
}
