# Sicherheitscheck – Spezifikation

Version 0.1 · Stand 11.11.2026 · Ordner `C:\Users\Robin\Projekte\Apps\sicherheitscheck`

Gebaut wird nach dieser Datei. Vorbild für Stil, Technik und Qualität ist der Prozesslotse (`C:\Users\Robin\Projekte\Apps\prozesslotse`). Quellen stehen als [Q1] bis [Q15] in Abschnitt 12. Was nicht aus einer geöffneten Quelle stammt, ist als **eigene Festlegung**, **Annahme** oder offene Frage (F1 bis F15) markiert. Der Prüfvermerk am Ende nennt die Korrekturen der Fachprüfung.

---

## 1. Ziel und Nutzer

Der Sicherheitscheck führt einen IT-Berater Schritt für Schritt durch die Sicherheitsberatung nach DIN SPEC 27076 für Betriebe mit bis zu 50 Beschäftigten. Ergänzend prüft er E-Mail-Domain und Website des Kunden von außen, nur passiv und nur nach Bestätigung der Zuständigkeit. Ergebnis sind Statuswert, priorisierter Maßnahmenplan, druckbarer Bericht und bei Wiederholung ein Vergleich mit der letzten Prüfung. Hauptnutzer ist Robin als Berater von olbricht-digital; alle Kundendaten bleiben auf seinem Rechner. Fürs Portfolio zeigt die App Risikoanalyse, Maßnahmenplanung und den Bezug zum ISMS nach IT-Grundschutz.

---

## 2. Umfang

### 2.1 Version 0.1 (MVP)

- Mehrere Kundenbetriebe mit Stammdaten; je Betrieb beliebig viele Prüfungen als Verlauf.
- Geführter Ablauf in sieben Schritten: Betrieb, Vorgespräch, Interview, Außenprüfung, Auswertung, Maßnahmen, Bericht.
- Interview zu den 27 Anforderungen der DIN SPEC 27076 in eigenen Formulierungen, mit TOP-Kennzeichen, Relevanz und Begründung.
- Statuswert nach dem Punkteschema der DIN SPEC, Werte je Themenbereich, Netzdiagramm.
- Außenprüfung DNS (Browser und Windows-Programm): MX, SPF, DMARC, DKIM (nur mit bekanntem Selektor), MTA-STS-Eintrag, TLS-RPT, DNSSEC, CAA.
- Außenprüfung Website (nur Windows-Programm): Weiterleitung auf HTTPS, Erreichbarkeit, Zertifikat und Restlaufzeit, TLS-Version, HSTS, Sicherheits-Header, Cookie-Attribute, security.txt, MTA-STS-Richtlinie.
- Bestätigung der Zuständigkeit vor jedem Lauf; Protokoll aller Abrufe.
- Maßnahmenplan aus nicht erfüllten Anforderungen und Befunden, mit Priorität, Frist, Verantwortlichem und Status.
- Wiederholungsprüfung mit Vorbelegung und Vergleich zur letzten Prüfung.
- Bericht als Druckansicht; PDF über den Druckdialog bzw. direkt im Windows-Programm.
- Speicherung lokal (IndexedDB); Export und Import als Datei `.sicherheitscheck`, standardmäßig verschlüsselt (abschaltbar).
- Hell- und Dunkelmodus, vollständige Tastaturbedienung, Barrierefreiheit mit axe geprüft.
- Windows-Programm mit Tauri 2: Installer pro Benutzer, ohne Admin-Rechte.
- Fiktiver Beispielbetrieb zum Ausprobieren und für Bilder in der README.

### 2.2 Ausdrücklich später

- Website-Lauf im echten Browser (Drittanbieter, Cookies vor und nach Einwilligung, externe Schriften) und Barrierefreiheitsprüfung fremder Seiten mit axe-core.
- Prüfung, ob der Betrieb unter NIS2 fällt (braucht eigene Rechtsrecherche).
- SMTP-Prüfungen (STARTTLS, DANE/TLSA), Test alter TLS-Versionen und Cipher-Listen.
- Mehrere Domains je Betrieb; weitere Subdomains außer `www` und `mta-sts`.
- Automatische Wiederholung nach Zeitplan, Monatsbericht, Benachrichtigungen, Fristen als ICS.
- Vorlagen für Kunden (Notfallkarte, Backup-Regel).
- Zuordnung zu ISO/IEC 27001 Anhang A; Import aus der BSI-Webanwendung (Format unbekannt).
- DNS über HTTPS im Binärformat (RFC 8484) für weitere Anbieter oder einen eigenen Server.
- DKIM-Selektoren automatisch aus dem Mail-Anbieter ableiten.
- Server, Mehrbenutzerbetrieb, Synchronisation; Microsoft Store und Codesignatur; englische Oberfläche.

### 2.3 Nie

- Portscans, Schwachstellenscans, Anmeldeversuche, Formulareingaben, Crawling, Lasttests.
- Abrufe außerhalb der bestätigten Domain. Einzige Ausnahme sind DNS-Abfragen beim gewählten DoH-Anbieter.

### 2.4 Prüfung der Ausgangsidee

Die Idee stammt aus der Ideensammlung vom 10.11.2026 (Rang 6). Abweichungen:

| Ausgangsidee | Entscheidung | Grund |
|---|---|---|
| offene Ports prüfen (nmap) | gestrichen | Portscans sind aktiv; gewollt ist nur passive Prüfung |
| Python/FastAPI, PostgreSQL, Cron auf dem VPS | lokale App (Browser und Tauri) | Kundendaten sind sensibel; Prüfungen laufen vom Rechner des Beraters |
| sslyze, dnspython | DNS über HTTPS (TypeScript), TLS mit rustls (Rust) | ein Stack wie beim Prozesslotsen |
| NIS2-Prüfung, Website-Lauf, axe für Kundenseiten | später | Umfang |
| Ampel für den Check | keine Ampel für den Statuswert | die geöffneten Quellen nennen keine Schwellen; Stufen nur in der Außenprüfung |
| Bericht im Aufbau des Standards | bleibt; Außenprüfung als „Teil B, Zusatz“ | die Außenprüfung ist nicht Teil der DIN SPEC |
| – | neu: Abgrenzung zur BSI-Webanwendung | Das BSI stellt geschulten Dienstleistern eine kostenlose Webanwendung bereit [Q2]. Eigene Werkzeuge sind erlaubt [Q4]. Mehrwert hier: Außenprüfung, Verlauf, Maßnahmenverfolgung, lokal und offline. |

---

## 3. Fachliche Grundlagen

### 3.1 DIN SPEC 27076 (CyberRisikoCheck)

| Punkt | Inhalt | Quelle |
|---|---|---|
| Norm | DIN SPEC 27076:2023-05 „IT-Sicherheitsberatung für Klein- und Kleinstunternehmen“, 34 Seiten, Verfahren PAS, Status aktuell. Kostenloser Download nach Anmeldung bei DIN Media. | [Q1], [Q2] |
| Herkunft | Konsortium aus 21 Mitgliedern unter Leitung des BSI, stellvertretend BVMW; Projekt „mIT Standard sicher“, gefördert vom BMWK. | [Q2], [Q3] |
| Zielgruppe | Klein- und Kleinstunternehmen mit bis zu 50 Beschäftigten. | [Q3] |
| Ablauf | 1. Erstgespräch, 2. Erfassung des Ist-Zustands im Interview, 3. Auswertung und Bericht, 4. Präsentation. Interview 1 bis 2 Stunden, dafür wird ein Termin von 3 Stunden vereinbart. Die Geschäftsführung muss teilnehmen. | [Q2], [Q3] |
| Methode | Semistrukturiertes Leitfadeninterview mit vorgegebenen Leitfragen je Anforderung. Der Leitfaden verlangt, den Ist-Zustand „unbedingt“ anhand dieser Leitfragen zu erheben. Zu jeder Anforderung wird der Grund für Erfüllung oder Nichterfüllung stichpunktartig dokumentiert. | [Q3] |
| Katalog | 27 Anforderungen in 6 Themenbereichen: 22 Basis- und 5 TOP-Anforderungen. Grundlage ist der IT-Grundschutz des BSI. | [Q2], [Q3] |
| Themenbereiche | Organisation & Sensibilisierung · Identitäts- und Berechtigungsmanagement · Datensicherung · Patch- und Änderungsmanagement · Schutz vor Schadprogrammen · IT-Systeme und Netzwerke | [Q3] |
| Punkte | Basis: erfüllt 1, nicht erfüllt 0. TOP: erfüllt 3, nicht erfüllt −3. „Teilweise erfüllt“ gibt es nicht; teilweise oder ohne Aussage gilt als nicht erfüllt. | [Q3] |
| Statuswert | Summe der Punkte. Rechnerisch ist ein negativer Wert möglich; ausgewiesen wird mindestens 0. Maximal 37 Punkte, wenn alle Anforderungen relevant sind (22 × 1 + 5 × 3). | [Q3] |
| Nicht relevant | Irrelevante Anforderungen (Beispiel: Homeoffice, wenn niemand im Homeoffice arbeitet) werden nicht abgefragt. Ihre Punkte fallen aus dem Maximum; der Bericht nennt sie. | [Q3] |
| Bericht | Seite 1 zeigt das Ergebnis. Ein Spinnennetzdiagramm visualisiert den Statuswert. Dazu priorisierte Handlungsempfehlungen, Aufschlüsselung erfüllt/nicht erfüllt, Anhänge mit allen Empfehlungen und Förderhinweisen. Unterschrift von Geschäftsleitung und Dienstleister. Empfehlung für jede nicht erfüllte Anforderung, nach Dringlichkeit gegliedert. | [Q2], [Q3] |
| Kein Zertifikat | Der Check ist ausdrücklich keine Zertifizierung. | [Q2] |
| Berater | Beispiele für Nachweise: mindestens 1 Jahr Erfahrung mit Sicherheitsberatungen oder Audits, mindestens 3 Referenzprojekte mit Kleinbetrieben, Methodenwissen zum Leitfadeninterview. Eine Prüfung durch eine unabhängige Stelle ist nicht vorgesehen. | [Q3], [Q4] |
| BSI-Webanwendung | Kostenlos für geschulte Dienstleister. Die Nutzung ist freiwillig; eigene Werkzeuge sind erlaubt. | [Q2], [Q4] |
| Schulung | Kostenlos, etwa 2 Stunden, Präsenz oder online. Danach Bescheinigung, Logo nach Nutzungsbedingungen, Eintrag in die Dienstleisterliste, Zugang zur Webanwendung. Am 11.11.2026: Konzept in Überarbeitung, Anmeldung nicht möglich. | [Q4] |

**Die fünf TOP-Anforderungen** (eigene Kurzfassung nach [Q3]; Nummern folgen in Phase 0):

| Themenbereich | TOP-Anforderung |
|---|---|
| Organisation & Sensibilisierung | Die Geschäftsführung trägt die Gesamtverantwortung für Informationssicherheit. |
| Organisation & Sensibilisierung | Alle, die die IT nutzen, sind eingewiesen und erkennen verdächtige Vorgänge wie Phishing-Mails. |
| Datensicherung | Datensicherungen laufen in festgelegten, branchenabhängigen Abständen. |
| Patch- und Änderungsmanagement | Updates für IT-Systeme und Software werden eingespielt. |
| Schutz vor Schadprogrammen | Makros und aktive Inhalte sind standardmäßig deaktiviert. |

**Erst mit der Norm klärbar (Phase 0):** Nummern und Inhalte der 22 Basis-Anforderungen; Leitfragen; welche Anforderungen „nicht relevant“ sein dürfen und über welche Vorfragen; Achsen und Rechenweise des Spinnennetzdiagramms; Gliederung nach Dringlichkeit; weitere Pflichtangaben im Bericht. Für diese Punkte legt die Spezifikation **Annahmen** fest (6.1, 6.12, 6.13), die Phase 0 bestätigt oder korrigiert.

### 3.2 Urheberrecht und Name

- Die DIN SPEC ist ein privates Normwerk und kein amtliches Werk. Nach § 5 Abs. 3 UrhG bleibt das Urheberrecht an privaten Normwerken sogar dann bestehen, wenn Gesetze auf sie verweisen, ohne ihren Wortlaut wiederzugeben [Q5]. Kostenloser Download heißt nicht freie Nutzung.
- Für die Nutzung von DIN-SPEC-Inhalten in eigenen Anwendungen ist laut BSI das DIN bzw. DIN Media zuständig [Q4].
- **Festlegung:** Die App enthält keinen Normtext, keine Leitfragen und keine Handlungsempfehlungen aus der Norm. Sie übernimmt nur Nummer, Themenbereich, TOP-Kennzeichen und Punkteschema. Fragen, Erläuterungen und Maßnahmen sind eigene Formulierungen mit dem Verweis „DIN SPEC 27076, Anforderung ‹Nr.›“.
- Dass Nummern, Themennamen und Punkteschema frei nutzbar sind, ist eine **Annahme**, keine Rechtsberatung (F3).
- Der Berater hat die Norm beim Interview zur Hand und stellt deren Leitfragen [Q3]; die App ersetzt sie nicht. Die eigene Frage der App heißt deshalb „Kurzfrage“.
- Die PDF der Norm bleibt außerhalb des Repos (Ordner `normen/` in `.gitignore`).
- Name und Logo „CyberRisikoCheck“ richten sich nach den Nutzungsbedingungen des BSI [Q4]. App und Bericht zeigen das Logo nicht. Der Bericht nennt den Check sachlich „nach DIN SPEC 27076“ (F1, F2).

### 3.3 Prüfung von außen

| Thema | Festlegung aus der Quelle | Stand | Quelle |
|---|---|---|---|
| TLS-Versionen | TLS 1.3 soll bevorzugt werden. TLS 1.2 ist nur noch bis Ende 2031 empfohlen. TLS 1.0, TLS 1.1, SSL v2 und v3 sind nicht empfohlen. | TR-02102-2, Version 2026-01 vom 27.01.2026 | [Q6], [Q7] |
| Verschlüsselung der Exportdatei | Passwortbasierte Schlüsselableitung mit Argon2id; Parameter mit einem Experten abstimmen. GCM mit 96-Bit-IV und Prüfsumme von mindestens 96 Bit. | TR-02102-1, Version 2026-01 vom 23.01.2026 | [Q8] |
| Sicherheits-Header | HSTS `max-age=63072000; includeSubDomains; preload` (preload erst nach Prüfung). `frame-ancestors` in der CSP, sonst `X-Frame-Options: DENY`. `X-Content-Type-Options: nosniff`. `Referrer-Policy: strict-origin-when-cross-origin` ausdrücklich setzen. `X-XSS-Protection` weglassen oder `0`. `Server` ohne Aussagekraft, `X-Powered-By` entfernen. | ohne Datum, abgerufen 11.11.2026 | [Q9] |
| SPF | Genau ein Eintrag beginnend mit „v=spf1“, sonst permerror. Höchstens 10 Begriffe mit DNS-Abfrage (include, a, mx, ptr, exists, redirect). include auf einen Namen ohne SPF ergibt permerror. Ohne passendes all und ohne redirect gilt neutral. ptr soll nicht veröffentlicht werden. Mehrere Zeichenketten eines TXT-Eintrags ohne Leerzeichen verbinden. Qualifier fehlt = „+“. | RFC 7208, April 2014 | [Q10] |
| DMARC | TXT unter `_dmarc.<Domain>`. Einträge ohne „v=DMARC1“ am Anfang werden verworfen; bleiben keiner oder mehrere, gilt kein DMARC. `v` steht zuerst, `p` ist Pflicht (none, quarantine, reject), `pct` Standard 100. Ohne gültiges `p`, aber mit gültiger `rua`: wie `p=none`. | RFC 7489, März 2015 | [Q11] |
| MTA-STS | TXT `_mta-sts.<Domain>` beginnt mit „v=STSv1;“, `id` aus 1 bis 32 Buchstaben oder Ziffern, genau ein Eintrag. Richtlinie unter `https://mta-sts.<Domain>/.well-known/mta-sts.txt`: nur Status 200, keine Weiterleitung, gültiges Zertifikat, Typ sollte `text/plain` sein. Felder `version` (STSv1), `mode` (enforce, testing, none), `max_age` (≤ 31 557 600 s), `mx` (Pflicht außer bei none). `*.` ersetzt genau das linke Label. Bei enforce werden nicht passende MX nicht beliefert. | RFC 8461, September 2018 | [Q12] |
| DNS über HTTPS (JSON) | Parameter `name`, `type`, `cd` (1 = ohne DNSSEC-Prüfung), `edns_client_subnet`. Antwortfelder `Status`, `AD`, `Answer`, `Comment`. TXT kommt als ein String. | ohne Datum, abgerufen 11.11.2026 | [Q13] |
| Cloudflare-DoH | Mit curl geprüft: `Access-Control-Allow-Origin: *` (auch bei Google), AD-Flag vorhanden, `cd=1` wirkt. TXT steht bei Cloudflare in Anführungszeichen, bei Google ohne. CAA kommt bei beiden als `0 issue "pki.goog"`. Ein fehlender Untername (`_dmarc…`, `_smtp._tls…`) liefert je nach Zone `Status 3` (NXDOMAIN) oder `Status 0` ohne `Answer`. `Comment` ist bei Cloudflare eine Liste, bei Google ein Text. | 11.11.2026 | [Q14] |
| ISMS-Bezug | Bausteine des IT-Grundschutz-Kompendiums (siehe 3.5) | Edition 2023 | [Q15] |

### 3.4 Nicht geöffnete Standards

Für diese Spezifikation nicht geöffnet; die Regeln in Abschnitt 6 beruhen hier auf Fachwissen. Phase 0.4 gleicht sie mit dem Originaltext ab:

