/**
 * Datenmodell des Sicherheitschecks (Spezifikation, Abschnitt 4).
 * Alle Zeitpunkte in UTC, alle Kalendertage als 'JJJJ-MM-TT'.
 */

export const FORMAT_VERSION = 1

/** Kennung aus crypto.randomUUID() */
export type Id = string
/** Kalendertag 'JJJJ-MM-TT' */
export type Datum = string
/** Zeitpunkt ISO 8601 in UTC, z. B. '2026-11-11T13:05:00.000Z' */
export type Zeitpunkt = string

/* ---------- Katalog: statisch im Code (src/katalog), nur eigene Formulierungen ---------- */

export type ThemaId = 'organisation' | 'identitaet' | 'datensicherung' | 'patch' | 'schadprogramme' | 'systeme'

export interface Thema {
  id: ThemaId
  /** Reihenfolge 1–6 wie in der DIN SPEC */
  nr: number
  name: string
  /** Bausteine des IT-Grundschutz-Kompendiums (Edition 2023), z. B. ['CON.3'] */
  grundschutz: string[]
}

export interface Vorfrage {
  id: string
  /** eigene Formulierung, Antwort Ja/Nein */
  frage: string
  hilfe: string
}

export type Relevanz =
  | { art: 'immer' }
  | { art: 'vorfrage'; vorfrageId: string; relevantWenn: boolean }
  | { art: 'begruendet' }

export interface Anforderung {
  /** stabile Kennung der App, 'A01' bis 'A27'; ändert sich nie */
  id: string
  /** Nummer in der DIN SPEC 27076 (Phase 0) */
  normNr: string
  thema: ThemaId
  top: boolean
  /** eigene Kurzbezeichnung, höchstens 60 Zeichen */
  titel: string
  /** eigene Kurzfrage; die Leitfragen stehen nur in der Norm (3.2) */
  frage: string
  /** eigene Erläuterung: woran man Erfüllung erkennt */
  hilfe: string
  /** eigene Handlungsempfehlung bei Nichterfüllung */
  massnahme: string
  relevanz: Relevanz
  grundschutz: string[]
}

export interface Katalog {
  /** steigt bei jeder inhaltlichen Änderung, z. B. '2026.1' */
  version: string
  quelle: 'DIN SPEC 27076:2023-05'
  themen: Thema[]
  vorfragen: Vorfrage[]
  anforderungen: Anforderung[]
  /** Vorbereitungsliste fürs Vorgespräch */
  vorbereitung: { id: string; text: string }[]
}

/** Text zu einer Regel der Außenprüfung (src/katalog/regeltexte.ts) */
export interface Regeltext {
  /** z. B. 'SPF-04' */
  regel: string
  /** null bei Regeln für mehrere Prüfungen (HDR-00, BROWSER-01) */
  pruefId: PruefId | null
  stufe: Stufe
  titel: string
  /** Erklärung für Laien, 1–3 Sätze */
  erklaerung: string
  /** null bei ok, info, fehler, nicht_geprueft */
  massnahme: string | null
}

/* ---------- Gespeicherte Daten ---------- */

export interface Datenbestand {
  formatVersion: typeof FORMAT_VERSION
  einstellungen: Einstellungen
  betriebe: Betrieb[]
}

export type DohAnbieter = 'cloudflare' | 'google'
export type Darstellung = 'system' | 'hell' | 'dunkel'

export interface Einstellungen {
  berater: { name: string; firma: string; email: string; telefon: string }
  dohAnbieter: DohAnbieter
  darstellung: Darstellung
  /** letzter Export mit Umfang 'alles' */
  letzteSicherung: Zeitpunkt | null
}

export interface Person {
  name: string
  funktion: string
  email: string
  telefon: string
}

export interface Betrieb {
  id: Id
  name: string
  branche: string
  /** null = unbekannt */
  beschaeftigte: number | null
  anschrift: string
  ansprechpartner: Person[]
  /** registrierbare Domain als A-Label, klein, ohne Punkt am Ende (6.3); null = keine */
  domain: string | null
  /** höchstens 5, je 1–63 Zeichen pro Label */
  dkimSelektoren: string[]
  notiz: string
  angelegt: Zeitpunkt
  geaendert: Zeitpunkt
  /** nach nr aufsteigend */
  pruefungen: Pruefung[]
}

export type TeilnahmeRolle = 'geschaeftsfuehrung' | 'it_intern' | 'it_extern' | 'sonstige'

export interface Teilnahme {
  name: string
  rolle: TeilnahmeRolle
}

export type Bewertung = 'offen' | 'erfuellt' | 'nicht_erfuellt' | 'nicht_relevant'

export interface Antwort {
  bewertung: Bewertung
  /** Stichpunkte; Pflicht für jede Bewertung außer 'offen' */
  begruendung: string
  /** optional, z. B. 'Backup-Protokoll vom 03.11.2026 gesehen' */
  nachweis: string
  /** aus der Vorgängerprüfung übernommen und noch nicht bestätigt */
  uebernommen: boolean
}