- RFC 6797 (HSTS), RFC 8460 (TLS-RPT), RFC 8659 (CAA), RFC 9116 (security.txt), RFC 7505 (Null-MX).
- RFC 6376 und RFC 8301 (DKIM, Schlüssellängen), RFC 9106 (Argon2), RFC 2606 und RFC 6761 (reservierte Namen für Testdaten).
- DMARCbis: Status unbekannt. Der Abruf beim IETF-Datatracker wurde am 11.11.2026 blockiert.

### 3.5 ISMS-Brücke (Bezug zum IT-Grundschutz)

Die Bausteinkürzel und -titel sind in [Q15] geprüft. Die Zuordnung zu den Themenbereichen ist ein **Vorschlag**; Robin prüft sie in Phase 4.5.

| Themenbereich | Bausteine (IT-Grundschutz-Kompendium, Edition 2023) |
|---|---|
| Organisation & Sensibilisierung | ISMS.1 Sicherheitsmanagement, ORP.1 Organisation, ORP.2 Personal, ORP.3 Sensibilisierung und Schulung zur Informationssicherheit, DER.2.1 Behandlung von Sicherheitsvorfällen, DER.4 Notfallmanagement |
| Identitäts- und Berechtigungsmanagement | ORP.4 Identitäts- und Berechtigungsmanagement |
| Datensicherung | CON.3 Datensicherungskonzept |
| Patch- und Änderungsmanagement | OPS.1.1.3 Patch- und Änderungsmanagement |
| Schutz vor Schadprogrammen | OPS.1.1.4 Schutz vor Schadprogrammen, APP.1.1 Office-Produkte |
| IT-Systeme und Netzwerke | NET.1.1 Netzarchitektur und -design, NET.2.1 WLAN-Betrieb, NET.3.2 Firewall, SYS.2.1 Allgemeiner Client, SYS.3.2.1 Allgemeine Smartphones und Tablets, OPS.1.2.5 Fernwartung |
| Außenprüfung (Zusatz) | APP.3.1 Webanwendungen und Webservices, APP.3.2 Webserver, APP.5.3 Allgemeiner E-Mail-Client und -Server, CON.1 Kryptokonzept |

---

## 4. Datenmodell

Datei `src/modell/typen.ts`. Vollständig für das MVP. Alle Zeitpunkte in UTC, alle Kalendertage als `JJJJ-MM-TT`.

```ts
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

export interface Einstellungen {
  berater: { name: string; firma: string; email: string; telefon: string }
  dohAnbieter: 'cloudflare' | 'google'
  darstellung: 'system' | 'hell' | 'dunkel'
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
  dohAnbieter: 'cloudflare' | 'google'
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
  status: 'offen' | 'in_arbeit' | 'erledigt' | 'verworfen'
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
}

export interface Netz {
  modus: Modus
  dns(name: string, typ: DnsTyp, ohneDnssecPruefung?: boolean): Promise<DnsAntwort | NetzFehler>
  http(url: string): Promise<HttpAntwort | NetzFehler>
  tls(host: string): Promise<TlsInfo | NetzFehler>
}

/* ---------- Datei ---------- */

export interface Exportdatei {
  format: 'sicherheitscheck'
  formatVersion: typeof FORMAT_VERSION
  erstellt: Zeitpunkt
  /** z. B. 'Sicherheitscheck 0.1.0' */
  programm: string
  umfang: 'alles' | 'betrieb'
  verschluesselung: null | {
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
  /** unverschlüsselt: Datenbestand; verschlüsselt: Base64 von Chiffrat mit Tag */
  inhalt: Datenbestand | string
}
```

---

## 5. Oberfläche und Ablauf

### 5.1 Rahmen

- Kopf: App-Name, Betrieb und Prüfung („Tischlerei Beispiel · Prüfung 2 · Entwurf“), Speicherstatus („gespeichert“), Einstellungen.
- Schrittleiste wie beim Prozesslotsen: Betrieb · Vorgespräch · Interview · Außenprüfung · Auswertung · Maßnahmen · Bericht. Jeder Schritt ist direkt anwählbar; ein Häkchen zeigt „vollständig“.
- Jede Stufe hat Symbol **und** Wort: in Ordnung, Information, Hinweis, Warnung, Kritisch, nicht prüfbar, nicht geprüft. Farbe ist nie das einzige Merkmal.
- Lernhinweise: Jede Anforderung und jede Regel hat einen aufklappbaren Text „Was heißt das?“.
- Darstellung hell, dunkel oder wie das System; Wahl in den Einstellungen.

### 5.2 Startseite

- **Zeigt:** Liste der Betriebe mit Branche, letzter Prüfung (Datum, „26 von 37 Punkten“), Zahl offener Maßnahmen, nächster Frist. Suchfeld.
- **Knöpfe:** Neuer Betrieb, Datei importieren, Sicherung exportieren, Beispielbetrieb laden, Einstellungen.
- **Hinweis:** Banner, wenn `letzteSicherung` fehlt oder älter als 30 Tage ist.
- **Leerer Zustand:** drei Sätze zum Zweck der App und die Knöpfe „Neuer Betrieb“ und „Beispielbetrieb laden“.

### 5.3 Schritt Betrieb

- **Fragt:** Name (Pflicht), Branche, Beschäftigte, Anschrift, Ansprechpartner (Liste), Domain (optional, geprüft nach 6.3), DKIM-Selektoren (optional, mit Hilfe „steht in einer gesendeten Mail im Kopf `DKIM-Signature` hinter `s=`“), Notiz.
- **Prüft:** Mehr als 50 Beschäftigte ergibt den Hinweis „Die DIN SPEC richtet sich an Betriebe bis 50 Beschäftigte.“
- **Zeigt:** bisherige Prüfungen (Nr., Datum, Status, Statuswert) und die Knöpfe „Neue Prüfung“, „Wiederholungsprüfung“ (nur wenn eine abgeschlossene Prüfung existiert), „Betrieb löschen“ (mit Bestätigung durch Eingabe des Namens).

### 5.4 Schritt Vorgespräch

- **Fragt:** Datum des Interviews (Pflicht, vorbelegt mit heute), Berater (aus den Einstellungen), Teilnehmende mit Rolle, Vorfragen (Ja/Nein), Vorbereitungsliste (Notfallplan, Datensicherungskonzept, Zugangs- und Berechtigungskonzept, Übersicht der IT-Systeme, Verträge mit IT-Dienstleistern; Endfassung in Phase 0).
- **Zeigt:** die vier Schritte der Beratung, Dauer des Interviews (1 bis 2 Stunden), Warnung, solange keine Person mit Rolle Geschäftsführung eingetragen ist.
- **Wirkt:** Weicht die Antwort einer Vorfrage von `relevantWenn` ab, blendet sie die abhängigen Anforderungen im Interview aus (6.1).

### 5.5 Schritt Interview

- **Aufbau:** links die sechs Themenbereiche mit Fortschritt („3 von 5“); rechts eine Fragekarte.
- **Fragekarte:** „Anforderung ‹Nr.› · ‹Themenbereich›“, bei TOP das Kennzeichen „TOP · zählt ±3 Punkte“. Darüber der Verweis „Leitfragen: DIN SPEC 27076, Anforderung ‹Nr.›“, den der Berater zuerst stellt. Darunter die eigene „Kurzfrage“ und aufklappbar „Darum geht es“ (hilfe).
- **Eingaben:** Bewertung als Optionsgruppe „Erfüllt“, „Nicht erfüllt“, „Nicht relevant“ (nur wenn erlaubt). Fester Hinweis: „Teilweise erfüllt oder unklar zählt als nicht erfüllt.“ Begründung in Stichpunkten (Pflicht), Nachweis (optional).
- **Wiederholung:** Kasten „Letztes Mal: ‹Bewertung› – ‹Begründung›“ mit Knopf „Unverändert bestätigen“.
- **Bedienung:** Zurück, Weiter, „Nächste offene“; Strg+Eingabe springt weiter. Alles per Tastatur erreichbar, sichtbarer Fokus.
- **Zeigt nicht:** laufende Punktzahl. Sie könnte das Gespräch beeinflussen; sie erscheint erst in der Auswertung (**eigene Festlegung**).

### 5.6 Schritt Außenprüfung

- **Zeigt vorab:** Domain aus dem Betrieb (änderbar, Prüfung nach 6.3), Modus („Browser: nur DNS-Prüfungen“ bzw. „Windows-Programm: DNS und Website“), DoH-Anbieter, geplante Abrufe („bis zu 40 DNS-Abfragen über Cloudflare, bis zu 32 HTTP-Abrufe und 3 TLS-Verbindungen zu firma.de, www.firma.de, mta-sts.firma.de“).
- **Fragt:** Rolle (verantwortlich oder beauftragt), Name (vorbelegt mit Berater), Kontrollkästchen mit dem Bestätigungstext aus 6.7. „Prüfung starten“ ist bis dahin gesperrt.
- **Während des Laufs:** Fortschritt je Gruppe, Knopf „Abbrechen“.
- **Ergebnis:** Gruppen E-Mail (mx, spf, dkim, dmarc, mta_sts, tls_rpt), Domain (dnssec, caa), Website (übrige). Je Befund Stufe, Titel, Messwert, „Was heißt das?“, Maßnahme. Darunter das Abrufprotokoll als aufklappbare Tabelle.
- **Leer:** „Optional. Ohne Außenprüfung entfällt Teil B des Berichts.“
- **Neuer Lauf:** ersetzt das Ergebnis dieser Prüfung nach Rückfrage; die Bestätigung ist erneut nötig.

### 5.7 Schritt Auswertung

- **Zeigt:** Statuswert groß („26 von 37 Punkten · 70 %“), Netzdiagramm mit Tabelle je Themenbereich, nicht erfüllte TOP-Anforderungen, nicht relevante Anforderungen mit Begründung, Zusammenfassung der Außenprüfung (Anzahl je Stufe).
- **Bei Wiederholung:** Vergleich nach 6.9 mit Statuswert vorher/jetzt und Listen „besser“, „schlechter“, „neu“, „entfallen“.
- **Berateransicht:** zusätzlich die Rohpunkte (auch negativ), im Bericht nicht.

### 5.8 Schritt Maßnahmen

- **Zeigt:** Gruppen „Sofort (Priorität 1)“, „Zeitnah (Priorität 2)“, „Geplant (Priorität 3)“, sortiert nach 6.8. Je Maßnahme Titel, Ursache (Anforderung ‹Nr.› oder Befund), Frist, Verantwortlich, Status, Notiz, Kennzeichen „Ursache entfallen“.
- **Fragt:** Status, Frist, Verantwortlich, Notiz; Priorität ändern nur mit Begründung.
- **Filter:** offen und in Arbeit / alle.

### 5.9 Schritt Bericht

- **Zeigt:** Vorschau im Druckbild (6.13).
- **Knöpfe:** „Drucken / als PDF“, „Prüfung abschließen“, „Wieder öffnen“ (mit Rückfrage).
- **Abschluss:** Fehler aus 6.2 erscheinen als Liste mit Sprungmarken zum betroffenen Schritt.

### 5.10 Einstellungen

Berater (Name, Firma, E-Mail, Telefon), DoH-Anbieter mit Datenschutzhinweis, Darstellung, „Sicherung exportieren“, „Alle Daten löschen“ (Bestätigung durch Eingabe von „LÖSCHEN“).

---

## 6. Regeln, Berechnungen und Prüfungen

Alle Funktionen sind rein (ohne React, ohne Netz) und bekommen `jetzt: Date` bzw. `heute: Datum` als Parameter.

### 6.1 Punkte und Statuswert

Für jede Anforderung `a` mit Antwort `b`:

- `punkte(a) = 0`, wenn `a` nicht relevant ist.
- sonst `punkte(a) = a.top ? 3 : 1`, wenn `b.bewertung = 'erfuellt'`.
- sonst (`nicht_erfuellt` oder `offen`) `punkte(a) = a.top ? −3 : 0`.
- `maximal = Σ (a.top ? 3 : 1)` über alle relevanten Anforderungen.
- `rohpunkte = Σ punkte(a)`; `statuswert = max(0, rohpunkte)`.
- `prozent = maximal > 0 ? Math.round(statuswert / maximal × 100) : 0`.
- Je Thema `t` gilt dasselbe nur für die Anforderungen von `t`; `anteil = maximal_t > 0 ? max(0, roh_t) / maximal_t : null` (**Annahme**, Phase 0.2).
- `topNichtErfuellt`: relevante TOP-Anforderungen mit Bewertung ungleich `erfuellt`, in Katalogreihenfolge.

Relevanz:

| `relevanz.art` | relevant, wenn | Bewertung „nicht relevant“ |
|---|---|---|
| `immer` | immer | nicht erlaubt; ein gespeicherter Wert zählt als `offen` und erzeugt eine Prüfmeldung |
| `vorfrage` | `vorfragen[vorfrageId]` ist `null` oder gleich `relevantWenn` | wird automatisch gesetzt, sobald die Vorfrage anders beantwortet ist; Begründung automatisch „Vorfrage ‹frage›: Nein“ bzw. „Ja“. Wechselt die Vorfrage zurück, wird die Antwort wieder `offen`. |
| `begruendet` | Bewertung ist nicht `nicht_relevant` | erlaubt, Begründung Pflicht |

### 6.2 Abschließen und wieder öffnen

Sperrende Fehler:

| Kennung | Bedingung | Meldung |
|---|---|---|
| A1 | `datum` fehlt | „Datum des Interviews fehlt.“ |
| A2 | eine Vorfrage ist `null` | „‹n› Vorfragen sind offen.“ |
| A3 | eine relevante Anforderung ist `offen` | „‹n› Anforderungen sind offen.“ |
| A4 | Bewertung ungleich `offen` und `begruendung.trim().length < 3` | „Begründung fehlt bei Anforderung ‹Nr.›.“ |
| A5 | eine Antwort hat `uebernommen = true` | „‹n› übernommene Antworten sind noch nicht bestätigt.“ |

Warnungen (Abschluss möglich):

| Kennung | Bedingung | Folge |
|---|---|---|
| W1 | keine Teilnahme mit Rolle `geschaeftsfuehrung` | `ergebnis.ohneGeschaeftsfuehrung = true`; Bericht vermerkt: „Die Geschäftsführung nahm nicht teil. Das weicht von der DIN SPEC ab.“ |
| W2 | keine Außenprüfung | Teil B entfällt |
| W3 | Außenprüfung mehr als 30 Tage vor `datum` | Hinweis im Bericht mit Datum der Außenprüfung |

Abschließen: Ergebnis berechnen und speichern, Maßnahmen abgleichen (6.8), `status = 'abgeschlossen'`, `abgeschlossenAm = jetzt`. Danach sind Antworten, Vorfragen und Außenprüfung schreibgeschützt. Maßnahmen bleiben bearbeitbar.

Wieder öffnen: nach Rückfrage `status = 'entwurf'`, `ergebnis = null`, `abgeschlossenAm = null`.

### 6.3 Domain-Eingabe

1. Leerzeichen am Rand entfernen; leer ergibt „Bitte eine Domain eingeben.“
2. Ohne `://` wird `http://` vorangestellt. `new URL(eingabe).hostname` liefert Kleinschreibung und Punycode (`müller-bau.de` → `xn--mller-bau-q9a.de`). Fehler ergibt „Keine gültige Adresse.“
3. Ein Punkt am Ende wird entfernt (`firma.de.` → `firma.de`).
4. `tldts.parse(host)`: `isIp` → „IP-Adressen werden nicht geprüft.“ `domain === null` → „Keine öffentliche Domain.“ `isIcann !== true` → „Keine öffentliche Domain.“ Es gibt keinen Testmodus: Ablauf- und E2E-Tests nutzen `example.com` (reserviert nach RFC 2606, laut PSL gültig); Regeltests bekommen `D` direkt.
5. `tldts.parse(host, { allowPrivateDomains: true }).isPrivate === true` → „Die Adresse gehört einem Plattformanbieter (z. B. github.io). Bitte die eigene Domain angeben.“
6. Prüfdomain `D = tldts.parse(host).domain`. Ist `host ≠ D`, erscheint „Geprüft wird ‹D› mit www und mta-sts.“
7. Hosts der Prüfung: `D`, `W = www.D`, `S = mta-sts.D`. HTTP- und TLS-Abrufe gehen nur an `D` und Namen, die auf `.D` enden.

Das Verhalten von tldts 7.4.21 ist am 11.11.2026 zweimal geprüft: `firma.github.io` ergibt `domain = 'github.io'` und mit privaten Domains `isPrivate = true`; `firma.local` und `firma.test` ergeben `isIcann = false`; `localhost` und `intranet` ergeben `domain = null`; `example.com` und `www.firma.co.uk` sind gültig; `[::1]` ergibt `isIp = true`; `firma.de.com` gilt als privat (bewusst abgelehnt).

### 6.4 DNS über HTTPS

| Anbieter | Anfrage |
|---|---|
| cloudflare (Standard, F4) | `GET https://cloudflare-dns.com/dns-query?name=‹name›&type=‹TYP›[&cd=1]`, Kopfzeile `accept: application/dns-json` |
| google | `GET https://dns.google/resolve?name=‹name›&type=‹TYP›[&cd=1]&edns_client_subnet=0.0.0.0/0` |

- Typnummern: A 1, SOA 6, MX 15, TXT 16, AAAA 28, CAA 257.
- Abbildung: `Status` → `status`, `AD` → `ad`, `Answer` → `antworten`, `Comment` → `kommentar` (Liste mit Leerzeichen verbinden).
- Namen in Antworten: klein, Punkt am Ende entfernen. Regeln nutzen nur Antworten mit dem angefragten Typ.
- TXT: Beginnt `data` mit `"`, ist es eine Folge von Zeichenketten in Anführungszeichen. Darin `\"` → `"`, `\\` → `\`, `\DDD` → Zeichen mit Dezimalcode DDD. Die Zeichenketten werden ohne Leerzeichen verbunden. Sonst wird `data` unverändert übernommen.
- Zeitlimit 5 s. Ein Wiederholversuch nach 500 ms bei Netzfehler oder HTTP 5xx. HTTP-Status ungleich 200 ergibt `NetzFehler 'antwort'`. Jeder Versuch steht als eigener Abruf im Protokoll und zählt gegen die Grenze (6.7).
- Gleiche Anfragen (Name, Typ, `cd`) stellt ein Lauf nur einmal; danach liefert ein Zwischenspeicher je Lauf das Ergebnis.
- DNS-Status: `0` ohne Antwort des Typs (NODATA) und `3` (NXDOMAIN) bei Unternamen wie `_dmarc.D` heißen „kein Eintrag“. `3` für `D` selbst behandelt MX-01. Jeder andere Status (z. B. 2 SERVFAIL, 5 REFUSED), `TC = true` oder ein `NetzFehler` heißt „Abfrage gescheitert“ (6.5).
- MX-Daten `"10 mx1.firma.de."` → Priorität 10, Host `mx1.firma.de`. CAA-Daten `0 issue "letsencrypt.org"` → Flags, Tag, Wert ohne Anführungszeichen.

### 6.5 Regeln E-Mail und DNS

**Grundsatz:** Je `(pruefId, ziel)` entsteht genau ein Befund. Hauptregel ist die schwerste zutreffende Regel. Reihenfolge: kritisch > warnung > hinweis > fehler > info > ok > nicht_geprueft. Bei gleicher Stufe gewinnt die Regel, die in der Tabelle zuerst steht. Alle anderen zutreffenden Regeln stehen in `weitere`. `ziel` ist bei DNS-Prüfungen immer `D`, bei DKIM `‹selektor›._domainkey.D`.

**Gescheiterte Abfrage (6.4):** Scheitert die Hauptabfrage einer DNS-Prüfung, entsteht nur Regel `‹Präfix›-00` mit Stufe `fehler` und Messwert „DNS-Abfrage gescheitert (‹Status oder Fehler›)“. Präfixe: MX, SPF, DMARC, DKIM, STS, RPT, CAA. Scheitert bei SPF eine include- oder redirect-Abfrage, gilt ebenfalls SPF-00 (temperror, kein permerror). DNSSEC hat eigene Regeln.

Die Stufen sind **eigene Festlegung**, begründet mit den Quellen in 3.3.

**MX** (Abfrage MX für D)

| Regel | Bedingung | Stufe |
|---|---|---|
| MX-01 | `status = 3` (Domain existiert nicht) | fehler; der Lauf bricht ab |
| MX-02 | genau ein MX mit Priorität 0 und Host `.` (Null-MX) | info: „Domain empfängt keine E-Mail“ |
| MX-03 | mindestens ein MX | info; Messwert: Liste nach Priorität, z. B. „10 a.firma.de, 20 b.firma.de“ |
| MX-04 | kein MX | info: „kein MX-Eintrag“ |

**SPF** (TXT für D)

Ablauf:

1. Kandidaten sind TXT-Einträge mit `/^v=spf1(\s|$)/i`.
2. Kein Kandidat → SPF-01. Mehr als einer → SPF-02, Ende.
3. Begriffe: `eintrag.trim().split(/\s+/).slice(1)`.
4. Modifikator: `/^([a-z][a-z0-9_.-]*)=(.*)$/i`. Ausgewertet wird nur `redirect`; andere werden ignoriert.
5. Mechanismus: `/^([+\-~?]?)(all|include|a|mx|ptr|ip4|ip6|exists)(?=$|[:/])(.*)$/i`. Anderes → SPF-10, Ende.
6. Zähler `lookups` erhöht sich um 1 je `include`, `a`, `mx`, `ptr`, `exists` und je angewendetem `redirect`. `a`, `mx`, `exists` werden nicht aufgelöst.
7. Enthält ein Begriff ein `%` (Makro), gilt SPF-11. `include:‹ziel›` mit Makro wird nicht aufgelöst. Sonst TXT für `ziel` abfragen: genau ein SPF-Eintrag → rekursiv auswerten; keiner oder mehrere → SPF-08.
8. `redirect=‹ziel›` gilt nur, wenn der Eintrag kein `all` enthält. Das `all` des Ziels wird dann zum wirksamen `all`.
9. `lookups > 10`, Tiefe > 10 oder ein Name, der im aktuellen Pfad schon vorkommt (Schleife) → SPF-07, Ende der Rekursion. Derselbe Name in zwei getrennten Zweigen ist keine Schleife; er zählt bei jedem Vorkommen, wird aber nur einmal abgefragt (6.4).
10. Wirksamer Qualifier: `all` des obersten Eintrags, sonst über `redirect`, sonst „kein all“.

| Regel | Bedingung | Stufe |
|---|---|---|
| SPF-01 | kein Eintrag | warnung |
| SPF-02 | mehrere Einträge (permerror) | warnung |
| SPF-07 | mehr als 10 Lookups oder Schleife (permerror) | warnung |
| SPF-08 | include- oder redirect-Ziel ohne genau einen SPF-Eintrag (permerror) | warnung |
| SPF-10 | unbekannter Begriff (permerror) | warnung |
| SPF-03 | wirksam `+all` oder `all` ohne Qualifier | kritisch |
| SPF-04 | wirksam `?all` oder kein all | warnung |
| SPF-05 | wirksam `~all` | ok |
| SPF-06 | wirksam `-all` | ok |
| SPF-09 | `ptr` kommt vor | hinweis |
| SPF-11 | Makro (`%`) nicht ausgewertet | hinweis |

`werte`: `lookups`, `qualifier`, `eintrag` (gekürzt). Bei einem permerror (SPF-02, -07, -08, -10) oder SPF-00 entfällt die Bewertung des Qualifiers.

**DMARC** (TXT für `_dmarc.D`)

1. Kandidaten: TXT-Einträge mit `/^[vV]\s*=\s*DMARC1\s*(;|$)/` (ohne Flag `i`). Der Wert `DMARC1` muss genau stimmen, sonst ist der ganze Eintrag zu ignorieren (RFC 7489, Abschnitt 6.3 [Q11]). Andere Einträge zählen als „verworfen“.
2. Tags: an `;` trennen, trimmen, Leere überspringen, am ersten `=` teilen, Name und Wert trimmen, Namen klein.

| Regel | Bedingung | Stufe |
|---|---|---|
| DMARC-08 | kein Kandidat, aber ein verworfener Eintrag passt auf `/^v\s*=\s*dmarc1/i` (z. B. `v=dmarc1`) | warnung: „Empfänger ignorieren diesen Eintrag; `DMARC1` groß schreiben.“ |
| DMARC-01 | kein Kandidat (Messwert nennt verworfene Einträge) | warnung |
| DMARC-02 | mehrere Kandidaten | warnung |
| DMARC-03 | `p` fehlt oder ist nicht none, quarantine, reject | warnung |
| DMARC-05 | `p=none` ohne `rua` | warnung |
| DMARC-04 | `p=none` mit `rua` | hinweis |
| DMARC-09 | `p` quarantine oder reject und `pct` vorhanden, aber nicht 100 | hinweis |
| DMARC-10 | `sp=none` bei `p` quarantine oder reject | hinweis |
| DMARC-12 | eine `rua`-Adresse beginnt nicht mit `mailto:` | hinweis |
| DMARC-11 | `p` quarantine oder reject ohne `rua` | info |
| DMARC-06 | `p=quarantine` | ok |
| DMARC-07 | `p=reject` | ok |

**DKIM** (TXT für `‹selektor›._domainkey.D`, je Selektor ein Befund)

| Regel | Bedingung | Stufe |
|---|---|---|
| DKIM-02 | kein Eintrag mit Tag `p` | warnung |
| DKIM-05 | RSA-Schlüssel kürzer als 1024 Bit | warnung |
| DKIM-03 | `p=` leer (Schlüssel widerrufen) | hinweis |
| DKIM-06 | RSA 1024 bis 2047 Bit | hinweis |
| DKIM-08 | Schlüssel nicht lesbar | hinweis |
| DKIM-01 | keine Selektoren bekannt (`ziel = D`) | info: „ohne Selektor nicht prüfbar“ |
| DKIM-04 | `k=ed25519` | ok |
| DKIM-07 | RSA ab 2048 Bit | ok |

Schlüssellänge: `p` aus Base64 dekodieren. Ist das erste Element der äußeren DER-SEQUENCE eine SEQUENCE, ist es SubjectPublicKeyInfo; der BIT STRING enthält das RSAPublicKey. Ist es ein INTEGER, ist es direkt RSAPublicKey (PKCS#1). Bitlänge = Bitlänge des Modulus ohne führendes Nullbyte. Grenzen 1024/2048 nach RFC 8301 (nicht geöffnet, Phase 0.4).

**MTA-STS** (TXT für `_mta-sts.D`; Richtlinie nur im Windows-Programm)

1. Kandidaten beginnen genau mit `v=STSv1;`. Felder an `;` trennen; `id` muss `/^[A-Za-z0-9]{1,32}$/` erfüllen.
2. Richtlinie: `GET https://S/.well-known/mta-sts.txt` ohne Weiterleitung.
3. Zeilen an `/\r?\n/` trennen, leere überspringen, am ersten `:` teilen, trimmen. Unbekannte Felder ignorieren. Bei mehrfachen Feldern außer `mx` gilt das erste.
4. Gültig, wenn `version = STSv1`, `mode` ∈ {enforce, testing, none}, `max_age` nur Ziffern und ≤ 31 557 600, mindestens ein `mx` außer bei none. Jedes `mx` erfüllt `/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/i`.
5. MX-Abgleich ohne Groß/klein: Ein Host passt zu `muster`, wenn beide gleich sind. Bei `muster = *.rest` passt er, wenn er auf `.rest` endet und genau ein Label mehr als `rest` hat.

| Regel | Bedingung | Stufe |
|---|---|---|
| STS-10 | mode enforce, mindestens ein MX passt nicht | kritisch |
| STS-02 | Eintrag ungültig oder mehrere Kandidaten | warnung |
| STS-03 | Richtlinie nicht abrufbar: Verbindungs- oder TLS-Fehler, Status ≠ 200, Weiterleitung | warnung |
| STS-05 | Richtlinie ungültig | warnung |
| STS-08 | mode testing, mindestens ein MX passt nicht | warnung |
| STS-04 | `content-type` beginnt nicht mit `text/plain` | hinweis |
| STS-07 | mode testing, alle MX passen | hinweis |
| STS-01 | kein Kandidat | info |
| STS-06 | mode none | info |
| STS-11 | Browser-Modus, Eintrag vorhanden: Richtlinie nicht geprüft | nicht_geprueft |
| STS-09 | mode enforce, alle MX passen | ok |

**TLS-RPT** (TXT für `_smtp._tls.D`)

| Regel | Bedingung | Stufe |
|---|---|---|
| RPT-02 | kein Eintrag, aber MTA-STS-Eintrag vorhanden | hinweis |
| RPT-03 | mehrere Einträge, `rua` fehlt oder eine Adresse beginnt nicht mit `mailto:` oder `https:` | hinweis |
| RPT-01 | kein Eintrag | info |
| RPT-04 | genau ein Eintrag beginnend mit `v=TLSRPTv1`, gültige `rua` | ok |

**DNSSEC** (SOA für D)

| Regel | Bedingung | Stufe |
|---|---|---|
| DNSSEC-03 | `status = 2`; dieselbe Abfrage mit `cd=1` liefert `status = 0` | kritisch: „Validierende Resolver erreichen die Domain nicht.“ |
| DNSSEC-02 | `status = 0`, `ad = false` | hinweis: „nicht signiert“ |
| DNSSEC-04 | `status = 2` auch mit `cd=1`, oder Netzfehler | fehler |
| DNSSEC-01 | `status = 0`, `ad = true` | ok |

**CAA** (CAA für D, dann jeden Elternnamen bis einschließlich TLD; der erste Name mit CAA-Einträgen gilt)

| Regel | Bedingung | Stufe |
|---|---|---|
| CAA-04 | Tag unbekannt und Flag 128 gesetzt | warnung |
| CAA-01 | kein CAA-Eintrag gefunden | hinweis |
| CAA-03 | Einträge vorhanden, aber kein `issue` oder `issuewild` | hinweis |
| CAA-02 | mindestens ein `issue` oder `issuewild`; Messwert: erlaubte Stellen | ok |

### 6.6 Regeln Website (nur Windows-Programm)

Im Browser-Modus entsteht je Website-Prüfung ein Befund mit Regel BROWSER-01, Stufe `nicht_geprueft`, Ziel D.

**Vorprüfung:** A und AAAA für D und W. Ein Host existiert, wenn mindestens eine Antwort vom angefragten Typ kommt. Existiert keiner, entsteht WEB-00 (info, „keine Website gefunden“) und die Website-Prüfungen entfallen. Scheitern die Abfragen eines Hosts (6.4), erhalten seine Website-Prüfungen WEB-09 (fehler, „Vorprüfung gescheitert“) statt eines Abrufs.

**Weiterleitungen folgen** (`folge(startUrl)`):

```
url = startUrl; kette = []
für i = 0 bis 5:
  r = netz.http(url)
  wenn NetzFehler: Ende mit Fehler
  kette.push(r)
  wenn r.status ∈ {301, 302, 303, 307, 308} und location vorhanden:
    nächste = new URL(location, url)
    wenn nächste.hostname weder D ist noch auf '.D' endet: Ende „fremd“ (nicht abrufen)
    url = nächste.href; weiter
  Ende „fertig“
Ende „zu lang“ (6 Abrufe)
```

**HTTP auf HTTPS** (`pruefId = http_weiterleitung`, je existierendem Host D und W, Start `http://host/`)

| Regel | Bedingung | Stufe |
|---|---|---|
| WEB-04 | Ende „fertig“, letzte URL beginnt mit `http:` (Seite unverschlüsselt erreichbar) | warnung |
| WEB-06 | Ende „zu lang“ | warnung |
| WEB-02 | erster Schritt 302, 303 oder 307 auf eine `https:`-URL | hinweis |
| WEB-03 | erster Schritt auf eine `http:`-URL, `https:` erst später | hinweis |
| WEB-05 | Ende „fremd“ (fremde Domain wird nicht abgerufen) | info |
| WEB-07 | Zeitüberschreitung oder Verbindungsfehler auf Port 80 | info |
| WEB-08 | anderer NetzFehler, z. B. `nicht_erlaubt` bei einer Weiterleitung auf einen anderen Port | fehler |
| WEB-01 | erster Schritt 301 oder 308 auf eine `https:`-URL | ok |

**HTTPS erreichbar** (`pruefId = https_erreichbar`, Start `https://host/`)

| Regel | Bedingung | Stufe |
|---|---|---|
| WEB-13 | NetzFehler `tls` oder `tls_version` | kritisch |
| WEB-12 | Zeitüberschreitung oder Verbindungsfehler | warnung |
| WEB-11 | Endstatus 4xx oder 5xx, oder Ende „zu lang“ | hinweis |
| WEB-14 | anderer NetzFehler (z. B. `nicht_erlaubt`, `antwort`) | fehler |
| WEB-10 | Endstatus 200 bis 399, oder Ende „fremd“ | ok |

**Zertifikat** (`pruefId = zertifikat`, `netz.tls(host)` für existierende D und W sowie S bei vorhandenem MTA-STS-Eintrag). `tage = Math.floor((gueltigBis − jetzt) / 86 400 000)`.

| Regel | Bedingung | Stufe |
|---|---|---|
| CERT-01 | `vertrauenswuerdig = false` und `pruefFehler.code` ∉ {abgelaufen, noch_nicht_gueltig} | kritisch |
| CERT-02 | `namePasst = false` | kritisch |
| CERT-03 | `tage < 0` | kritisch |
| CERT-04 | `0 ≤ tage < 7` | warnung |
| CERT-07 | `gueltigAb > jetzt` | warnung |
| CERT-05 | `7 ≤ tage < 14` | hinweis |
| CERT-08 | NetzFehler, kein Zertifikat gelesen | fehler |
| CERT-06 | keine andere CERT-Regel trifft zu | ok |

Messwert: „gültig bis 21.11.2026 (noch 9 Tage), Aussteller ‹…›“. Die Schwellen 7 und 14 Tage sind **eigene Festlegung** und stehen als Konstanten in `zertifikat.ts`. Der Regeltext zu CERT-01 nennt eine weitere mögliche Ursache: Ein Virenschutz oder Proxy bricht auf dem Beraterrechner TLS auf. Der Aussteller im Messwert verrät das.

**TLS-Version** (`pruefId = tls_version`, gleiche Hosts)

| Regel | Bedingung | Stufe |
|---|---|---|
| TLS-03 | NetzFehler `tls_version` (kein TLS 1.2 oder 1.3) | kritisch |
| TLS-02 | TLS 1.2 ausgehandelt | hinweis: „TLS 1.3 aktivieren; TLS 1.2 empfiehlt das BSI nur bis Ende 2031.“ |
| TLS-04 | anderer NetzFehler | fehler |
| TLS-01 | TLS 1.3 ausgehandelt | ok |

**HSTS** (`pruefId = hsts`, je Host an der **ersten** HTTPS-Antwort von `https://host/`, auch wenn sie weiterleitet)

Auswertung: erste Kopfzeile `strict-transport-security`. Direktiven an `;` trennen, trimmen, Leere überspringen. Name klein, Wert ohne umschließende Anführungszeichen. Gibt es keine HTTPS-Antwort, gilt HDR-00 (`nicht_geprueft`).

| Regel | Bedingung | Stufe |
|---|---|---|
| HSTS-01 | Kopfzeile fehlt | warnung |
| HSTS-05 | Direktive doppelt, oder `max-age` fehlt oder ist keine Ziffernfolge | warnung |
| HSTS-02 | `max-age = 0` | warnung |
| HSTS-03 | `max-age < 31 536 000` (1 Jahr) | hinweis |
| HSTS-04 | `max-age ≥ 31 536 000` | ok; `werte.includeSubDomains`, `werte.preload` |