export interface Pruefung {
  id: Id
  /** laufende Nummer je Betrieb, ab 1 */
  nr: number
  status: 'entwurf' | 'abgeschlossen'
  katalogVersion: string
  /** Tag des Interviews */
  datum: Datum
  vorgaengerId: Id | null
  berater: string
  teilnehmende: Teilnahme[]
  /** Schlüssel Vorfrage.id; null = nicht beantwortet */
  vorfragen: Record<string, boolean | null>
  /** Schlüssel Anforderung.id; enthält immer alle Anforderungen des Katalogs */
  antworten: Record<string, Antwort>
  /** Schlüssel aus Katalog.vorbereitung */
  vorbereitung: Record<string, boolean>
  aussen: Aussenpruefung | null
  massnahmen: Massnahme[]
  foerderhinweise: string
  /** beim Abschließen berechnet und eingefroren */
  ergebnis: Ergebnis | null
  abgeschlossenAm: Zeitpunkt | null
  angelegt: Zeitpunkt
  geaendert: Zeitpunkt
}

export interface ThemaErgebnis {
  roh: number
  maximal: number
  /** max(0, roh) / maximal; null wenn maximal = 0 */
  anteil: number | null
}

export interface Ergebnis {
  rohpunkte: number
  /** max(0, rohpunkte) */
  statuswert: number
  maximal: number
  /** Math.round(statuswert / maximal * 100); 0 wenn maximal = 0 */
  prozent: number
  jeThema: Record<ThemaId, ThemaErgebnis>
  /** Anforderung.id in Katalogreihenfolge */
  topNichtErfuellt: string[]
  nichtRelevant: string[]
  /** keine Person mit Rolle 'geschaeftsfuehrung' beteiligt */
  ohneGeschaeftsfuehrung: boolean
}

/* ---------- Außenprüfung ---------- */

export type Modus = 'browser' | 'desktop'

export type Stufe = 'ok' | 'info' | 'hinweis' | 'warnung' | 'kritisch' | 'fehler' | 'nicht_geprueft'

export type PruefId =
  | 'mx' | 'spf' | 'dmarc' | 'dkim' | 'mta_sts' | 'tls_rpt' | 'dnssec' | 'caa'
  | 'http_weiterleitung' | 'https_erreichbar' | 'zertifikat' | 'tls_version' | 'hsts'
  | 'csp' | 'x_content_type_options' | 'clickjacking' | 'referrer_policy' | 'x_xss_protection'
  | 'server_angaben' | 'cookies' | 'security_txt'

export interface Bestaetigung {
  name: string
  rolle: 'verantwortlich' | 'beauftragt'
  /** genauer Wortlaut, dem zugestimmt wurde (6.7) */
  text: string
  zeit: Zeitpunkt
}

/** Genau ein Befund je (pruefId, ziel). */
export interface Befund {
  pruefId: PruefId
  /** z. B. 'firma.de', 'www.firma.de', 'selector1._domainkey.firma.de' */
  ziel: string
  /** Stufe der Hauptregel = schwerste zutreffende Regel (6.5) */
  stufe: Stufe
  regel: string
  /** weitere zutreffende Regeln derselben Prüfung */
  weitere: { regel: string; stufe: Stufe }[]
  /** Anzeige, höchstens 300 Zeichen */
  messwert: string
  werte: Record<string, string | number | boolean | null>
}

export interface Abruf {
  zeit: Zeitpunkt
  art: 'dns' | 'http' | 'tls'
  /** z. B. 'TXT _dmarc.firma.de', 'GET https://firma.de/', 'TLS firma.de:443' */
  anfrage: string
  /** z. B. 'NOERROR, 1 Antwort', '301', 'TLS 1.3', 'Zeitüberschreitung' */
  ergebnis: string
  dauerMs: number
}

export interface Aussenpruefung {
  domain: string
  dkimSelektoren: string[]
  modus: Modus
  dohAnbieter: DohAnbieter
  bestaetigung: Bestaetigung
  gestartet: Zeitpunkt
  beendet: Zeitpunkt | null
  abgebrochen: boolean
  befunde: Befund[]
  protokoll: Abruf[]
}

/* ---------- Maßnahmen ---------- */

export type Prioritaet = 1 | 2 | 3

export type MassnahmeQuelle =
  | { art: 'anforderung'; anforderungId: string }
  | { art: 'befund'; pruefId: PruefId; ziel: string }

export type MassnahmeStatus = 'offen' | 'in_arbeit' | 'erledigt' | 'verworfen'