**Sicherheits-Header** (an der Endantwort jeder Kette `https://host/`; gleiche End-URLs nur einmal; `ziel` = Host der End-URL). Endet die Kette mit Fehler, „fremd“ oder „zu lang“, erhalten alle sieben Header-Prüfungen für diesen Host Regel HDR-00 mit Stufe `nicht_geprueft` und `ziel` = Host.

| pruefId | Regel | Bedingung | Stufe |
|---|---|---|---|
| csp | CSP-01 | `content-security-policy` nicht leer | ok |
| csp | CSP-02 | nur `content-security-policy-report-only` | hinweis |
| csp | CSP-03 | keine CSP | hinweis |
| x_content_type_options | XCTO-01 | Wert (klein, getrimmt) = `nosniff` | ok |
| x_content_type_options | XCTO-02 | fehlt oder anderer Wert | hinweis |
| clickjacking | FRAME-01 | CSP enthält Direktive `frame-ancestors`, oder `x-frame-options` (groß) ∈ {DENY, SAMEORIGIN} | ok |
| clickjacking | FRAME-02 | sonst | hinweis |
| referrer_policy | REF-03 | letzter Wert der Liste ∈ {unsafe-url, no-referrer-when-downgrade} | hinweis |
| referrer_policy | REF-02 | fehlt | info |
| referrer_policy | REF-01 | anderer Wert | ok |
| x_xss_protection | XXSS-02 | vorhanden und beginnt nicht mit `0` | hinweis |
| x_xss_protection | XXSS-01 | fehlt oder beginnt mit `0` | ok |
| server_angaben | SRV-02 | `server` enthält eine Ziffer, oder `x-powered-by` vorhanden | hinweis |
| server_angaben | SRV-01 | sonst | ok |
| cookies | COOKIE-02 | mindestens ein `set-cookie` ohne Attribut `Secure`; Messwert: Cookie-Namen | hinweis |
| cookies | COOKIE-00 | kein `set-cookie` | info |
| cookies | COOKIE-01 | alle mit `Secure` | ok |

**security.txt** (`pruefId = security_txt`, `GET https://D/.well-known/security.txt`, Weiterleitungen innerhalb von D wie oben)

| Regel | Bedingung | Stufe |
|---|---|---|
| SECTXT-03 | Status 200, aber `content-type` beginnt nicht mit `text/plain`, kein `Contact:` oder nicht genau ein `Expires:` | hinweis |
| SECTXT-04 | `Expires` liegt vor `jetzt` | hinweis |
| SECTXT-01 | Status ungleich 200 | info |
| SECTXT-02 | Status 200, `text/plain`, mindestens ein `Contact:`, genau ein `Expires:` in der Zukunft | ok |

Feldnamen ohne Groß/klein; Format nach RFC 9116 (nicht geöffnet, Phase 0.4).

### 6.7 Ablauf der Außenprüfung

**Bestätigungstext** (wird mit Name, Rolle und Zeit gespeichert und im Bericht gedruckt):

> „Ich bestätige, dass ich für die Domain ‹D› verantwortlich bin oder vom Inhaber mit dieser Prüfung beauftragt wurde. Die Prüfung ruft nur öffentliche DNS-Einträge, die Startseite und zwei Standarddateien ab, so wie es ein Besucher oder ein Mailserver auch tut.“

Reihenfolge:

1. Domain prüfen (6.3), Bestätigung prüfen. Im Windows-Programm: `freigabe_setzen(D)` (7.7).
2. DNS: MX → SPF (mit Rekursion) → DMARC → DKIM → MTA-STS → TLS-RPT → DNSSEC → CAA → A/AAAA für D und W. Höchstens 4 Abfragen gleichzeitig.
3. Nur Windows-Programm: TLS für D, W und gegebenenfalls S, nacheinander.
4. Nur Windows-Programm: HTTP-Ketten `http://D/`, `http://W/`, `https://D/`, `https://W/`, dann security.txt, dann MTA-STS-Richtlinie. Nacheinander, mindestens 250 ms Abstand zwischen zwei Abrufen.
5. Regeln anwenden, Befunde und Protokoll speichern, Maßnahmen abgleichen (6.8).

Grenzen je Lauf (**eigene Festlegung**):

| Größe | Grenze |
|---|---|
| DNS-Abfragen | 40 |
| HTTP-Abrufe | 32 |
| TLS-Verbindungen | 3 |
| Zeit je DNS-Abfrage | 5 s, ein Wiederholversuch |
| Zeit je HTTP-Abruf | Verbindung 5 s, gesamt 10 s |
| Zeit je TLS-Verbindung | 10 s |
| Zeit je Lauf | 120 s |

Die Grenzen sind Parameter des Ablaufs mit diesen Standardwerten, damit Tests sie verkleinern können. Wird eine Grenze erreicht, enden die übrigen Prüfungen mit Stufe `fehler` und Text „Grenze erreicht“. Abbrechen setzt `abgebrochen = true`; offene Prüfungen enden mit `fehler` und Text „abgebrochen“. Jeder Abruf erscheint genau einmal im Protokoll.

### 6.8 Maßnahmen und Priorität

| Ursache | Priorität | Frist ab `Pruefung.datum` |
|---|---|---|
| TOP-Anforderung nicht erfüllt | 1 | 14 Tage |
| Befund kritisch | 1 | 14 Tage |
| Basis-Anforderung nicht erfüllt | 2 | 90 Tage |
| Befund warnung | 2 | 90 Tage |
| Befund hinweis | 3 | 180 Tage |
| info, ok, fehler, nicht_geprueft | keine Maßnahme | – |

Prioritäten und Fristen sind **eigene Festlegung** (F6). Die Dringlichkeitsgliederung der Norm klärt Phase 0.2. Fristrechnung: `Date.UTC(J, M−1, T) + n × 86 400 000 ms` (2026-11-11 + 14 = 2026-11-25; + 90 = 2027-02-09; + 180 = 2027-05-10).

Titel: bei Anforderungen `Anforderung.titel`; bei Befunden `Regeltext.titel` der Hauptregel und „(‹ziel›)“. Die Maßnahmentexte weiterer Regeln mit Stufe hinweis oder schwerer erscheinen als Unterpunkte.

**Sortierung:**

1. wirksame Priorität (`prioritaetManuell ?? prioritaet`) aufsteigend,
2. Anforderungen vor Befunden,
3. Anforderungen: TOP vor Basis, dann `Thema.nr`, dann Katalogreihenfolge,
4. Befunde: Stufe absteigend, dann Reihenfolge der `PruefId` im Typ, dann `ziel` alphabetisch,
5. `id`.

**Abgleich** (idempotent; beim Öffnen des Schritts Maßnahmen, nach jeder Außenprüfung, beim Abschließen):

- Soll-Menge: relevante Anforderungen mit `nicht_erfuellt` und Befunde mit Stufe kritisch, warnung oder hinweis. Schlüssel: `anforderungId` bzw. `(pruefId, ziel)`.
- Soll ohne Maßnahme → neue Maßnahme (Status offen, Frist nach Tabelle).
- Soll mit Maßnahme → `prioritaet` und `titel` aktualisieren, `ursacheEntfallen = false`.
- Maßnahme ohne Soll → entfernen, wenn unberührt (Status offen, `verantwortlich`, `notiz` leer, `prioritaetManuell = null`); sonst `ursacheEntfallen = true`.
- Ausnahme für Maßnahmen aus Befunden: Sie gelten nur als „ohne Soll“, wenn ein neuer Lauf die Ursache widerlegt. Dazu braucht die aktuelle Prüfung eine nicht abgebrochene Außenprüfung mit einem Befund `(pruefId, ziel)` der Stufe ok oder info. Fehlt die Außenprüfung oder der Befund, oder hat er Stufe fehler oder nicht_geprueft, bleibt die Maßnahme unverändert. Sonst verschwänden übernommene Maßnahmen einer Wiederholungsprüfung (6.10) schon vor dem neuen Lauf.

### 6.9 Vergleich mit der letzten Prüfung

- Vorgänger: `vorgaengerId`, sonst die letzte abgeschlossene Prüfung mit kleinerer `nr`.
- `direktVergleichbar = (maximalVorher = maximalJetzt)`. Sonst vergleicht die Anzeige Prozentwerte und nennt den Grund („Relevanz geändert“).
- Anforderungen nach `id`: Wert 1 für erfüllt, 0 für nicht erfüllt oder offen, keiner für nicht relevant. Beide ohne Wert → gleich. Einer ohne Wert → nicht_vergleichbar. 0 → 1 besser, 1 → 0 schlechter, sonst gleich.
- Befunde nach `(pruefId, ziel)`: Rang ok 0, info 0, hinweis 1, warnung 2, kritisch 3; fehler und nicht_geprueft ohne Rang. Nur jetzt → neu. Nur vorher → entfallen. Einer ohne Rang → nicht_vergleichbar. Rang sinkt → besser, steigt → schlechter, sonst gleich.
- `massnahmenVorher`: erledigt vs. offen oder in Arbeit.

### 6.10 Wiederholungsprüfung

- Nur möglich, wenn der Betrieb eine abgeschlossene Prüfung hat; Vorgänger ist die letzte davon.
- Neu: `nr = max(nr) + 1`, `datum = heute`, `vorgaengerId`, aktuelle `katalogVersion`, Berater aus den Einstellungen.
- Übernommen: Teilnehmende, Vorfragen, Förderhinweise, Vorbereitung. Antworten (Bewertung, Begründung, Nachweis) mit `uebernommen = true`, nur für IDs im aktuellen Katalog; neue Anforderungen beginnen `offen`.
- Maßnahmen mit Status offen oder in Arbeit werden mit neuer `id` und unveränderten Feldern übernommen.
- Nicht übernommen: Außenprüfung, Ergebnis, `abgeschlossenAm`.
- „Unverändert bestätigen“ oder jede Änderung an Bewertung oder Begründung setzt `uebernommen = false`.

### 6.11 Export und Import

- Umfang „alles“ (Datenbestand) oder „betrieb“ (ein Betrieb). Dateinamen: `Sicherheitscheck-Sicherung-2026-11-11.sicherheitscheck` bzw. `Sicherheitscheck-‹Betrieb›-2026-11-11.sicherheitscheck` (Zeichen außer Buchstaben, Ziffern und `-` werden zu `-`). Verschlüsselte Dateien schlägt die App ohne Betriebsnamen vor (`Sicherheitscheck-Betrieb-2026-11-11.sicherheitscheck`), weil schon der Name verrät, wer geprüft wurde.
- Verschlüsselung standardmäßig an (F5). Passwort mindestens 12 Zeichen, zweimal einzugeben, ohne Wiederherstellung.
- Schlüssel: Argon2id mit 65 536 KiB Speicher, 3 Durchläufen, Parallelität 1, 32 Byte Ausgabe, Salz 16 Byte zufällig. Die Parameter sind **eigene Festlegung**; das BSI verlangt Abstimmung mit einem Experten [Q8]. Phase 0.4 gleicht sie mit RFC 9106 ab. Sie stehen in der Datei und lassen sich später erhöhen.
- Verschlüsselung: AES-256-GCM über Web Crypto, IV 12 Byte zufällig, Tag 128 Bit. Zusätzlich authentisierte Daten: UTF-8 von `sicherheitscheck;‹formatVersion›;‹erstellt›;‹umfang›`. Klartext: UTF-8 von `JSON.stringify(inhalt)`. Base64 mit Auffüllung. Jeder Export erzeugt neues Salz und neuen IV.
- Argon2id läuft in einem Web Worker. Ziel: unter 5 s auf Robins Laptop. `krypto.ts` ist ohne Worker aufrufbar und so in Vitest (Node 24, Web Crypto vorhanden) testbar; `krypto.worker.ts` ist nur die Hülle.
- Import: Datei bis 50 MB, in dieser Reihenfolge:
  1. JSON lesen und `format` prüfen.
  2. `formatVersion` größer → „Die Datei stammt aus einer neueren Version.“
  3. Entschlüsseln; die Kopfdaten der Datei bilden die zusätzlich authentisierten Daten.
  4. Erst danach bei kleinerer `formatVersion` migrieren.
  5. Mit `pruefeDatenbestand` prüfen (Muster: `src/modell/speicher.ts` im Prozesslotsen).

  Bei jedem Fehler bleibt der Bestand unverändert.
- Zusammenführen je Betrieb: unbekannte `id` → hinzufügen. Bekannte `id` → Rückfrage „ersetzen“, „als Kopie“ (neue IDs für Betrieb, Prüfungen und Maßnahmen, Name mit „(Kopie)“) oder „überspringen“.
- Einstellungen werden nur bei Umfang „alles“ und ausdrücklicher Wahl übernommen.

### 6.12 Netzdiagramm (**Annahme**, Phase 0.2)

- SVG, `viewBox 0 0 300 300`, Mittelpunkt (150, 150), Radius 100.
- Sechs Achsen in `Thema.nr`-Reihenfolge, Achse i bei Winkel θ = (i − 1) × 60°, beginnend oben, im Uhrzeigersinn.
- Punkt: (150 + 100 · anteil · sin θ, 150 − 100 · anteil · cos θ). Ringe bei 25, 50, 75 und 100 %.
- `anteil = null`: Punkt im Mittelpunkt, Beschriftung mit Zusatz „(nicht bewertet)“.
- Barrierefrei: `role="img"`, `<title>`, und daneben eine Tabelle mit denselben Werten.

### 6.13 Bericht (**Annahme**, Abgleich in Phase 0.2)

Druck auf A4 hoch, immer helle Farben (unabhängig von der Darstellung), Kopfzeile „Vertraulich · ‹Betrieb› · ‹Datum›“, Seitenumbruch vor jedem Teil. Punkte 1 bis 3 bilden **Teil A – Ergebnis nach DIN SPEC 27076**.

1. **Seite 1, Ergebnis:** Betrieb, Datum, Berater, Teilnehmende; Statuswert „‹x› von ‹max› Punkten (‹p› %)“; Netzdiagramm; nicht erfüllte TOP-Anforderungen; die fünf wichtigsten Maßnahmen; Satz „Der Check ist keine Zertifizierung.“; Vermerk nach W1.
2. **Ergebnis je Anforderung:** Tabelle Nr., Themenbereich, TOP, Kurzbezeichnung, Ergebnis, Punkte, Begründung.
3. **Handlungsempfehlungen** zu allen nicht erfüllten Anforderungen, nach Priorität.
4. **Teil B – Prüfung von außen (Zusatz, nicht Teil der DIN SPEC 27076):** Zeitpunkt, Modus, Bestätigung, Anzahl je Stufe, Befunde mit Erklärung und Maßnahme, Grenzen der Prüfung.
5. **Teil C – Maßnahmenplan:** Priorität, Maßnahme, Frist, Verantwortlich, Status.
6. **Vergleich** mit der letzten Prüfung, falls vorhanden.
7. **Anhang:** nicht bewertete Anforderungen mit Begründung; Fördermöglichkeiten (Freitext und Links zur Förderdatenbank des Bundes und zur Transferstelle Cybersicherheit); ISMS-Brücke (3.5); Methodik und Grenzen; Abrufprotokoll; Unterschriftsfelder für Geschäftsleitung und Berater mit Ort und Datum (laut Leitfaden „essenziell“ [Q3]).

---

## 7. Technik

### 7.1 Stack

- Web-App wie beim Prozesslotsen: React 19, TypeScript 7, Vite 8, Vitest 5, Playwright 1.65 mit axe, oxlint, GitHub Actions.
- Windows-Programm: Tauri 2.12 mit WebView2, NSIS-Installer pro Benutzer. Tauri 3.0.0-alpha.6 existiert, wird aber nicht genutzt.
- Rust 1.99.1 ist auf dem Laptop installiert (geprüft am 11.11.2026); tauri 2.12.5 verlangt mindestens Rust 1.90.
- Kein Server, keine Datenbank außer IndexedDB, keine Telemetrie.

### 7.2 Bibliotheken

Versionen und Lizenzen geprüft am 11.11.2026 mit `npm view ‹paket› version license` bzw. `cargo info ‹crate›`; bei der Fachprüfung alle erneut abgefragt (stimmen). `@types/node` hat neuere Hauptversionen (26.x); 24.19.2 passt zu Node 24.

**npm, Laufzeit**

| Paket | Version | Lizenz | Zweck |
|---|---|---|---|
| react, react-dom | 19.3.1 | MIT | Oberfläche |
| tldts | 7.4.21 | MIT | Public Suffix List: registrierbare Domain, Plattformdomains |
| idb | 8.0.4 | ISC | IndexedDB mit Promises |
| @noble/hashes | 2.4.0 | MIT | Argon2id in reinem JavaScript |
| @tauri-apps/api | 2.12.4 | Apache-2.0 OR MIT | Brücke zu Rust, nur im Windows-Programm, dynamisch geladen |

**npm, Entwicklung**

| Paket | Version | Lizenz |
|---|---|---|
| vite | 8.3.7 | MIT |
| @vitejs/plugin-react | 6.3.0 | MIT |
| typescript | 7.0.2 | Apache-2.0 |
| vitest | 5.1.0 | MIT |
| @playwright/test | 1.65.0 | Apache-2.0 |
| @axe-core/playwright | 4.14.0 | MPL-2.0 |
| oxlint | 1.93.0 | MIT |
| @types/react, @types/react-dom | 19.3.0 | MIT |
| @types/node | 24.19.2 (passend zu Node 24) | MIT |
| @tauri-apps/cli | 2.12.4 | Apache-2.0 OR MIT |

Bewusst nicht genutzt:

- `@tauri-apps/plugin-http` 2.9.0 (MIT OR Apache-2.0): Die Oberfläche bräuchte eine Freigabe aller URLs, und Zertifikatsdaten fehlen. Eigene Rust-Befehle geben nur die nötigen Rechte.
- `hash-wasm` 4.13.0 (MIT): schneller, braucht aber WebAssembly und damit `'wasm-unsafe-eval'` in der CSP.
- `@tauri-apps/plugin-dialog` 2.8.4 (MIT OR Apache-2.0): Dateidialoge öffnet wie im Prozesslotsen der Rust-Teil (Crate `tauri-plugin-dialog`). Die Oberfläche braucht daher weder das npm-Paket noch Dialog-Rechte.

**Rust (Cargo)**

| Crate | Version | Lizenz | Zweck |
|---|---|---|---|
| tauri | 2.12.5 | Apache-2.0 OR MIT | Programmrahmen |
| tauri-build | 2.7.4 | Apache-2.0 OR MIT | Build |
| tauri-plugin-dialog | 2.8.4 | Apache-2.0 OR MIT | Dateidialoge |
| tauri-plugin-single-instance | 2.5.5 | Apache-2.0 OR MIT | nur ein Programmfenster |
| rustls | 0.23.46 | Apache-2.0 OR ISC OR MIT | TLS-Handshake für `tls_info`; `default-features = false`, Features `ring`, `std`, `tls12`, `logging` |
| ring | 0.17.14 | Apache-2.0 AND ISC | Kryptoanbieter für rustls und reqwest (statt aws-lc-rs, um zusätzliche Build-Werkzeuge zu vermeiden; Phase 5.1 prüft: `cargo tree -i aws-lc-sys` findet nichts) |
| webpki-roots | 1.0.12 | CDLA-Permissive-2.0 | Mozilla-Wurzelzertifikate, reproduzierbare Prüfung |
| x509-parser | 0.18.1 | MIT OR Apache-2.0 | Zertifikatsfelder lesen |
| reqwest | 0.13.5 | MIT OR Apache-2.0 | HTTP ohne Weiterleitung; `default-features = false`, Feature `rustls-no-provider` (bringt `rustls-platform-verifier` mit). Zertifikate prüft eine vorkonfigurierte rustls-`ClientConfig` mit webpki-roots statt des Plattform-Prüfers, damit `http_abruf`, `doh_abfrage` und `tls_info` dieselben Wurzeln nutzen. |
| psl | 2.1.250 | MIT/Apache-2.0 | Public Suffix List in Rust: `freigabe_setzen` nimmt nur registrierbare Domains an (zweite Sperre neben 6.3) |
| tokio | 1.54.1 | MIT | Laufzeit (über Tauri vorhanden), in Tests `macros`, `rt-multi-thread` |
| url | 2.5.8 | MIT OR Apache-2.0 | URL-Prüfung |
| serde / serde_json | 1.0.229 / 1.0.154 | MIT OR Apache-2.0 | Daten an die Oberfläche |
| webview2-com / windows | 0.39.1 / 0.62.2 | MIT / MIT OR Apache-2.0 | PDF über WebView2 wie im Prozesslotsen; Versionen passend zu Tauri halten |
| rcgen | 0.14.10 | MIT OR Apache-2.0 | nur Tests: Zertifikate erzeugen |

Hinweis: `cargo info rustls` zeigt 0.24.0-dev.2, `cargo info tauri` 3.0.0-alpha.6. Beide werden nicht genutzt; die Versionen werden mit `rustls = "0.23"` und `tauri = "2"` festgehalten.

### 7.3 Ordnerstruktur

```
sicherheitscheck/
├─ docs/            spezifikation.md, katalog-abgleich.md, regeln.md, datenmodell.md, bilder/
├─ normen/          DIN-SPEC-PDF, nur lokal (.gitignore)
├─ src/
│  ├─ katalog/      themen.ts, vorfragen.ts, anforderungen.ts, regeltexte.ts
│  ├─ modell/       typen.ts, bewertung.ts, operationen.ts, massnahmen.ts, vergleich.ts, beispiel.ts
│  ├─ pruefung/     domain.ts, dns.ts, mx.ts, spf.ts, dmarc.ts, dkim.ts, mtasts.ts, tlsrpt.ts,
│  │                dnssec.ts, caa.ts, web.ts, hsts.ts, header.ts, zertifikat.ts, sectxt.ts,
│  │                stufen.ts, ablauf.ts
│  ├─ netz/         schnittstelle.ts, browser.ts, desktop.ts (nur dynamisch), testnetz.ts
│  ├─ speicher/     pruefen.ts, migration.ts, idb.ts, datei.ts, krypto.ts, krypto.worker.ts
│  ├─ ui/           App.tsx, schritte/*.tsx, Netzdiagramm.tsx, Bericht.tsx, druck.css
│  └─ main.tsx
├─ testdaten/       dns/, http/, README.md (Herkunft)
├─ scripts/         fixtures-aufnehmen.mjs, readme-bilder.mjs
├─ e2e/             *.spec.ts
└─ src-tauri/       Cargo.toml (Workspace), src/ (Befehle, Dateien, PDF), netzpruefung/ (Crate ohne Tauri)
```

Fachlogik in `src/katalog`, `src/modell`, `src/pruefung`, `src/speicher` kennt kein React und ist vollständig getestet. Die Oberfläche liegt in `src/ui`.

### 7.4 Speicherung

- IndexedDB-Datenbank `sicherheitscheck`, Version 1. Objektspeicher `betriebe` (keyPath `id`) und `meta` (Schlüssel `einstellungen`, `formatVersion`).
- Jede Änderung schreibt den betroffenen Betrieb vollständig, verzögert um 400 ms. Ausstehende Schreibvorgänge werden vor dem Schließen abgeschlossen: im Browser bei `pagehide` und `visibilitychange`, im Windows-Programm über `onCloseRequested` → speichern → `destroy()`.
- Browser-Modus: beim Start `navigator.storage.persist()` anfordern, damit der Browser die Daten nicht bei Platzmangel löscht; das Ergebnis zeigen die Einstellungen.
- Beim Laden prüft `pruefeDatenbestand` jeden Betrieb. Fehlerhafte werden übersprungen und gemeldet, nicht stillschweigend gelöscht.
- Browser-Modus: `navigator.locks.request('sicherheitscheck', { ifAvailable: true })`. Ist die Sperre belegt, zeigt die App „Bereits in einem anderen Tab geöffnet“ und speichert nicht.
- Windows-Programm: dieselbe IndexedDB im WebView2-Profil des Programms. Der Ursprung der Seite (`http://tauri.localhost`) darf sich nie ändern, sonst sind die Daten nicht mehr erreichbar. Deshalb stehen `identifier` und `useHttpsScheme: false` (Tauri-Standard) ab Version 0.1.0 fest. Vor einer Deinstallation erinnert die README an die Sicherung.

### 7.5 Export, Import und Bericht

- Dateiformat und Verschlüsselung nach 4 (`Exportdatei`) und 6.11. Endung `.sicherheitscheck`, Inhalt JSON in UTF-8.
- Browser: Download über Blob, Import über Dateiauswahl.
- Windows-Programm: Dialoge und Dateibefehle wie in `src-tauri/src/lib.rs` des Prozesslotsen 0.2.0 (`oeffnen`, `speichern_unter`, `start_datei`; Dialoge öffnet Rust), Dateizuordnung `.sicherheitscheck` mit Rolle Editor. Ein Doppelklick auf eine Datei startet den Import mit Rückfrage (6.11).
- Bericht: Druck-CSS (`druck.css`). Browser über `window.print()`. Windows-Programm direkt als PDF über WebView2 `PrintToPdf` (Befehl `als_pdf` wie im Prozesslotsen).

### 7.6 Windows-Programm (Tauri 2)

- Grundlage: das gebaute und getestete `src-tauri` des Prozesslotsen 0.2.0 (nicht der ungetestete Ordner `docs/windows-prototyp`) samt `scripts/desktop-test.mjs` und `src-tauri/windows/installer-test.ps1`.
- `tauri.conf.json`: `productName` „Sicherheitscheck“, `identifier` `de.olbricht-digital.sicherheitscheck`, NSIS `installMode: currentUser`, Sprache Deutsch, `freezePrototype: false`.
- Phase 5.1 prüft im Debug-Build `window.isSecureContext === true`. Web Crypto, `crypto.randomUUID` und `navigator.locks` brauchen das.
- Den Installer führt kein Agent auf Robins Rechner aus (Regel aus dem Prozesslotsen). Installation und Deinstallation prüft die CI; lokal testet `npm run desktop:test` den Debug-Build ohne Installation.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src ipc: http://ipc.localhost; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.
- Eigene Befehle sind nur über Rechte erreichbar: `build.rs` meldet sie mit `AppManifest::new().commands(&[…])` an (Muster Prozesslotse). Capabilities des Hauptfensters: `core:default`, `core:window:allow-set-title`, `core:window:allow-destroy`, `allow-freigabe-setzen`, `allow-doh-abfrage`, `allow-http-abruf`, `allow-tls-info`, `allow-start-datei`, `allow-oeffnen`, `allow-speichern-unter`, `allow-als-pdf`. Keine Dialog-Rechte, keine Plugins für HTTP, Dateisystem oder Shell.
- Beim Start: `rustls::crypto::ring::default_provider().install_default()`.
- Cargo-Workspace: Crate `netzpruefung` (ohne Tauri, enthält Zielprüfung, DoH, HTTP, TLS) und das Programm-Crate mit den Tauri-Befehlen. So laufen die Netztests mit `cargo test -p netzpruefung` auch unter Linux in der CI.

### 7.7 Rust-Befehle

| Befehl (TypeScript) | Rückgabe | Regeln |
|---|---|---|
| `invoke('freigabe_setzen', { domain })` | – | Rust prüft die Syntax: höchstens 253 Zeichen, mindestens ein Punkt, Labels 1–63 Zeichen aus `a-z0-9-`, keine IP-Adresse. Zusätzlich muss `psl::domain_str(domain)` genau `domain` ergeben; `de`, `co.uk` oder `www.firma.de` werden abgelehnt. Die vollständige Prüfung (6.3) macht vorher die Oberfläche. Die Freigabe gilt 15 Minuten; eine neue ersetzt die alte. |
| `invoke('doh_abfrage', { anbieter, name, typ, ohnePruefung })` | JSON-Text der DoH-Antwort | `anbieter` ∈ {cloudflare, google} mit festen URLs aus 6.4; `typ` ∈ {A, AAAA, MX, TXT, CAA, SOA}; `name` höchstens 253 Zeichen, Labels 1–63 Zeichen aus `a-z0-9-_`; Antwort höchstens 65 536 Byte |
| `invoke('http_abruf', { url })` | `HttpAntwort` | siehe unten |
| `invoke('tls_info', { host })` | `TlsInfo` | siehe unten |

Fehler kommen als `{ fehler, text }` (Typ `NetzFehler`) zurück.

**Zielprüfung (für `http_abruf` und `tls_info`):**

- Host ist D oder endet auf `.D` einer gültigen Freigabe; sonst `nicht_erlaubt`.
- Schema `http` oder `https`, kein Benutzer/Passwort, nur Standardport, Pfad mit Abfrage höchstens 2048 Zeichen.
- Auflösen über das System. **Alle** Adressen müssen öffentlich sein. Gesperrt: IPv4 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24, 192.0.2.0/24, 192.88.99.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24, 224.0.0.0/4, 240.0.0.0/4. IPv6 nur aus 2000::/3 (globale Unicast-Adressen); darin gesperrt 2001::/32 (Teredo), 2001:2::/48, 2001:db8::/32 und 2002::/16 (6to4, enthält IPv4). Damit sind auch ::1, fc00::/7, fe80::/10, ff00::/8 und NAT64 (64:ff9b::/96) gesperrt. IPv4-gemappte Adressen (::ffff:0:0/96) gelten nach ihrer IPv4-Adresse.
- Verbindung nur zu den geprüften Adressen (`resolve_to_addrs`), damit ein zweites Auflösen nichts ändert.

**`http_abruf`:** nur GET, kein Körper, keine Cookies, `.no_proxy()`, `redirect::Policy::none()`, Verbindung 5 s, gesamt 10 s, TLS-Prüfung gegen webpki-roots (7.2). User-Agent `Sicherheitscheck/0.1 (passive Pruefung)`. Den Körper liest der Befehl nur bei Pfaden unter `/.well-known/`, höchstens 65 536 Byte (`gekuerzt` bei mehr). Zurück gehen nur diese Kopfzeilen: `location`, `content-type`, `strict-transport-security`, `content-security-policy`, `content-security-policy-report-only`, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `x-xss-protection`, `server`, `x-powered-by`, `set-cookie`. Bei `set-cookie` wird der Wert durch `…` ersetzt (`sid=…; Secure; HttpOnly`). Fehlerzuordnung: Zeitüberschreitung → `zeitueberschreitung`; `rustls::Error` in der Fehlerkette → `tls`; Verbindungsfehler → `verbindung`; sonst `antwort`.

**`tls_info`:** TCP zu Port 443 einer geprüften Adresse mit 5 s Zeitlimit, Lesen/Schreiben 10 s, in `spawn_blocking`. rustls mit TLS 1.3 und 1.2, SNI = Host. Ein eigener `ServerCertVerifier` ruft den `WebPkiServerVerifier` (webpki-roots) auf, merkt sich das Ergebnis und lässt den Handshake immer weiterlaufen. Signaturprüfungen im Handshake reicht er unverändert durch. Nach dem Handshake: `close_notify`, keine Anwendungsdaten.

- `vertrauenswuerdig`: Prüfung ohne Fehler, oder einziger Fehler ist „Name passt nicht“ (`CertificateError::NotValidForName` bzw. `NotValidForNameContext`). rustls 0.23 prüft Kette und Zeit vor dem Namen; dieser Fehler heißt also, dass Kette und Zeit stimmen. Eine zweite Prüfung entfällt. T-R11 und T-R14 sichern diese Annahme ab.
- `namePasst`: SAN-DNS-Namen gegen Host; `*.rest` passt auf genau ein zusätzliches linkes Label. Ohne SAN: `false`.
- Fehlercodes: abgelaufen, noch_nicht_gueltig, unbekannte_stelle (auch fehlendes Zwischenzertifikat), name, signatur, sonstiges. Sperrlisten und OCSP prüft die App nicht.
- Alert „protocol_version“ oder `PeerIncompatible` → NetzFehler `tls_version`.
- Felder aus x509-parser; `suite` als IANA-Name.

### 7.8 Browser-Modus

- Gleiche Oberfläche; `netz/browser.ts` fragt DoH mit `fetch` ab. `http` und `tls` liefern `NetzFehler 'nicht_verfuegbar'`.
- CSP als Meta-Tag nur im Produktions-Build (Vite-Plugin mit `apply: 'build'`), sonst blockiert sie den Entwicklungsserver: `default-src 'self'; connect-src 'self' https://cloudflare-dns.com https://dns.google; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'`.
- `netz/desktop.ts` wird nur per dynamischem Import geladen, wenn `window.__TAURI_INTERNALS__` existiert.

### 7.9 CI

Drei Workflows wie beim Prozesslotsen:

- `ci.yml` auf `ubuntu-latest` bei jedem Push: `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test` (Chrome). Zusätzlich `cargo test -p netzpruefung` in `src-tauri`.
- `windows.yml` auf `windows-latest`, nur bei Änderungen an `src-tauri/**`, `src/netz/**`, `package*.json` oder von Hand: Rust-Tests, Programm und Installer bauen, Installer-Test (still installieren, Dateizuordnung prüfen, still deinstallieren).
- `release.yml` bei Tags `v*`: Release-Entwurf mit Installer, Veröffentlichung nur von Hand. Das Repo bleibt privat (F11).

---

## 8. Sicherheit und Datenschutz

**Schutzbedarf:** Interviewantworten und Befunde beschreiben Schwachstellen eines Betriebs. Sie sind Geschäftsgeheimnisse des Kunden und für Angreifer wertvoll.

| Risiko | Maßnahme |
|---|---|
| Daten verlassen den Rechner | keine Telemetrie, keine Fremdressourcen, Schriften lokal; CSP wie in 7.6 und 7.8 |
| Exportdatei geht verloren | Verschlüsselung standardmäßig an (6.11) |
| Gerät wird gestohlen | Empfehlung in der README: BitLocker und Bildschirmsperre. Die App verschlüsselt IndexedDB nicht (**eigene Festlegung**: Passwortverlust wäre Datenverlust). |
| Missbrauch gegen fremde Domains | Bestätigung vor jedem Lauf, Freigabe in Rust für 15 Minuten (mit eigener PSL-Prüfung), nur Domain und Subdomains, Protokoll, Grenzen aus 6.7 |
| Falscher Befund durch TLS-Prüfung eines Virenschutzes oder Proxys auf dem Beraterrechner | Aussteller im Messwert, Hinweis im Regeltext CERT-01 und in „Methodik und Grenzen“; M-01 prüft Robins Rechner |
| Zugriff auf interne Netze | Rust sperrt private und besondere Adressbereiche (7.7) und verbindet nur zu geprüften Adressen |
| Fremde Inhalte gelangen in die Daten | nur ausgewählte Kopfzeilen; Cookie-Werte entfernt; Seiteninhalt nur bei security.txt und mta-sts.txt, höchstens 64 KiB, nur als Text angezeigt |
| Webview erhält zu viele Rechte | keine Plugins für HTTP, Dateisystem oder Shell; eigene Befehle nur mit ausdrücklichem Recht (7.6); Dateizugriff nur über Dialoge, die Rust öffnet (Muster Prozesslotse) |
| Lieferkette | wenige Abhängigkeiten, Lockdateien, Dependabot-Hinweise im privaten Repo, Lizenzliste der Drittanbieter (darunter CDLA-Permissive-2.0 für webpki-roots) |

**Datenschutz (DSGVO):**