export interface Massnahme {
  id: Id
  quelle: MassnahmeQuelle
  titel: string
  /** automatisch nach 6.8 */
  prioritaet: Prioritaet
  /** gesetzt, wenn der Berater abweicht; dann ist begruendungManuell Pflicht */
  prioritaetManuell: Prioritaet | null
  begruendungManuell: string
  /** wird beim Anlegen gesetzt und danach nur vom Nutzer geändert */
  frist: Datum
  verantwortlich: string
  status: MassnahmeStatus
  notiz: string
  erledigtAm: Datum | null
  /** Ursache besteht nicht mehr (Anforderung erfüllt, Befund behoben) */
  ursacheEntfallen: boolean
}

/* ---------- Berechnet, nicht gespeichert ---------- */

export type Veraenderung = 'besser' | 'schlechter' | 'gleich' | 'neu' | 'entfallen' | 'nicht_vergleichbar'

export interface Vergleich {
  vorherId: Id
  statuswert: {
    vorher: number
    jetzt: number
    maximalVorher: number
    maximalJetzt: number
    prozentVorher: number
    prozentJetzt: number
    direktVergleichbar: boolean
  }
  anforderungen: { id: string; vorher: Bewertung; jetzt: Bewertung; veraenderung: Veraenderung }[]
  befunde: { pruefId: PruefId; ziel: string; vorher: Stufe | null; jetzt: Stufe | null; veraenderung: Veraenderung }[]
  massnahmenVorher: { erledigt: number; offen: number }
}

/* ---------- Netz (src/netz) ---------- */

export type DnsTyp = 'A' | 'AAAA' | 'MX' | 'TXT' | 'CAA' | 'SOA'

export interface DnsAntwort {
  /** DNS-Rcode: 0 NOERROR, 2 SERVFAIL, 3 NXDOMAIN */
  status: number
  ad: boolean
  /** Namen klein, ohne Punkt am Ende; TXT bereits nach 6.4 zusammengesetzt */
  antworten: { name: string; typ: number; ttl: number; daten: string }[]
  kommentar: string
}

export interface HttpAntwort {
  url: string
  status: number
  /** nur Kopfzeilen der Liste in 7.7; Namen klein; Mehrfachnennungen bleiben; Cookie-Werte entfernt */
  kopfzeilen: [string, string][]
  /** nur bei Pfaden unter /.well-known/, höchstens 65 536 Byte */
  text: string | null
  gekuerzt: boolean
}

export interface Zertifikat {
  inhaber: string
  aussteller: string
  /** DNS-Namen aus subjectAltName, klein */
  sans: string[]
  gueltigAb: Zeitpunkt
  gueltigBis: Zeitpunkt
  /** z. B. 'RSA 2048', 'EC P-256', 'Ed25519' */
  schluessel: string
  /** z. B. 'sha256WithRSAEncryption' */
  signatur: string
}

export interface TlsInfo {
  host: string
  version: 'TLS 1.3' | 'TLS 1.2'
  /** IANA-Name, z. B. 'TLS_AES_128_GCM_SHA256' */
  suite: string
  /** Kette und Zeit gültig gegen die Mozilla-Wurzeln (webpki-roots), Name unberücksichtigt (7.7) */
  vertrauenswuerdig: boolean
  namePasst: boolean
  /** Sperrstatus (CRL, OCSP) wird nicht geprüft */
  pruefFehler: null | {
    code: 'abgelaufen' | 'noch_nicht_gueltig' | 'unbekannte_stelle' | 'name' | 'signatur' | 'sonstiges'
    text: string
  }
  zertifikat: Zertifikat
  kettenlaenge: number
}

export interface NetzFehler {
  fehler: 'nicht_verfuegbar' | 'nicht_erlaubt' | 'zeitueberschreitung' | 'verbindung' | 'tls' | 'tls_version' | 'antwort'
  text: string
  /** HTTP-Status des DoH-Anbieters bei fehler 'antwort'; 5xx erlaubt einen Wiederholversuch (6.4) */
  httpStatus?: number
}

export interface Netz {
  modus: Modus
  dns(name: string, typ: DnsTyp, ohneDnssecPruefung?: boolean): Promise<DnsAntwort | NetzFehler>
  http(url: string): Promise<HttpAntwort | NetzFehler>
  tls(host: string): Promise<TlsInfo | NetzFehler>
}

/* ---------- Datei ---------- */

export type Umfang = 'alles' | 'betrieb'

export interface Verschluesselung {
  verfahren: 'AES-256-GCM'
  kdf: 'Argon2id'
  speicherKiB: number
  durchlaeufe: number
  parallelitaet: number
  /** 16 Byte, Base64 */
  salzB64: string
  /** 12 Byte, Base64 */
  ivB64: string
}

export interface Exportdatei {
  format: 'sicherheitscheck'
  formatVersion: typeof FORMAT_VERSION
  erstellt: Zeitpunkt
  /** z. B. 'Sicherheitscheck 0.1.0' */
  programm: string
  umfang: Umfang
  verschluesselung: null | Verschluesselung
  /** unverschlüsselt: Datenbestand; verschlüsselt: Base64 von Chiffrat mit Tag */
  inhalt: Datenbestand | string
}