- Personenbezogen sind Ansprechpartner, Teilnehmende, Berater und die Unterschriftsfelder. Die Außenprüfung kann Personendaten enthalten: Domainnamen von Einzelunternehmern und E-Mail-Adressen aus DMARC-, TLS-RPT- und security.txt-Einträgen. Diese stehen in Befunden und Bericht wie gelesen und werden nicht weitergegeben.
- Der DoH-Anbieter sieht die abgefragten Namen und die IP-Adresse des Beraters. Google erhält `edns_client_subnet=0.0.0.0/0`, damit keine Netzangaben weitergehen [Q13]. Beide Anbieter sitzen in den USA (F4).
- Löschen: „Betrieb löschen“ entfernt alle Prüfungen des Betriebs; „Alle Daten löschen“ leert die IndexedDB.
- Rechtsgrundlage, Aufbewahrungsfrist der Berichte und die Frage nach einem AV-Vertrag sind offen (F9).

**Haftung und Recht:** Der Bericht enthält den Abschnitt „Methodik und Grenzen“. Kernsätze: Momentaufnahme; die passive Prüfung findet nicht alle Schwachstellen; kein Zertifikat; keine Rechtsberatung (F10). Nicht geprüft werden alte TLS-Versionen, der Sperrstatus von Zertifikaten und Mailserver per SMTP. Die Bestätigung in der App ersetzt keinen Auftrag: Bei Kunden sollte der schriftliche Auftrag Domain und Zeitraum der Außenprüfung nennen (F15). Die App bewertet keine Rechtslage (DSGVO, NIS2, TDDDG).

---

## 9. Tests

Ziel wie beim Prozesslotsen: Fachlogik vollständig mit Vitest getestet, Abläufe mit Playwright, Barrierefreiheit mit axe, Netzcode mit `cargo test`. Kein Test greift auf echte Domains zu; die Unit-Tests nutzen `testnetz.ts` mit Fixtures, die E2E-Tests fangen DoH mit `page.route` ab und brechen jede andere fremde Anfrage ab. Ablauf- und E2E-Tests prüfen `example.com` (6.3).

### 9.1 Katalog und Bewertung

| ID | Fall | Erwartung |
|---|---|---|
| T-K01 | Katalog | 27 Anforderungen; `id` und `normNr` eindeutig |
| T-K02 | TOP | genau 5: 2 im Thema organisation, je 1 in datensicherung, patch, schadprogramme |
| T-K03 | Themen | 6 Themen mit `nr` 1–6; jedes hat mindestens eine Anforderung; Maximum bei voller Relevanz 37; jede Vorfrage-Referenz existiert |
| T-B01 | alle erfüllt | roh 37, Statuswert 37 von 37, 100 % |
| T-B02 | alle nicht erfüllt | roh −15, Statuswert 0 von 37, 0 % |
| T-B03 | nur die 5 TOP erfüllt | 15 von 37, 41 % |
| T-B04 | nur die 22 Basis erfüllt | roh 22 − 15 = 7, 7 von 37, 19 % |
| T-B05 | alles außer einer TOP erfüllt | 31 von 37, 84 % |
| T-B06 | eine Basis nicht relevant, Rest erfüllt | 36 von 36, 100 % |
| T-B07 | 24 von 37 | 65 % (64,86 gerundet) |
| T-B08 | alle offen | wie nicht erfüllt: roh −15, Statuswert 0 |
| T-B09 | Testkatalog: Thema mit 1 TOP nicht erfüllt, 2 Basis erfüllt | roh −1, maximal 5, anteil 0 |
| T-B10 | Thema vollständig nicht relevant | anteil `null` |
| T-B11 | Vorfrage auf „Nein“, dann zurück auf „Ja“ | abhängige Anforderungen erst nicht relevant mit Begründung „Vorfrage …: Nein“, danach wieder offen |
| T-B12 | `nicht_relevant` bei Relevanz `immer` | zählt als offen, Prüfmeldung |

### 9.2 Abschluss, Wiederholung, Speicher, Datei

| ID | Fall | Erwartung |
|---|---|---|
| T-O01 | Abschluss mit 3 offenen Anforderungen | Fehler A3 „3 Anforderungen sind offen.“ |
| T-O02 | Begründung „ “ bei erfüllter Anforderung | Fehler A4 mit Nummer |
| T-O03 | übernommene, unbestätigte Antwort | Fehler A5 |
| T-O04 | ohne Geschäftsführung | Abschluss möglich, `ohneGeschaeftsfuehrung = true` |
| T-O05 | Abschluss, danach Katalogtext geändert | gespeichertes Ergebnis unverändert |
| T-O06 | Wiederholungsprüfung | `nr + 1`, `vorgaengerId` gesetzt, Antworten mit `uebernommen = true`, offene Maßnahmen mit neuen IDs, `aussen = null` |
| T-L01 | gültiger Datenbestand laden | unverändert |
| T-L02 | Betrieb 2 ohne Namen | übrige geladen, Meldung „Betrieb 2: Name fehlt“ |
| T-L03 | `formatVersion` 2 | Fehler „Die Daten stammen aus einer neueren Version.“ |
| T-E01 | Export/Import unverschlüsselt | Datenbestand tief gleich |
| T-E02 | Export/Import verschlüsselt | tief gleich; Dateitext enthält den Betriebsnamen nicht |
| T-E03 | falsches Passwort | Fehler „Passwort falsch oder Datei beschädigt“, Bestand unverändert |
| T-E04 | `erstellt` in der Datei geändert | Entschlüsselung scheitert (zusätzlich authentisierte Daten) |
| T-E05 | `formatVersion` 99 | Fehler „Die Datei stammt aus einer neueren Version.“ |
| T-E06 | Import mit bekannter Betriebs-ID, Wahl „als Kopie“ | neue IDs für Betrieb, Prüfungen, Maßnahmen; Name endet auf „(Kopie)“ |
| T-E07 | `umfang` in der Datei von `betrieb` auf `alles` geändert | Entschlüsselung scheitert, Bestand unverändert |
| T-E08 | Dateiname für verschlüsselten Export eines Betriebs | `Sicherheitscheck-Betrieb-2026-11-11.sicherheitscheck`, ohne Betriebsnamen |
| T-E09 | verschlüsselte Datei mit `formatVersion` 0 (Migrationsfall) | erst entschlüsselt, dann migriert, dann geprüft |

### 9.3 Domain und DNS

| ID | Eingabe | Erwartung |
|---|---|---|
| T-D01 | `"  HTTPS://WWW.Firma.DE/pfad  "` (mit Leerzeichen am Rand) | D = `firma.de`, Hinweis „Geprüft wird firma.de …“ |
| T-D02 | `müller-bau.de` | `xn--mller-bau-q9a.de` |
| T-D03 | `192.168.2.105` | Fehler „IP-Adressen werden nicht geprüft.“ |
| T-D04 | `localhost`, `intranet` | Fehler „Keine öffentliche Domain.“ |
| T-D05 | `firma.local` | Fehler „Keine öffentliche Domain.“ |
| T-D06 | `firma.github.io` | Fehler Plattformanbieter |
| T-D07 | `shop.firma.co.uk` | D = `firma.co.uk` mit Hinweis |
| T-D08 | `Firma.DE.` | `firma.de` |
| T-N01 | Cloudflare-TXT `"\"v=spf1 -all\""` (JSON) | `v=spf1 -all` |
| T-N02 | Google-TXT `v=spf1 -all` | `v=spf1 -all` |
| T-N03 | `"v=spf1 include:a.example " "-all"` | `v=spf1 include:a.example -all` |
| T-N04 | `"a\"b" "c\059d"` | `a"bc;d` |
| T-N05 | Name `example.com.` und `example.com` | gleich behandelt |
| T-N06 | MX-Antwort mit `Status 3` | Lauf bricht ab, ein Befund MX-01 (fehler) |
| T-N07 | HTTP 500 vom DoH-Anbieter | ein Wiederholversuch, dann NetzFehler `antwort`; 2 Einträge im Protokoll |
| T-N08 | TXT `_dmarc.D`: `Status 3` / `Status 0` ohne Antwort / `Status 2` | DMARC-01 warnung / DMARC-01 warnung / nur DMARC-00 fehler |
| T-N09 | dieselbe Abfrage zweimal im Lauf (Name, Typ, `cd` gleich) | 1 Abruf im Protokoll |
| T-MX01 | MX `0 .` | MX-02 info |
| T-MX02 | MX `20 b.firma.test.`, `10 a.firma.test.` | MX-03, Messwert „10 a.firma.test, 20 b.firma.test“ |

### 9.4 E-Mail-Regeln

| ID | Daten | Erwartung |
|---|---|---|
| T-S01 | `v=spf1 -all` | SPF-06 ok, lookups 0 |
| T-S02 | `v=spf1 include:_spf.example.net ~all`; Ziel `v=spf1 ip4:192.0.2.0/24 -all` | SPF-05 ok, lookups 1 |
| T-S03 | `v=spf1 +all` und `v=spf1 all` | SPF-03 kritisch |
| T-S04 | `v=spf1 mx` | SPF-04 warnung, lookups 1 |
| T-S05 | zwei SPF-Einträge | SPF-02 warnung |
| T-S06 | 11 include-Begriffe, Ziele je `v=spf1 -all` | SPF-07 warnung, lookups 11, die 11. include-Abfrage entfällt |
| T-S07 | include auf Namen ohne SPF | SPF-08 warnung |
| T-S08 | `v=spf1 ptr -all` | Stufe hinweis, Regel SPF-09, weitere SPF-06 |
| T-S09 | nur `v=spf10 -all` | SPF-01 warnung |
| T-S10 | `V=SPF1 -ALL` | SPF-06 ok |
| T-S11 | `v=spf1 redirect=_spf.example.net`; Ziel `v=spf1 -all` | SPF-06 ok, lookups 1 |
| T-S12 | `v=spf1 exists:%{i}._spf.example.net -all` | Stufe hinweis (SPF-11), weitere SPF-06, lookups 1, keine Abfrage für exists |
| T-S13 | `v=spf1 foo:bar -all` | SPF-10 warnung |
| T-S14 | include-Schleife a → b → a | SPF-07 warnung |
| T-S15 | `include:a include:b -all`; a und b enthalten je `include:c`; c ist `v=spf1 -all` | keine Schleife: SPF-06 ok, lookups 4, c nur einmal abgefragt |
| T-S16 | include-Ziel liefert `Status 2` | SPF-00 fehler, keine Bewertung des Qualifiers |
| T-M01 | `v=DMARC1; p=reject; rua=mailto:dmarc@firma.test` | DMARC-07 ok |
| T-M02 | `v=DMARC1; p=none` | DMARC-05 warnung |
| T-M03 | `v=DMARC1; p=none; rua=mailto:dmarc@firma.test` | DMARC-04 hinweis |
| T-M04 | kein Eintrag | DMARC-01 warnung |
| T-M05 | zwei Einträge | DMARC-02 warnung |
| T-M06 | `v=DMARC1; rua=mailto:dmarc@firma.test` | DMARC-03 warnung |
| T-M07 | `v=DMARC1; p=quarantine; pct=50; rua=mailto:d@firma.test` | Stufe hinweis, Regel DMARC-09, weitere enthält DMARC-06 |
| T-M08 | `v=DMARC1; p=reject; sp=none; rua=mailto:d@firma.test` | Stufe hinweis, Regel DMARC-10 |
| T-M09 | `v=dmarc1; p=reject; rua=mailto:d@firma.test` | nicht erkannt (RFC 7489, 6.3): Stufe warnung, Regel DMARC-08, weitere DMARC-01 |
| T-M12 | `V = DMARC1; p=reject; rua=mailto:d@firma.test` | erkannt (Leerzeichen um `=` und großes `V` sind erlaubt), DMARC-07 ok |
| T-M10 | `p=reject; v=DMARC1` | DMARC-01 warnung, Messwert nennt 1 verworfenen Eintrag |
| T-M11 | `v=DMARC1; p=reject; rua=https://x.firma.test` | Stufe hinweis, Regel DMARC-12 |
| T-DK01 | keine Selektoren | DKIM-01 info, `ziel = D` |
| T-DK02 | Selektor ohne Eintrag | DKIM-02 warnung |
| T-DK03 | `v=DKIM1; k=rsa; p=` | DKIM-03 hinweis |
| T-DK04 | RSA-Schlüssel 512 / 1024 / 2048 Bit, im Test erzeugt (SPKI-DER: 94 / 162 / 294 Byte) | DKIM-05 warnung / DKIM-06 hinweis / DKIM-07 ok |
| T-DK05 | `k=ed25519; p=‹32 Byte Base64›` | DKIM-04 ok |
| T-T01 | `v=STSv1; id=20261111T1;` | gültig |
| T-T02 | `v=STSv1; id=2026-11-11;` | STS-02 warnung |
| T-T03 | Richtlinie enforce, `mx: *.mail.firma.test`, `max_age: 604800`; MX `mx1.mail.firma.test` | STS-09 ok |
| T-T04 | wie T-T03, MX `mail.firma.test` | STS-10 kritisch |
| T-T05 | `max_age: 31557601` | STS-05 warnung |
| T-T06 | Abruf liefert 301 | STS-03 warnung, kein zweiter Abruf |
| T-T07 | mode testing, alle MX passen | STS-07 hinweis |
| T-T08 | LF-Zeilenenden und unbekanntes Feld `foo: bar` | gültig |
| T-T09 | Browser-Modus mit gültigem Eintrag | STS-11 nicht_geprueft |
| T-T10 | `a.b.mail.firma.test` gegen `*.mail.firma.test` | passt nicht |
| T-RP01 | kein TLS-RPT; ohne / mit MTA-STS-Eintrag | RPT-01 info / RPT-02 hinweis |
| T-RP02 | `v=TLSRPTv1; rua=mailto:tls@firma.test` | RPT-04 ok |
| T-RP03 | `v=TLSRPTv1; rua=ftp://x.firma.test` | RPT-03 hinweis |
| T-DS01 | SOA `Status 0`, `AD true` | DNSSEC-01 ok |
| T-DS02 | SOA `Status 0`, `AD false` | DNSSEC-02 hinweis |
| T-DS03 | `Status 2`, mit `cd=1` `Status 0` (Muster: aufgezeichnete Antwort für dnssec-failed.org) | DNSSEC-03 kritisch |
| T-DS04 | `Status 2` auch mit `cd=1` | DNSSEC-04 fehler |
| T-CA01 | kein CAA für `firma.test` und `test` | CAA-01 hinweis, genau 2 Abfragen |
| T-CA02 | `0 issue "letsencrypt.org"` | CAA-02 ok, Messwert enthält `letsencrypt.org` |
| T-CA03 | nur `0 iodef "mailto:sec@firma.test"` | CAA-03 hinweis |
| T-CA04 | `128 tbs "x"` | CAA-04 warnung |

### 9.5 Website-Regeln (TypeScript, Testnetz, `jetzt = 2026-11-11T12:00:00Z`)

| ID | Daten | Erwartung |
|---|---|---|
| T-W01 | `http://firma.test/` → 301 `https://firma.test/` → 200 | WEB-01 ok |
| T-W02 | wie T-W01 mit 302 | WEB-02 hinweis |
| T-W03 | `http://firma.test/` → 200 | WEB-04 warnung |
| T-W04 | → 301 `http://www.firma.test/` → 301 `https://www.firma.test/` → 200 | WEB-03 hinweis |
| T-W05 | → 301 `https://shop.anbieter.example/` | WEB-05 info, genau 1 Abruf |
| T-W06 | 6 Weiterleitungen in Folge | WEB-06 warnung, genau 6 Abrufe |
| T-W07 | HTTPS-Abruf mit NetzFehler `tls` | WEB-13 kritisch; Header-Prüfungen `nicht_geprueft` |
| T-W08 | HSTS `max-age=63072000; includeSubDomains; preload` | HSTS-04 ok, includeSubDomains und preload `true` |
| T-W09 | HSTS `max-age=86400` | HSTS-03 hinweis |
| T-W10 | HSTS fehlt / `max-age=0` / `max-age=31536000; max-age=1` / `max-age="31536000"` | HSTS-01 / HSTS-02 / HSTS-05 / HSTS-04 |
| T-W11 | keine CSP / nur Report-Only | CSP-03 / CSP-02, beide hinweis |
| T-W12 | CSP `frame-ancestors 'none'` ohne XFO / XFO `ALLOWALL` ohne CSP | FRAME-01 ok / FRAME-02 hinweis |
| T-W13 | `Server: Apache/2.4.41 (Ubuntu)` / `Server: nginx` / `X-Powered-By: PHP/8.3.1` | SRV-02 / SRV-01 / SRV-02 |
| T-W14 | `set-cookie: sid=…; HttpOnly` | COOKIE-02 hinweis, Messwert „sid“, kein Cookie-Wert im Befund |
| T-W15 | security.txt 200 `text/plain` mit `Contact: mailto:it@firma.test`, `Expires: 2027-06-30T00:00:00Z` / Expires 2026-01-01 / 404 | SECTXT-02 / SECTXT-04 / SECTXT-01 |
| T-W16 | Referrer-Policy fehlt / `unsafe-url`; `X-XSS-Protection: 1; mode=block` | REF-02 info / REF-03 hinweis; XXSS-02 hinweis |
| T-W17 | Weiterleitung auf `https://firma.test:8443/`, Testnetz liefert `nicht_erlaubt` | Kette `http://…`: WEB-08 fehler; Kette `https://…`: WEB-14 fehler, Header `nicht_geprueft` |
| T-W18 | A- und AAAA-Abfrage für `www.firma.test` liefern `Status 2` | Website-Prüfungen für W: WEB-09 fehler, kein HTTP- oder TLS-Abruf an W |
| T-Z01 | `gueltigBis 2026-11-15T00:00:00Z` | 3 Tage, CERT-04 warnung |
| T-Z02 | `gueltigBis 2026-11-21T00:00:00Z` | 9 Tage, CERT-05 hinweis |
| T-Z03 | `2026-11-25T11:59:59Z` / `2026-11-25T12:00:00Z` | 13 Tage CERT-05 / 14 Tage CERT-06 |
| T-Z04 | `gueltigBis 2026-11-10T00:00:00Z` | CERT-03 kritisch (Code abgelaufen, kein CERT-01) |
| T-Z05 | `vertrauenswuerdig false` (unbekannte_stelle) und `namePasst false` | ein Befund, Regel CERT-01, weitere CERT-02 |
| T-Z06 | TLS 1.3 / TLS 1.2 | TLS-01 ok / TLS-02 hinweis |
| T-Z07 | NetzFehler `tls_version` | TLS-03 kritisch |

### 9.6 Ablauf, Maßnahmen, Vergleich, Diagramm

| ID | Fall | Erwartung |
|---|---|---|
| T-A01 | Lauf ohne Bestätigung | Fehler, Testnetz zählt 0 Abrufe |
| T-A02 | normaler Lauf (Desktop-Testnetz) | DNS vor TLS vor HTTP; jeder Abruf genau einmal im Protokoll, `dauerMs ≥ 0` |
| T-A03 | Grenze im Test auf 10 DNS-Abfragen gesetzt | genau 10 DNS-Abfragen; nicht mehr ausgeführte Prüfungen enden mit `fehler` „Grenze erreicht“; Lauf endet normal |
| T-A04 | Abbruch nach 3 Abrufen | `abgebrochen = true`, offene Prüfungen `fehler` „abgebrochen“ |
| T-A05 | Browser-Modus | alle Website-Prüfungen BROWSER-01 `nicht_geprueft`; kein `http`- oder `tls`-Aufruf |
| T-P01 | TOP nicht erfüllt, Datum 2026-11-11 | Priorität 1, Frist 2026-11-25 |
| T-P02 | Basis nicht erfüllt | Priorität 2, Frist 2027-02-09 |
| T-P03 | Befund kritisch / warnung / hinweis / info | 1 (2026-11-25) / 2 (2027-02-09) / 3 (2027-05-10) / keine Maßnahme |
| T-P04 | Befund kritisch, TOP aus Thema 3, TOP aus Thema 1 | Reihenfolge: TOP Thema 1, TOP Thema 3, Befund |
| T-P05 | Priorität manuell ohne Begründung / mit Begründung | Fehler / wirksam, Sortierung danach |
| T-P06 | Anforderung inzwischen erfüllt; Maßnahme unberührt / bearbeitet | entfernt / bleibt mit `ursacheEntfallen = true` |
| T-P07 | Abgleich zweimal hintereinander | keine Doppelten |
| T-P08 | Wiederholungsprüfung mit übernommener, unberührter Maßnahme aus Befund `(hsts, www.example.com)`: Abgleich ohne Außenprüfung / nach Lauf mit Befund fehler / nach Lauf mit Befund ok | bleibt / bleibt / entfernt |
| T-V01 | vorher 20 von 37, jetzt 26 von 37 | +6, `direktVergleichbar = true` |
| T-V02 | erfüllt → nicht erfüllt; offen → erfüllt | schlechter; besser |
| T-V03 | DMARC warnung → ok; neuer Befund; weggefallener Befund | besser; neu; entfallen |
| T-V04 | Maximum 37 → 36 | `direktVergleichbar = false`, Vergleich über Prozent |
| T-V05 | `nicht_geprueft` (Browser) gegen ok (Desktop) | nicht_vergleichbar |
| T-G01 | Thema 1 anteil 1; Thema 2 anteil 0,5 | Punkte (150; 50) und (193,30; 125,00) |
| T-G02 | anteil `null` | Punkt im Mittelpunkt, Beschriftung enthält „nicht bewertet“ |

### 9.7 Rust (`cargo test -p netzpruefung`)

| ID | Fall | Erwartung |
|---|---|---|
| T-R01 | `http_abruf` ohne Freigabe | `nicht_erlaubt` |
| T-R02 | Freigabe `firma.de`: Hosts `www.firma.de` / `andere.de` / `firma.de.evil.example` | erlaubt / `nicht_erlaubt` / `nicht_erlaubt` |
| T-R03 | Adressen 10.0.0.1, 100.64.0.1, 127.0.0.1, 169.254.1.1, 172.16.0.1, 192.0.2.1, 192.168.2.105, ::1, fe80::1, fd00::1, ::ffff:192.168.0.1, 64:ff9b::a00:1, 2002:c0a8:201::1, 2001:db8::1 / 8.8.8.8, 2001:4860:4860::8888 | gesperrt / öffentlich |
| T-R04 | lokaler Testserver antwortet 301 | Ergebnis 301 mit `location`, kein zweiter Abruf |
| T-R05 | Körper 100 000 Byte unter `/.well-known/x.txt` / unter `/` | Text 65 536 Byte, `gekuerzt = true` / Text `null` |
| T-R06 | Server antwortet nicht (Testgrenze 1 s) | `zeitueberschreitung` |
| T-R07 | Kopfzeilen `X-Geheim: 1`, `Set-Cookie: sid=geheim; Secure` | `x-geheim` fehlt; `sid=…; Secure` |
| T-R08 | `doh_abfrage` mit unbekanntem Anbieter / Typ `ANY` | `nicht_erlaubt` |
| T-R09 | lokaler rustls-Server, Zertifikat einer Test-CA (rcgen, Wurzel injiziert) | `vertrauenswuerdig = true`, TLS 1.3 |
| T-R10 | Zertifikat mit notAfter gestern | `vertrauenswuerdig = false`, Code `abgelaufen`, Handshake trotzdem fertig, `gueltigBis` korrekt |
| T-R11 | Zertifikat für anderen Namen | `namePasst = false`, `vertrauenswuerdig = true` |
| T-R12 | Server nur mit TLS 1.2 | Version „TLS 1.2“ |
| T-R13 | `freigabe_setzen` mit `de` / `co.uk` / `www.firma.de` / `firma.co.uk` | `nicht_erlaubt` / `nicht_erlaubt` / `nicht_erlaubt` / erlaubt |
| T-R14 | Zertifikat abgelaufen und für anderen Namen | `vertrauenswuerdig = false`, Code `abgelaufen`, `namePasst = false` |

Für T-R04 bis T-R14 nimmt die interne Funktion zwei Testparameter: Adresssperre aus und eigener Wurzelspeicher (Test-CA). Die Tauri-Befehle setzen beide nie.

### 9.8 Browsertests (Playwright, Edge lokal, Chrome in der CI)

| ID | Ablauf | Erwartung |
|---|---|---|
| E-01 | Betrieb anlegen, Seite neu laden | Betrieb noch da |
| E-02 | Startseite, Betrieb anlegen | erscheint in der Liste; Sicherungshinweis sichtbar |
| E-03 | Vorgespräch ohne Datum; Vorfrage „Nein“ | Weiter gesperrt; abhängige Anforderungen ausgeblendet |
| E-04 | Interview vollständig per Tastatur | alle Themen „vollständig“; ab Schritt 2.5 zeigt die Auswertung den erwarteten Statuswert |
| E-05 | Wiederholungsprüfung | Antworten vorbelegt; Abschluss erst nach Bestätigung aller |
| E-06 | Außenprüfung ohne Häkchen | „Prüfung starten“ gesperrt |
| E-07 | Außenprüfung `example.com` mit abgefangenen DoH-Antworten | erwartete Befundliste; Gruppe Website „nur im Windows-Programm“; keine Anfrage verlässt den Test |
| E-08 | Maßnahme auf „erledigt“ setzen, Seite neu laden | Zähler offener Maßnahmen um 1 kleiner; Status bleibt erhalten |
| E-09 | Wiederholung mit geänderten Antworten | Vergleich zeigt Differenz und Listen |
| E-10 | Bericht mit `page.emulateMedia({ media: 'print' })`, dann `page.pdf({ format: 'A4' })` | Druckansicht zeigt „Statuswert“, „Teil A“, „Teil B“, den Abschnitt „Nicht bewertete Anforderungen“ (bei null Einträgen mit „keine“) und zwei Unterschriftsfelder (Pflichtteile nach [Q3]); PDF beginnt mit `%PDF-` und hat mindestens 3 Seiten (Regex `/\/Type\s*\/Page(?!s)/g` auf dem Latin-1-Text, Muster wie im Desktop-Test des Prozesslotsen; Text im PDF wird nicht durchsucht) |
| E-11 | Export verschlüsselt, Import in leeres Profil | Daten gleich |
| E-12 | zweiter Tab | Hinweis „Bereits in einem anderen Tab geöffnet“ |
| E-13 | axe in allen Schritten, hell und dunkel | keine schweren Befunde |

### 9.9 Windows-Programm: Desktop-Test und Abnahme von Hand

**Desktop-Test** (`npm run desktop:test` gegen den Debug-Build, ohne Installation, Muster `scripts/desktop-test.mjs` des Prozesslotsen; Dateidialoge beantwortet im Debug-Build eine Umgebungsvariable):

| ID | Ablauf | Erwartung |
|---|---|---|
| D-01 | Start, Beispielbetrieb laden | Fenster bedienbar, `isSecureContext` ist `true` |
| D-02 | verschlüsselt exportieren, Daten löschen, Datei importieren | Daten gleich |
| D-03 | Bericht „Als PDF speichern“ | Datei beginnt mit `%PDF-`, Seite A4 (MediaBox 595 × 842 pt ± 2) |
| D-04 | `http_abruf` an `https://example.com/` ohne Freigabe | `nicht_erlaubt`, kein Netzverkehr |

**Abnahme von Hand** (nicht in der CI):

| ID | Prüfung | Erwartung |
|---|---|---|
| M-01 | Lauf gegen Robins eigene Domains nach Freigabe (F12) | Befunde plausibel; Stichprobe mit `curl -I` und der Zertifikatsanzeige im Browser; kein falscher CERT-01 durch Virenschutz |
| M-02 | `dns('dnssec-failed.org', 'SOA')` direkt über beide Anbieter (nur DNS, kein Lauf) | Status 2, mit `cd=1` Status 0 (am 11.11.2026 bei Google per curl bestätigt) |
| M-03 | Robin installiert den Installer aus dem Release-Entwurf selbst (kein Agent) | Installation pro Benutzer ohne Admin, Start unter 1 s, PDF-Ausgabe funktioniert |

### 9.10 Testdaten

| Daten | Herkunft | Lizenz |
|---|---|---|
| synthetische DNS- und HTTP-Fixtures mit Namen unter `.test` und `example.*` | selbst erstellt | wie das Projekt |
| aufgezeichnete DoH-Antworten als Formatmuster (TXT/CAA von google.com, MX von gmail.com, DNSSEC-Fehler von dnssec-failed.org) | `scripts/fixtures-aufnehmen.mjs` bzw. curl am 11.11.2026, beide Anbieter | öffentliche DNS-Daten, nur als Formatbeispiel |
| Zertifikate | zur Testlaufzeit mit rcgen erzeugt, nicht gespeichert | – |
| DKIM-Testschlüssel | zur Testlaufzeit mit `node:crypto` bzw. Web Crypto erzeugt | – |
| Katalog- und Regeltexte | eigene Formulierungen (Phase 0, 3, 5) | wie das Projekt |
| Beispielbetrieb „Tischlerei Beispiel GmbH (fiktiv)“ | selbst erstellt | wie das Projekt |

Der Beispielbetrieb hat 3 TOP erfüllt, 2 TOP nicht erfüllt, 15 Basis erfüllt und 7 nicht erfüllt: Statuswert 18 von 37 (49 %). Ein Test sichert diese Zahl, weil die README sie nennt.

---

## 10. Risiken und offene Fragen

### 10.1 Risiken

| Nr. | Risiko | Gegenmaßnahme |
|---|---|---|
| R1 | Agenten haben keinen Zugang zur Norm (Anmeldung bei DIN Media). | Robin besorgt sie in Phase 0; Abgleichtabelle und Strukturtests (T-K01 bis T-K03). |
| R2 | Normtext gerät versehentlich in App oder Repo. | eigene Formulierungen, Vier-Augen-Prüfung durch Robin, PDF nur in `normen/`. |
| R3 | Diagramm, Dringlichkeit oder Bericht weichen von der Norm ab. | Annahmen sind markiert; Phase 0.2 gleicht sie ab. |
| R4 | Robin erfüllt die Beispielnachweise für Berater evtl. noch nicht; die BSI-Schulung ist derzeit nicht buchbar. | Leistung sachlich „nach DIN SPEC 27076“ anbieten, ohne Logo (F1, F2). |
| R5 | Die kostenlose BSI-Webanwendung macht den Interviewteil weniger besonders. | Mehrwert über Außenprüfung, Verlauf, Maßnahmenverfolgung, lokal und offline. |
| R6 | Falsche Sicherheit: passive Prüfung findet nicht alles. | Abschnitt „Methodik und Grenzen“ im Bericht (F10). |
| R7 | Missbrauch gegen fremde Domains. | Bestätigung, Rust-Freigabe, Grenzen, Protokoll, keine Scans. |
| R8 | DoH-Anbieter fällt aus oder ändert Format oder CORS. | zwei Anbieter, Formatmuster als Fixtures, klare Fehlermeldung. |
| R9 | Datenverlust durch gelöschte Browserdaten oder Deinstallation. | Sicherungshinweis nach 30 Tagen, Export. |
| R10 | Build-Probleme unter Windows ohne Admin (ring, WebView2). | gebautes `src-tauri` des Prozesslotsen als Vorlage; Phase 5.1 baut zuerst ein leeres Programm mit allen Crates. |
| R11 | Kürzere Zertifikatslaufzeiten erzeugen mehr Hinweise. | Schwellen als Konstanten. |
| R12 | DMARCbis ändert Tags (z. B. `pct`). | Status in Phase 0.4 klären. |
| R13 | Umfang wächst (Website-Lauf, NIS2); 26 Arbeitstage sind knapp. | feste Liste „später“ (2.2); Schnittlinie nach Phase 4: die Web-Version 0.1.0-web ist ohne Phase 5 nutzbar. |
| R14 | Ein Virenschutz oder Proxy bricht auf dem Beraterrechner TLS auf; dann meldet CERT-01 fälschlich „unbekannte Stelle“. | Aussteller im Messwert, Regeltext, „Methodik und Grenzen“, M-01. |
| R15 | Die Regeln in 6.5 und 6.6 stützen sich teils auf nicht geöffnete RFCs (3.4). | Phase 0.4 vor Phase 3; Abweichungen ändern nur Regeltabellen und Tests. |

### 10.2 Offene Fragen an Robin

| Nr. | Frage | Vorschlag |
|---|---|---|
| F1 | Name: „Sicherheitscheck“ oder passend zur Lotsen-Familie „Sicherheitslotse“? | „Sicherheitslotse“; „CyberRisikoCheck“ nicht als Namen verwenden |
| F2 | BSI-Schulung machen, sobald buchbar? Bis dahin als „Check nach DIN SPEC 27076“ anbieten? | ja und ja |
| F3 | Bei DIN Media eine Lizenz für Leitfragen und Empfehlungen anfragen oder bei eigenen Formulierungen bleiben? | eigene Formulierungen |
| F4 | DoH-Standard Cloudflare oder Google (beide USA)? Später eigener DoH-Server auf dem VPS? | Cloudflare; europäischer Anbieter oder eigener Server erst mit RFC 8484 (2.2) |
| F5 | Exportdatei standardmäßig verschlüsseln? | ja, abschaltbar |
| F6 | Fristen 14 / 90 / 180 Tage für Priorität 1 / 2 / 3 passend? | ja |
| F7 | Reichen Unterschriftsfelder auf dem Ausdruck? | ja für 0.1 |
| F8 | Fördermittel: eigene gepflegte Liste oder nur Links und Freitext? | Links und Freitext |
| F9 | Datenschutz mit Kunden: Rechtsgrundlage, AV-Vertrag nötig, Aufbewahrungsfrist der Berichte? | mit Datenschutzberatung klären |
| F10 | Haftungshinweis im Bericht anwaltlich prüfen lassen? | vor dem ersten bezahlten Auftrag |
| F11 | Lizenz der App (wie beim Prozesslotsen offen); Repo bleibt privat? | privat bis zur Freigabe |
| F12 | Welche eigenen Domains dürfen für Testläufe genutzt werden? | olbricht-digital und VPS-Domains |
| F13 | Gibt es einen Probe-Kunden für einen echten Check? | nach Phase 6 |
| F14 | Wo läuft die Web-Version: nur lokal (`npm run dev`, `vite preview`) oder öffentlich als Portfolio-Demo? Öffentlich braucht HTTPS (Web Crypto) und den Beispielbetrieb als Einstieg. | nur lokal, bis das Repo freigegeben ist |
| F15 | Soll jedes Angebot für Kunden die Außenprüfung mit Domain und Zeitraum schriftlich nennen? | ja; Mustersatz fürs Angebot von olbricht-digital |

---

## 11. Arbeitsschritte zum Abhaken

Aufwand gesamt rund **26 Arbeitstage**. „T“ = Arbeitstag. Erledigte Schritte abhaken und im Arbeitsplan mit Commit vermerken. Nach Phase 4 ist die Web-Version nutzbar (Schnittlinie, R13).

### Phase 0 – Klären und Katalog (3 T)

- [ ] **0.1** Robin lädt die DIN SPEC 27076 bei DIN Media und legt sie unter `normen/` ab; er entscheidet F1 bis F6. *Ergebnis:* PDF liegt lokal, Copyright-Vermerk notiert, Entscheidungen im Arbeitsplan. (0,5 T, Robin)
- [ ] **0.2** Katalog- und Berichtsabgleich mit der Norm: Nummern, Themen, TOP, Relevanzregeln, Vorfragen, Diagramm, Dringlichkeit, Pflichtangaben. *Ergebnis:* `docs/katalog-abgleich.md` mit 27 Zeilen (nur Nummern und Zuordnung) und Korrekturliste zu 6.1, 6.12, 6.13. (1 T)
- [ ] **0.3** Eigene Formulierungen für 27 Anforderungen und alle Vorfragen; Robin prüft gegen die Norm, dass kein Normtext übernommen ist. *Ergebnis:* Tabelle mit Titel, Kurzfrage, Hilfe, Maßnahme und Freigabevermerk. (1 T)
- [ ] **0.4** Regeln aus 6.5 und 6.6 gegen die nicht geöffneten Standards (3.4) prüfen, DMARCbis-Status und Argon2-Parameter klären. *Ergebnis:* Abweichungsliste, Spezifikation angepasst. (0,5 T)

### Phase 1 – Gerüst, Datenmodell, Bewertung (3,5 T)

- [ ] **1.1** Projekt wie den Prozesslotsen anlegen (Vite, React, TypeScript, Vitest, oxlint, Playwright, CI); `normen/` in `.gitignore`; `CLAUDE.md` mit den Projektregeln (Deutsch, Tests vor jedem Commit, Installer nie auf Robins Rechner). *Ergebnis:* lint, test, build und e2e grün, auch in der CI. (0,5 T)
- [ ] **1.2** `typen.ts` nach Abschnitt 4 und Katalog aus Phase 0 anlegen. *Ergebnis:* T-K01 bis T-K03 grün. (0,5 T)
- [ ] **1.3** `bewertung.ts`: Punkte, Statuswert, Themen, Relevanz. *Ergebnis:* T-B01 bis T-B12 grün. (0,5 T)
- [ ] **1.4** Operationen: Betrieb und Prüfung anlegen, Antwort setzen, abschließen, wieder öffnen, Wiederholungsprüfung. *Ergebnis:* T-O01 bis T-O06 grün. (0,5 T)
- [ ] **1.5** Speicher: Prüffunktionen, Migrationsgerüst, IndexedDB-Adapter, Tab-Sperre. *Ergebnis:* T-L01 bis T-L03 grün; den Adapter prüft E-01 in Schritt 2.1. (0,5 T)
- [ ] **1.6** Export und Import mit Argon2id und AES-GCM im Web Worker. *Ergebnis:* T-E01 bis T-E09 grün; Export mit 50 Prüfungen unter 5 s. (1 T)

### Phase 2 – Interview und Auswertung (3,5 T)

- [ ] **2.1** Rahmen: Schrittleiste, Hell/Dunkel, Startseite, Einstellungen, Sicherungshinweis, Export/Import-Knöpfe. *Ergebnis:* E-01, E-02, E-11, E-12 grün. (0,5 T)
- [ ] **2.2** Schritte Betrieb und Vorgespräch mit Pflichtfeldern, Vorfragen und Vorbereitungsliste. *Ergebnis:* E-03 grün. (0,5 T)
- [ ] **2.3** Schritt Interview mit Fragekarte, Bewertung, Begründung, Fortschritt und Tastaturbedienung. *Ergebnis:* E-04 grün. (1 T)
- [ ] **2.4** Wiederholungsprüfung in der Oberfläche (Vorbelegung, „Unverändert bestätigen“). *Ergebnis:* E-05 grün. (0,5 T)
- [ ] **2.5** Schritt Auswertung mit Netzdiagramm (SVG) und Tabellen. *Ergebnis:* T-G01, T-G02 und E-04 mit Statuswert grün; Bild in `docs/bilder`. (0,5 T)
- [ ] **2.6** Barrierefreiheit aller bisherigen Schritte in hell und dunkel. *Ergebnis:* E-13 für diese Schritte grün. (0,5 T)

### Phase 3 – Außenprüfung DNS (5 T)

- [ ] **3.1** Domainprüfung (tldts), Netz-Schnittstelle, Browser-DoH für beide Anbieter, TXT-Zusammensetzung, DNS-Status nach 6.4, Zwischenspeicher je Lauf, Testnetz und Fixture-Rekorder. *Ergebnis:* T-D01 bis T-D08, T-N01 bis T-N09 grün; `testdaten/README.md` mit Herkunft. (1 T)
- [ ] **3.2** MX und SPF mit rekursiver Zählung, Schleifenerkennung über den Pfad, Regel `‹Präfix›-00` und Regeltexten. *Ergebnis:* T-MX01, T-MX02, T-S01 bis T-S16 grün. (1 T)
- [ ] **3.3** DMARC (genaue Versionsprüfung) und DKIM (Schlüssellänge aus DER) mit Regeltexten. *Ergebnis:* T-M01 bis T-M12, T-DK01 bis T-DK05 grün. (1 T)
- [ ] **3.4** MTA-STS (Eintrag, Richtlinienparser, MX-Abgleich), TLS-RPT, DNSSEC, CAA mit Regeltexten. *Ergebnis:* T-T01 bis T-T10, T-RP01 bis T-RP03, T-DS01 bis T-DS04, T-CA01 bis T-CA04 grün. (1 T)
- [ ] **3.5** Ablaufsteuerung (Reihenfolge, Grenzen, Abbruch, Protokoll) und Schritt Außenprüfung mit Bestätigung. *Ergebnis:* T-A01 bis T-A05, E-06, E-07 grün. (1 T)

### Phase 4 – Maßnahmen, Vergleich, Bericht (3,5 T)

- [ ] **4.1** Maßnahmen ableiten, priorisieren, sortieren, abgleichen (mit der Ausnahme für Befund-Maßnahmen). *Ergebnis:* T-P01 bis T-P08 grün. (0,5 T)
- [ ] **4.2** Schritt Maßnahmen mit Status, Frist, Verantwortlichem, Filter. *Ergebnis:* E-08 grün. (0,5 T)
- [ ] **4.3** Vergleich mit der Vorgängerprüfung, Logik und Anzeige. *Ergebnis:* T-V01 bis T-V05 und E-09 grün. (0,5 T)
- [ ] **4.4** Bericht als Druckansicht mit Teilen A bis C, Anhang, Unterschriftsfeldern und „Vertraulich“. *Ergebnis:* E-10 grün; Robin sieht das PDF durch. (1 T)
- [ ] **4.5** ISMS-Brücke (3.5) und Text „Methodik und Grenzen“; Robin prüft die Zuordnung. *Ergebnis:* Anhang im Bericht, Freigabevermerk. (0,5 T)
- [ ] **4.6** Beispielbetrieb, README mit Bildern und Grenzen, Stand „0.1.0-web“. *Ergebnis:* Test sichert 18 von 37 Punkten; README-Bilder erzeugt. (0,5 T)

### Phase 5 – Windows-Programm und Website-Prüfung (5,5 T)

- [ ] **5.1** Tauri 2 nach `src-tauri` des Prozesslotsen 0.2.0: NSIS pro Benutzer, CSP, Rechte für eigene Befehle (`build.rs`), Einzelinstanz, Dialoge in Rust, `.sicherheitscheck`, PDF, CI-Workflows `windows.yml` und `release.yml`; alle Crates aus 7.2 eingebunden. *Ergebnis:* Debug-Build startet lokal mit `isSecureContext = true`; `cargo tree -i aws-lc-sys` findet nichts; `windows.yml` baut den Installer, der Installer-Test ist grün. (1 T)
- [ ] **5.2** Crate `netzpruefung`: Freigabe mit PSL-Prüfung (psl), Zielprüfung, Adresssperre. *Ergebnis:* T-R01 bis T-R03 und T-R13 grün. (0,5 T)
- [ ] **5.3** `doh_abfrage` und `http_abruf` (reqwest ohne Weiterleitung, webpki-roots, Grenzen, Kopfzeilenfilter, Cookie-Werte entfernt). *Ergebnis:* T-R04 bis T-R08 grün. (1 T)
- [ ] **5.4** `tls_info` (rustls mit aufzeichnendem Prüfer, x509-parser). *Ergebnis:* T-R09 bis T-R12 und T-R14 grün. (1 T)
- [ ] **5.5** TypeScript-Regeln Website mit Regeltexten und Desktop-Netz. *Ergebnis:* T-W01 bis T-W18, T-Z01 bis T-Z07 grün. (1 T)
- [ ] **5.6** Desktop-Test `npm run desktop:test` (Muster Prozesslotse). *Ergebnis:* D-01 bis D-04 grün. (0,5 T)
- [ ] **5.7** Abnahme im Debug-Build ohne Installation. *Ergebnis:* M-01 und M-02 protokolliert, Abweichungen geklärt, Installergröße (CI-Artefakt) und Startzeit gemessen. (0,5 T)

### Phase 6 – Abnahme und Portfolio (2 T)

- [ ] **6.1** Probe-Check mit dem fiktiven Betrieb: Interview, Außenprüfung, Bericht, Wiederholung. *Ergebnis:* PDF-Bericht und Mängelliste. (0,5 T)
- [ ] **6.2** Mängel beheben; Tastatur, Barrierefreiheit und Druckbild final prüfen. *Ergebnis:* alle Tests grün, E-13 ohne schwere Befunde. (0,5 T)
- [ ] **6.3** Doku: README, `docs/datenmodell.md`, `docs/regeln.md`, Lizenzliste der Drittanbieter. *Ergebnis:* Dokumente im Repo. (0,5 T)
- [ ] **6.4** Version 0.1.0 taggen; `release.yml` erzeugt den Release-Entwurf mit Installer; Repo bleibt privat. *Ergebnis:* Release-Entwurf vorhanden; Robin installiert selbst und hakt M-03 ab. (0,5 T)

---

## 12. Quellen

Nur Seiten, die für diese Spezifikation geöffnet wurden (abgerufen am 10./11.11.2026). Suchergebnisse sind keine Quellen.

| Nr. | Titel | URL |
|---|---|---|
| Q1 | DIN Media: DIN SPEC 27076:2023-05 – IT-Sicherheitsberatung für Klein- und Kleinstunternehmen | https://www.dinmedia.de/de/technische-regel/din-spec-27076/365252629 |
| Q2 | BSI: CyberRisikoCheck | https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/KMU/CyberRisikoCheck/CyberRisikoCheck.html |
| Q3 | Der Mittelstand, BVMW (Projekt mIT Standard sicher): Die Anwendung des CyberRisiko-Checks auf Basis der DIN SPEC 27076 – Leitfaden für IT-Dienstleistungsunternehmen, Stand August 2023 | https://transferstelle-cybersicherheit.de/wp-content/uploads/2023/10/leitfaden-it-sicherheit-mit-standard-sicher-web.pdf |
| Q4 | BSI: Schulung zum CyberRisikoCheck | https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/KMU/CyberRisikoCheck/CRC_Schulungen/CRC_Schulung_node.html |
| Q5 | Gesetze im Internet: § 5 UrhG – Amtliche Werke | https://www.gesetze-im-internet.de/urhg/__5.html |
| Q6 | BSI: TR-02102 Kryptographische Verfahren (Übersicht) | https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr02102/tr02102_node.html |
| Q7 | BSI TR-02102-2 Verwendung von TLS, Version 2026-01 | https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.pdf?__blob=publicationFile&v=14 |
| Q8 | BSI TR-02102-1 Empfehlungen und Schlüssellängen, Version 2026-01 | https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102.pdf?__blob=publicationFile |
| Q9 | OWASP Cheat Sheet Series: HTTP Headers Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html |
| Q10 | RFC 7208: Sender Policy Framework (SPF) | https://www.rfc-editor.org/rfc/rfc7208.txt |
| Q11 | RFC 7489: Domain-based Message Authentication, Reporting, and Conformance (DMARC) | https://www.rfc-editor.org/rfc/rfc7489.html |
| Q12 | RFC 8461: SMTP MTA Strict Transport Security (MTA-STS) | https://www.rfc-editor.org/rfc/rfc8461.txt |
| Q13 | Google Public DNS: JSON API for DNS over HTTPS | https://developers.google.com/speed/public-dns/docs/doh/json |
| Q14 | Cloudflare DNS over HTTPS, JSON-Endpunkt (mit curl abgefragt; ebenso https://dns.google/resolve) | https://cloudflare-dns.com/dns-query |
| Q15 | BSI: IT-Grundschutz-Bausteine, Edition 2023 | https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/IT-Grundschutz-Kompendium/IT-Grundschutz-Bausteine/Bausteine_Download_Edition_node.html |

Bei der Fachprüfung am 11.11.2026 erneut geöffnet und abgeglichen: Q2, Q3, Q4, Q7, Q8 und Q11 (als `rfc7489.txt`); Q14 erneut per curl abgefragt. Neue Quellen kamen nicht hinzu.

---

## Prüfvermerk (2026-11-10)

Fachprüfung der Spezifikation als Gutachter und Entwickler. Abgeglichen wurden sechs Primärquellen (siehe 12) und die DoH-Antworten beider Anbieter per curl. Dazu kamen alle npm- und Cargo-Versionen samt Lizenzen, das Verhalten von tldts 7.4.21 und das gebaute `src-tauri` des Prozesslotsen 0.2.0.

**Bestätigt:**

- Punkteschema: Basis 0/1, TOP −3/+3, „teilweise“ zählt als nicht erfüllt, ausgewiesen mindestens 0, Maximum 37, irrelevante Punkte fallen aus dem Maximum [Q3].
- 27 Anforderungen (22 Basis, 5 TOP), die fünf TOP-Anforderungen, sechs Themenbereiche, Spinnennetzdiagramm, Unterschriften [Q3].
- Interview 1 bis 2 Stunden [Q2], Termin 3 Stunden, Geschäftsführung nimmt teil [Q3].
- BSI-Webanwendung freiwillig, eigene Werkzeuge erlaubt, für Norminhalte ist DIN zuständig, Schulung in Überarbeitung [Q4].
- TLS 1.2 nur bis Ende 2031 empfohlen (TR-02102-2, Version 2026-01) [Q7].
- Argon2id mit Parametern nach Expertenabstimmung; GCM mit 96-Bit-IV und Prüfsumme ab 96 Bit (TR-02102-1, Version 2026-01) [Q8].
- Alle Rechenbeispiele, Prozentwerte, Fristdaten und Diagrammkoordinaten nachgerechnet.

**Geändert:**

1. DMARC: `DMARC1` muss genau stimmen, sonst wird der Eintrag ignoriert (RFC 7489, 6.3). `v=dmarc1` ist jetzt DMARC-08 (warnung) statt „erkannt“; T-M09 korrigiert, T-M12 neu.
2. DNS-Fehler: NXDOMAIN und NODATA bei Unternamen heißen „kein Eintrag“. SERVFAIL, andere Status und Netzfehler ergeben `‹Präfix›-00` (fehler). Wiederholversuche stehen im Protokoll, gleiche Abfragen kommen aus einem Zwischenspeicher.
3. SPF: Schleifen werden nur im aktuellen Pfad erkannt. Vorher hätte ein in zwei Zweigen eingebundenes include fälschlich permerror ergeben (T-S15).
4. Maßnahmen-Abgleich: Maßnahmen aus Befunden verschwinden nicht mehr, bevor eine neue Außenprüfung gelaufen ist (T-P08).
5. Import: erst entschlüsseln, dann migrieren. `umfang` ist mit authentisiert. Verschlüsselte Dateien tragen keinen Betriebsnamen im Dateinamen (T-E07 bis T-E09).
6. Tauri: Vorlage ist `src-tauri` des Prozesslotsen 0.2.0 statt des ungetesteten Prototyps. Eigene Befehle brauchen Rechte über `build.rs`; das npm-Paket `@tauri-apps/plugin-dialog` und Dialog-Rechte entfallen.
7. Windows-Programm: Prüfung von `isSecureContext`, fester Ursprung, kein Installer durch Agenten auf Robins Rechner, Installer-Test in der CI, Desktop-Test D-01 bis D-04 als neuer Schritt 5.6.
8. Rust: `freigabe_setzen` prüft selbst gegen die PSL (psl 2.1.250). Die Adresssperre erfasst jetzt Dokumentationsnetze, 6to4, Teredo und NAT64 (T-R03, T-R13). `http_abruf` nutzt dieselben Wurzeln wie `tls_info`.
9. `tls_info`: keine zweite Prüfung bei falschem Namen, weil rustls die Kette vorher prüft; Code „widerrufen“ entfällt, da kein Sperrstatus geprüft wird (T-R11, T-R14).
10. Website: WEB-08, WEB-09 und WEB-14 decken übrige Netzfehler ab (T-W17, T-W18). CERT-01 nennt TLS-Aufbruch durch Virenschutz als mögliche Ursache (R14).
11. Tests: kein Testmodus mehr, Ablauf- und E2E-Tests nutzen `example.com`. E-10 prüft Druckansicht und Seitenzahl, nicht den PDF-Text.
12. Kleineres: Verweis 7.8 auf 7.7 korrigiert, „Teil A“ benannt, Druck immer hell, Leitfragen-Pflicht [Q3], § 5 Abs. 3 UrhG genauer, `navigator.storage.persist()`, Speichern vor dem Schließen, drei CI-Workflows, F14, F15, R14, R15.
13. Plan: Schritt 5.6 neu, 5.6 wird 5.7, Testbereiche angepasst; Aufwand 26 statt 25,5 Arbeitstage.

**Offen:**

- Inhalte der 22 Basis-Anforderungen, Relevanzregeln, Netzdiagramm, Dringlichkeit und Pflichtangaben im Bericht klärt erst die Norm (Phase 0).
- Regeln auf Basis nicht geöffneter RFCs (3.4) und der Stand von DMARCbis: Phase 0.4.
- Argon2-Parameter (64 MiB, t = 3, p = 1) sind eigene Festlegung; die Laufzeit unter 5 s zeigt erst Phase 1.6.
- Rechtliche Punkte F3, F9, F10 und F15 brauchen Fachleute. Die Logo-Bedingungen stehen nur im BSI-Anmeldeformular.
- Die Zuordnung zum IT-Grundschutz (3.5) bleibt ein Vorschlag.
