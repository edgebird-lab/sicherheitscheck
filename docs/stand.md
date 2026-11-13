# Sicherheitscheck – Stand der Arbeit

Checkliste aller Phasen und Schritte aus [spezifikation.md](spezifikation.md), Abschnitt 11. `[x]` erledigt, `[ ]` offen, `[~]` teilweise. Nach jedem Schritt aktualisieren, damit ein Nachfolger hier weitermachen kann. Annahmen stehen in [entscheidungen.md](entscheidungen.md).

Letzte Aktualisierung: 13.11.2026, Version 0.2.0 mit dem Export Beratungsakte (6.5); davor 12.11.2026 Version 0.1.0 veröffentlicht (Repo öffentlich, Release v0.1.0 mit Installer; offen sind Robins Abnahmen M-01 und M-02, die Durchsichten aus Phase 0 und 4 sowie Phase 6)

## Phase 0 – Klären und Katalog

- [ ] **0.1** Robin lädt die DIN SPEC 27076 und legt sie unter `normen/` ab; entscheidet F1 bis F6. *Offen, nur Robin.*
- [ ] **0.2** Katalog- und Berichtsabgleich mit der Norm. *Offen: braucht die Norm.*
- [~] **0.3** Eigene Formulierungen für 27 Anforderungen und alle Vorfragen. *Geschrieben: `src/katalog`, alle Texte in `docs/katalog-texte.md` (aus dem Code erzeugt). Offen: Robins Prüfung gegen die Norm und Freigabe in `docs/katalog-abgleich.md`.*
- [~] **0.4** Regeln aus 6.5 und 6.6 gegen die nicht geöffneten Standards prüfen. *Prüfblatt `docs/rfc-abgleich.md` mit den Annahmen je Regel und den Fundstellen, aus Fachwissen vorbereitet (keine Webrecherche); bisher keine Abweichung bekannt. Offen: Abgleich mit den Originaltexten, Status von DMARCbis (betrifft DMARC-09), Argon2-Parameter mit einem Experten abstimmen.*

## Phase 1 – Gerüst, Datenmodell, Bewertung

- [x] **1.1** Projekt wie den Prozesslotsen anlegen. *Vite 8, React 19, TypeScript 7, Vitest 5, oxlint, Playwright mit Edge auf Port 4181, CSP im Build, `normen/` in `.gitignore`. CI nur mit Lint, Test und Build (Vorgabe des Auftrags, siehe entscheidungen.md).*
- [x] **1.2** `typen.ts` nach Abschnitt 4 und Katalog. *T-K01 bis T-K03 grün. Katalog vorläufig (27 Anforderungen, 6/5/4/3/3/6 je Thema, Nummern 1.1–6.6, vier Vorfragen); `KATALOG_ABGEGLICHEN = false` zeigt das in der Oberfläche an. Test hält `docs/katalog-abgleich.md` und `docs/katalog-texte.md` mit dem Code synchron.*
- [x] **1.3** `bewertung.ts`: Punkte, Statuswert, Themen, Relevanz. *T-B01 bis T-B12 grün (T-B06 zusätzlich über eine Vorfrage). Prüfmeldung R1 für „nicht relevant“, wo die Regel es nicht erlaubt.*
- [x] **1.4** Operationen: Betrieb und Prüfung anlegen, Antwort setzen, Vorfragen, abschließen, wieder öffnen, Wiederholungsprüfung. *T-O01 bis T-O06 grün. Den Maßnahmenabgleich beim Abschließen (6.8) hat Schritt 4.1 ergänzt.*
- [x] **1.5** Speicher: Prüffunktionen, Migrationsgerüst, IndexedDB-Adapter, Tab-Sperre. *T-L01 bis T-L03 grün. `speicher/pruefen.ts`, `migration.ts`, `idb.ts` (Datenbank `sicherheitscheck` v1), `aenderungen.ts` (Differenz und Schreibpuffer, 400 ms, mit Tests), `sperre.ts` (Web Locks). Adapter und Sperre prüfen E-01 und E-12 (Schritt 2.1).*
- [x] **1.6** Export und Import mit Argon2id und AES-GCM im Web Worker. *T-E01 bis T-E09 grün; Export mit 50 Prüfungen und Standardparametern (64 MiB, t = 3, p = 1) in Vitest rund 1 s. `speicher/krypto.ts` (ohne Worker testbar), `krypto.worker.ts` (Hülle), `krypto-auftrag.ts` (Browser), `datei.ts` (Export, Import in fester Reihenfolge, Zusammenführen). Den Worker im Browser prüft E-11.*

## Phase 2 – Interview und Auswertung

- [x] **2.1** Rahmen: Schrittleiste, Hell/Dunkel, Startseite, Einstellungen, Sicherungshinweis, Export/Import. *E-01, E-02, E-11, E-12 grün; dazu Tests für Suche, Darstellung, „Alle Daten löschen“, Import als Kopie und fremde Datei. `ui/App.tsx`, `ui/daten.ts` (IndexedDB, Schreibpuffer, Sperre), `ui/datei.tsx` und `ui/DateiDialoge.tsx`.*
- [x] **2.2** Schritte Betrieb und Vorgespräch mit Pflichtfeldern, Vorfragen und Vorbereitungsliste. *E-03 grün. Domainprüfung nach 6.3 vorgezogen (T-D01 bis T-D08), Löschen mit Eingabe des Namens.*
- [x] **2.3** Schritt Interview mit Fragekarte, Bewertung, Begründung, Fortschritt und Tastaturbedienung. *E-04 grün (26 Fragen nur per Tastatur, Strg+Eingabe).*
- [x] **2.4** Wiederholungsprüfung in der Oberfläche (Vorbelegung, „Unverändert bestätigen“). *E-05 grün; Abschluss mit Fehlerliste und Sprungmarken im Schritt Bericht (vorläufig, siehe E15).*
- [x] **2.5** Schritt Auswertung mit Netzdiagramm (SVG) und Tabellen. *T-G01, T-G02 und E-04 mit Statuswert grün; Bilder `docs/bilder/auswertung.png` und `interview.png` (`npm run bilder`).*
- [x] **2.6** Barrierefreiheit aller bisherigen Schritte in hell und dunkel. *E-13 grün: axe ohne schwere Befunde auf Startseite (leer und mit Liste), Einstellungen, Exportdialog und allen sieben Schritten für abgeschlossene Prüfung, Wiederholung und neue Prüfung; Beschriftung aller Felder geprüft; Fokus nach Seitenwechsel auf der Überschrift.*

## Phase 3 – Außenprüfung DNS

- [x] **3.1** Domainprüfung, Netz-Schnittstelle, Browser-DoH, TXT, DNS-Status, Zwischenspeicher, Testnetz (T-D01 bis T-D08, T-N01 bis T-N09). *`netz/schnittstelle.ts` (TXT nach 6.4, JSON beider Anbieter, TC = gescheitert), `netz/browser.ts` (DoH mit 5 s Zeitlimit), `netz/testnetz.ts`, `pruefung/lauf.ts` (Zwischenspeicher je Lauf, ein Wiederholversuch nach 500 ms bei Netzfehler oder HTTP 5xx, Grenzen, Abbruch, Protokoll), `pruefung/dns.ts` (kein Eintrag / gescheitert). T-N01 bis T-N05, T-N07, T-N09 grün; T-N06 und T-N08 mit MX und DMARC (3.2, 3.3). Formatmuster unter `testdaten/dns` sind synthetisch (`testdaten/README.md`); `scripts/fixtures-aufnehmen.mjs` ist geschrieben, aber nie ausgeführt (keine Live-Abfragen).*
- [x] **3.2** MX und SPF (T-MX01, T-MX02, T-S01 bis T-S16). *`pruefung/mx.ts`, `pruefung/spf.ts` (rekursive Zählung, Schleifen im Pfad, SPF-00 bei gescheiterter include-Abfrage), `pruefung/stufen.ts` (Hauptregel = schwerste, bei Gleichstand die zuerst in der Tabelle), `katalog/regeltexte.ts` mit eigenen Texten für alle DNS-Regeln und BROWSER-01. Alle Fälle grün, dazu T-N06 (Teil MX).*
- [x] **3.3** DMARC und DKIM (T-M01 bis T-M12, T-DK01 bis T-DK05). *`pruefung/dmarc.ts` (nur „v=DMARC1“ in genau dieser Schreibweise, DMARC-08 bei „v=dmarc1“), `pruefung/dkim.ts` (Schlüssellänge aus SPKI oder PKCS#1, Testschlüssel zur Laufzeit mit Web Crypto). Alle Fälle grün, dazu T-N08.*
- [x] **3.4** MTA-STS, TLS-RPT, DNSSEC, CAA (T-T01 bis T-T10, T-RP01 bis T-RP03, T-DS01 bis T-DS04, T-CA01 bis T-CA04). *`pruefung/mtasts.ts` (Eintrag, Richtlinienparser, MX-Abgleich mit „*.“; Richtlinie nur im Windows-Programm, im Browser STS-11), `tlsrpt.ts`, `dnssec.ts` (cd=1 nur bei SERVFAIL), `caa.ts` (Elternnamen bis zur TLD). Alle Fälle grün; T-DS03 nutzt ein synthetisches Formatmuster statt der Aufzeichnung von dnssec-failed.org.*
- [x] **3.5** Ablaufsteuerung und Schritt Außenprüfung (T-A01 bis T-A05, E-06, E-07). *`pruefung/ablauf.ts` (Reihenfolge, Grenzen, Abbruch, Protokoll, BROWSER-01), `pruefung/bestaetigung.ts`, Schritt `ui/schritte/AussenSchritt.tsx` mit Bestätigung, Laufanzeige, Abbrechen, Ergebnis in Gruppen, „Was heißt das?“, Abrufprotokoll und „Neue Außenprüfung“ nach Rückfrage; `ui/Befunde.tsx`. T-A01, T-A03 bis T-A05, E-06, E-07 grün (dazu Abbruch im Browser, axe hell und dunkel auf dem Ergebnis). T-A02 nur für den DNS-Teil: DNS vor HTTP (MTA-STS-Richtlinie); TLS und Website-Abrufe kommen mit 5.5. Fiktive Zone `testdaten/dns/beispiel-zone.json` für E-07 und den Beispielbetrieb.*

## Phase 4 – Maßnahmen, Vergleich, Bericht

- [x] **4.1** Maßnahmen ableiten, priorisieren, sortieren, abgleichen (T-P01 bis T-P08). *`modell/massnahmen.ts`: Soll-Menge, Fristen 14/90/180 Tage ab Interview, Sortierung nach 6.8, idempotenter Abgleich mit der Ausnahme für Befund-Maßnahmen, Priorität von Hand nur mit Begründung, Bearbeiten auch nach dem Abschluss. Der Abgleich läuft beim Abschließen (`abschliessen`) und nach jeder Außenprüfung (`setzeAussenpruefung`); T-O06 an den Abgleich beim Abschluss angepasst.*
- [x] **4.2** Schritt Maßnahmen (E-08). *`ui/schritte/MassnahmenSchritt.tsx`: Abgleich beim Öffnen (nur Entwurf), Zähler (offen, erledigt, überfällig), Filter „Offen und in Arbeit“ / „Alle“, Gruppen Sofort/Zeitnah/Geplant, je Maßnahme Ursache, Frist, „Was ist zu tun?“ (mit Unterpunkten weiterer Regeln), Status, Verantwortlich, Notiz, „Ursache entfallen“, Priorität von Hand mit Begründung. Häkchen „vollständig“: Interview fertig und jede offene Maßnahme hat einen Verantwortlichen. E-08 grün, dazu ein Test für die Priorität von Hand.*
- [x] **4.3** Vergleich mit der Vorgängerprüfung (T-V01 bis T-V05, E-09). *`modell/vergleich.ts` (Vorgänger nach 6.9, Statuswert direkt oder über Prozent, Anforderungen und Befunde mit besser/schlechter/neu/entfallen/nicht vergleichbar, Maßnahmen der letzten Prüfung), Anzeige `ui/Vergleich.tsx` in der Auswertung (auch im Bericht nutzbar); die Auswertung zeigt jetzt auch die Anzahl je Stufe der Außenprüfung. T-V01 bis T-V05 und E-09 grün; E-05 auf die neue Anzeige umgestellt.*
- [~] **4.4** Bericht als Druckansicht (E-10). *Umgesetzt: `ui/Bericht.tsx` mit Teil A (Seite 1 mit Statuswert, Netzdiagramm, nicht erfüllten TOP-Anforderungen, fünf wichtigsten Maßnahmen, „keine Zertifizierung“, Vermerk W1; Ergebnis je Anforderung; Handlungsempfehlungen nach Priorität), Teil B (Zusatz) bzw. „entfällt“, Teil C Maßnahmenplan, Vergleich, Anhang mit Unterschriftsfeldern; Kopfzeile „Vertraulich · Betrieb · Datum“ und Seitenzahlen über `@page`, Druck immer hell, jeder Teil auf neuer Seite; Vorschau im Druckbild, „Drucken / als PDF“, Förderhinweise im Schritt Bericht. E-10 grün (Beispielbericht: 9 Seiten A4). Offen: Robin sieht das PDF durch (`npm run bilder` legt es unter `docs/bilder/beispielbericht.pdf` ab).*
- [~] **4.5** ISMS-Brücke und „Methodik und Grenzen“. *Umgesetzt im Anhang des Berichts: Tabelle Themenbereich → Bausteine (IT-Grundschutz-Kompendium, Edition 2023) plus Zeile Außenprüfung, Text „Methodik und Grenzen“ (`ui/berichtTexte.ts`, eigene Formulierungen). Offen: Robin prüft die Zuordnung und gibt den Text frei (F10: Haftungshinweis vor dem ersten bezahlten Auftrag anwaltlich prüfen lassen).*
- [x] **4.6** Beispielbetrieb, README mit Bildern, Stand „0.1.0-web“. *Beispielbetrieb mit abgeschlossener Prüfung (18 von 37, durch Test gesichert), fiktiver Außenprüfung von example.com (gegen den Ablauf über `testdaten/dns/beispiel-zone.json` getestet) und 13 Maßnahmen. README mit Bildern zu Auswertung, Außenprüfung, Maßnahmen, Bericht und Interview sowie Beispielbericht als PDF (`npm run bilder`), Grenzen ergänzt. Version in `package.json`: 0.1.0-web.*

## Phase 5 – Windows-Programm und Website-Prüfung

- [x] **5.1** Tauri 2 nach dem Prozesslotsen 0.2.0. *`src-tauri` mit Kennung `de.olbricht-digital.sicherheitscheck`, Produktname „Sicherheitscheck“, NSIS pro Benutzer (Deutsch), eigenes Symbol (`src-tauri/icons/symbol.svg`, mit `npx tauri icon` erzeugt), Einzelinstanz, Dateizuordnung `.sicherheitscheck` (Rolle Editor), Dialoge in Rust (`oeffnen`, `speichern_unter`, `start_datei`, `als_pdf`), atomares Schreiben, Testantworten für Dialoge nur im Debug-Build, eigene Befehle nur über Rechte (`build.rs`, `capabilities/default.json`), CSP mit DoH zu den beiden Anbietern (E32). Plattformschicht `src/plattform` (Browser: Download und Dateifeld; Programm: Rust-Befehle, Fenstertitel, Speichern vor dem Schließen; das Desktop-Netz wird nur im Programm geladen). IndexedDB bleibt der Speicher. Alle Crates aus 7.2 eingebunden; `cargo tree -i aws-lc-sys` findet nichts (prüft auch `windows.yml`). Debug-Build mit `isSecureContext = true` (D-01). CI: `windows.yml` (Rust-Tests, Prüfung auf aws-lc, Installer bauen, Installer-Test grün), `release.yml` als Entwurf. Auf Robins Wunsch am 11.11.2026 installiert (siehe unten).*
- [x] **5.2** Crate `netzpruefung`: Freigabe, Zielprüfung, Adresssperre. *`src-tauri/netzpruefung` (Workspace-Mitglied, ohne Tauri): `freigabe.rs` (Syntax, PSL mit `psl`, 15 Minuten, eine Freigabe), `ziel.rs` (Schema, Port, Anmeldedaten, Länge, Freigabe; alle IPv4-Bereiche und IPv6 nur 2000::/3 ohne Teredo, Benchmarking, Dokumentation, 6to4; IPv4-gemappt nach IPv4), `umgebung.rs` (Auflösung über das System, alle Adressen müssen öffentlich sein, Verbindung nur zu diesen über `resolve_to_addrs`). T-R01 bis T-R03 und T-R13 grün.*
- [x] **5.3** `doh_abfrage` und `http_abruf`. *reqwest 0.13 ohne Standard-Features mit `rustls-no-provider` und vorkonfigurierter rustls-`ClientConfig` (ring, webpki-roots): nur GET, keine Weiterleitung, kein Proxy, keine Cookies, Verbindung 5 s, gesamt 10 s, Körper nur unter `/.well-known/` bis 64 KiB, nur die zwölf Kopfzeilen aus 7.7, Cookie-Werte durch „…“ ersetzt, Fehlerzuordnung nach 7.7. `doh_abfrage` mit festen Adressen, Typ- und Namensprüfung, 64 KiB, HTTP-Status im Fehler. T-R04 bis T-R08 grün, alle gegen Testserver auf 127.0.0.1. DoH nutzt das Programm vorerst weiter über `fetch` (E34).*
- [x] **5.4** `tls_info`. *rustls mit TLS 1.3 und 1.2, aufzeichnender Prüfer um den `WebPkiServerVerifier`, Handshake läuft immer zu Ende, danach nur `close_notify`; Felder mit x509-parser (Inhaber, Aussteller, SAN, Gültigkeit als ISO-Zeit, Schlüssel, Signatur), `namePasst` mit Platzhalterregel, Fehlercodes nach 7.7, `tls_version` bei Alert protocol_version oder unverträglicher Gegenstelle. T-R09 bis T-R12 und T-R14 grün (Test-CA mit rcgen zur Laufzeit), dazu unbekannte Stelle, noch nicht gültig, Klartext statt TLS, Adresssperre.*
- [x] **5.5** TypeScript-Regeln Website und Desktop-Netz. *`pruefung/web.ts` (Vorprüfung A/AAAA, `folge` mit höchstens 6 Abrufen und ohne fremde Domains, WEB-00 bis WEB-14), `hsts.ts`, `header.ts` (CSP, XCTO, FRAME, REF, XXSS, SRV, COOKIE), `zertifikat.ts` (CERT, TLS), `sectxt.ts`, `website.ts` (Reihenfolge DNS → TLS → HTTP → security.txt → MTA-STS-Richtlinie, Grenzen und Abbruch mit WEB-15), Regeltexte für alle Website-Regeln, `netz/desktop.ts` (HTTP und TLS über Rust, Freigabe vor dem Lauf). Ein Lauf ruft dieselbe Adresse nur einmal ab (E33). T-W01 bis T-W18, T-Z01 bis T-Z07 und T-A02 vollständig grün.*
- [x] **5.6** Desktop-Test. *`npm run desktop:test` (Port 9336): D-01 bis D-04 grün, dazu D-05 (Außenprüfung example.com mit nachgebildeten DoH-Antworten: CSP lässt DoH zu, Vorprüfung ohne Adressen, kein HTTP- oder TLS-Abruf, keine fremde Anfrage), zweiter Start mit Sicherung (Rückfrage), Speichern beim Schließen, keine CSP-Verstöße. Legt die Programmdaten vorher beiseite und stellt sie danach wieder her; bricht ab, solange der Sicherheitscheck läuft.*
- [~] **5.7** Abnahme im Debug-Build. *Gemessen: Installer 2,16 MiB (Release mit LTO, lokal gebaut; vor der Website-Prüfung 1,31 MiB; die CI legt ihn als Artefakt `sicherheitscheck-windows` ab), Programm 5,5 MB. Start über die Desktop-Verknüpfung bis zur Startseite 2,0 s beim allerersten Start (WebView2 legt ihr Profil an) und 2,7 s beim zweiten (gemessen mit Debug-Port, inklusive Start über PowerShell). Offen, nur Robin: M-01 (Lauf gegen eigene Domains nach F12, Stichprobe mit `curl -I` und Zertifikatsanzeige) und M-02 (`doh_abfrage` für `dnssec-failed.org` SOA über beide Anbieter, z. B. in den Entwicklerwerkzeugen des Debug-Builds: `__TAURI_INTERNALS__.invoke('doh_abfrage', { anbieter: 'google', name: 'dnssec-failed.org', typ: 'SOA', ohnePruefung: false })`). Danach DoH im Programm auf `doh_abfrage` umstellen (E34).*

**Installation auf Robins Rechner (11.11.2026, auf seinen ausdrücklichen Wunsch):** `npx tauri build`, Installer `Sicherheitscheck_0.1.0-desktop_x64-setup.exe` still (`/S`) pro Benutzer ausgeführt. Programm unter `%LOCALAPPDATA%\Sicherheitscheck\sicherheitscheck.exe`, Startmenü-Eintrag `Sicherheitscheck` und Verknüpfung `Sicherheitscheck` auf dem Desktop legt der Installer selbst an, `.sicherheitscheck` ist zugeordnet. Startprobe nach beiden Installationen (nach 5.1 und nach 5.5): Start über die Desktop-Verknüpfung, Fenster „Sicherheitscheck“ mit der Startseite, danach geschlossen, kein Prozess übrig. Die zweite Installation lief still über die erste; Verknüpfungen und Daten blieben. Daten des Programms: `%LOCALAPPDATA%\de.olbricht-digital.sicherheitscheck` (WebView2-Profil mit IndexedDB). Neu installieren: Installer erneut still ausführen; die Daten bleiben.

## Weitere Funktionen

- [x] **Export im offenen Format Beratungsakte v1** (13.11.2026). *Knopf „Für die Beratungsakte speichern“ im Schritt Bericht mit Dialog (Mandant vorbelegt, Mandantennummer, Inhalt, Dateiname); Browser: Download, Programm: `speichern_unter` mit Dateiart `beratungsakte`. Abbildung in `src/modell/beratungsakte.ts` (E35), Kopie der Bibliothek 1.0.1 in `src/beratungsakte/`, Beispiele in `testdaten/beratungsakte/`. Tests: Unit (Beispielbetrieb mit den README-Werten, alle Stufen, Grenzfälle, Kopie der Bibliothek), Browsertests mit axe hell und dunkel, Rust-Test für Dateiart und Endung, Schritt im Desktop-Test.*
  - [x] Nacharbeit (13.11.2026): Hinweise der Außenprüfung als `hinweis` statt `niedrig`, Test für verworfene Maßnahmen (bleiben mit `status` in der Akte), Hinweis im Dialog „Die Datei ist unverschlüsselt und enthält Daten des Mandanten.“

## Phase 6 – Abnahme und Portfolio (später)

- [ ] **6.1** Probe-Check mit dem fiktiven Betrieb.
- [ ] **6.2** Mängel beheben, Tastatur, Barrierefreiheit, Druckbild.
- [~] **6.3** Doku: README, `docs/datenmodell.md`, `docs/regeln.md`, Lizenzliste. *README für Besucher (Download, Installation, Haftung, Rechte) und Lizenzliste [lizenzen.md](lizenzen.md) zur Version 0.1.0. Offen: `docs/datenmodell.md`, `docs/regeln.md`.*
- [x] **6.4** Version 0.1.0 getaggt und veröffentlicht (12.11.2026, Release https://github.com/edgebird-lab/sicherheitscheck/releases/tag/v0.1.0, Installer 2.265.917 Bytes, anonymer Download geprüft). *Auf Robins Entscheidung vom 11.11.2026 abweichend von der Spezifikation: Das Repo wird öffentlich, das Release v0.1.0 wird veröffentlicht, vorerst ohne Lizenz (F11). Version einheitlich 0.1.0 in `package.json`, `tauri.conf.json`, `Cargo.toml` und in der App (vorher 0.1.0-desktop). `release.yml` hängt außer `Sicherheitscheck_<Version>_x64-setup.exe` eine Kopie mit festem Namen `Sicherheitscheck-Setup.exe` an; die Website verlinkt `releases/latest/download/Sicherheitscheck-Setup.exe`.*
- [x] **6.5** Version 0.2.0 (13.11.2026): Export „Für die Beratungsakte speichern“ samt Nacharbeit (siehe „Weitere Funktionen“). Version in `package.json`, `tauri.conf.json` und `Cargo.toml`. Geprüft: Lint, Unit-Tests, Build, Browsertests (`--workers=2`), `cargo test --workspace`. `npm run desktop:test` nicht gelaufen, weil Robins Sicherheitscheck lief (der Test bricht dann ab). Tag `v0.2.0`, Release-Entwurf von `release.yml`, nach Prüfung veröffentlicht.

## Durchsicht vom 11.11.2026 (Phasen 1 bis 4)

Geprüft gegen die Spezifikation für den gebauten Umfang. Was angesehen wurde:

- **Fachlogik nachgerechnet:** eigene Stichproben mit Rechnung im Kommentar in `src/modell/stichproben.test.ts` (gemischte Relevanz: 28 von 35 Punkten = 80 %, Anteile je Themenbereich, Punkte im Netzdiagramm, Fristen über Jahreswechsel, Schaltjahr und Sommerzeit, Maßnahmen beim Abschluss und nach geänderter Antwort, Vergleich bei geänderter Relevanz über Prozent) und `src/pruefung/stichproben.test.ts` (SPF mit include und redirect auf dasselbe Ziel: 4 Abfragen, Ziel einmal abgefragt; redirect-Kette; redirect zurück auf die Domain = Schleife; DMARC-Werte ohne Groß/klein; Reihenfolge gleich schwerer Regeln). Die Prozentrundung stimmt für jeden möglichen Punktestand (0 bis 37 Punkte, Höchstwert 1 bis 37) mit exakter Ganzzahlrechnung überein. Alle Rechenbeispiele der Spezifikation (Fristen, Prozentwerte, Diagrammpunkte) und die Zahlen des Beispielbetriebs (18 von 37, Themen 2/10, 3/5, 4/6, 5/5, −1/5, 5/6) von Hand bestätigt.
- **Tests:** Jede Test-ID der Spezifikation (T-K bis T-G, E-01 bis E-13) kommt in den Tests vor. Lücken waren Fehlerfälle beim Laden und Speichern im Browser; sie sind jetzt abgedeckt (`e2e/laden.spec.ts`).
- **Oberfläche:** alle sieben Schritte, Startseite und Einstellungen als Bildschirmfoto angesehen (hell, dunkel, Handybreite); axe zusätzlich auf Löschdialog, Rückfrage, Laufanzeige, abgebrochenem Lauf und offenem Prioritätsformular, hell und dunkel: keine Befunde (jetzt ein eigener Browsertest in `e2e/barrierefreiheit.spec.ts`).
- **Druckbild und Export:** Beispielbericht (9 Seiten A4) Seite für Seite im PDF-Betrachter von Edge angesehen: Kopfzeile „Vertraulich · Betrieb · Datum“, Seitenzahlen, jeder Teil auf neuer Seite, nichts abgeschnitten. Export und Import (verschlüsselt, als Kopie, fremde Datei) durch die vorhandenen Browsertests belegt.

Gefunden und behoben (jeweils mit Test):

- **Absturz bei unbekannter Regel:** Ein gespeicherter oder importierter Befund mit einer Regel, die diese Version nicht kennt (etwa Website-Regeln aus einer späteren Version), ließ die Oberfläche beim Öffnen von Außenprüfung, Maßnahmen oder Bericht leer zurück („Unbekannte Regel …“, ohne Ausweg). Laden und Import prüfen jetzt Haupt- und weitere Regeln jedes Befunds: Beim Laden wird der Betrieb übersprungen und gemeldet (die Daten bleiben gespeichert), der Import wird abgelehnt. Tests in `src/speicher/pruefen.test.ts` und `e2e/laden.spec.ts`.
- **Absturz bei unvollständigem Ergebnis:** Ein eingefrorenes Ergebnis ohne Werte für jeden Themenbereich ließ Auswertung und Bericht abstürzen (Tabelle zum Netzdiagramm). Jetzt beim Laden und Import geprüft.
- **Zweiter Entwurf ohne Rückfrage:** „Wiederholungsprüfung“ legte auch dann sofort eine weitere Prüfung an, wenn schon ein Entwurf bestand (ein Doppelklick ergab zwei Entwürfe mit doppelt übernommenen Maßnahmen). Jetzt fragt sie nach wie „Neue Prüfung“ (E30).
- Hinweis bei mehreren übersprungenen Einträgen hieß „… ließen sich nicht laden und wird übersprungen“; jetzt „werden“.
- Gesperrte Entfernen-Knöpfe (✕) in abgeschlossenen Prüfungen sahen aus wie bedienbare.

Neue Browsertests: beschädigte Einträge beim Laden (Hinweis, übriger Betrieb bleibt nutzbar, nichts wird gelöscht), Daten einer neueren Version, Arbeiten ohne IndexedDB, Speicherfehler mit Anzeige und erneutem Versuch, Rückfrage bei weiterer Wiederholungsprüfung, axe auf Dialogen und während der Außenprüfung. Stand danach: 301 Unit-Tests in 30 Dateien, 33 Browsertests, Lint und Build grün.

Nicht geändert, aber notiert: Die Startseite zählt offene Maßnahmen nur der neuesten Prüfung; legt der Berater statt einer Wiederholung eine leere „Neue Prüfung“ an, zeigt sie bis zu deren Abschluss 0 offene Maßnahmen, obwohl die letzte abgeschlossene Prüfung noch offene hat. Eine Fehlergrenze (Error Boundary) für unerwartete Anzeigefehler fehlt; die bekannten Ursachen fängt jetzt die Prüfung beim Laden ab.

## Übergabe

**Repo:** öffentlich auf GitHub seit 12.11.2026 (`edgebird-lab/sicherheitscheck`, Zweig `main`). CI: `ci.yml` bei jedem Push, `windows.yml` bei Änderungen an `src-tauri`, `src/plattform`, `package*.json` oder von Hand, `release.yml` nur bei Tags (Entwurf).

**Stand 0.1.0-web:** Phasen 1 bis 4 sind umgesetzt, alle Tests grün (Zahlen in der README). Die Web-Version ist nutzbar (Schnittlinie R13).

**Offen für Robin (morgens):**
- 5.7: M-01 und M-02 im installierten Programm oder im Debug-Build (Anleitung bei 5.7 oben).
- Phase 0: Norm besorgen, F1 bis F6 entscheiden (Annahmen in `entscheidungen.md`), Katalog abgleichen (`katalog-abgleich.md`), Regeln gegen die RFCs prüfen (`rfc-abgleich.md`).
- 4.4: Beispielbericht durchsehen (`docs/bilder/beispielbericht.pdf`, neu erzeugen mit `npm run bilder`).
- 4.5: Zuordnung der ISMS-Brücke und den Text „Methodik und Grenzen“ freigeben (`src/ui/berichtTexte.ts`); F10 anwaltlich prüfen lassen.
- F15: Mustersatz fürs Angebot steht in `entscheidungen.md` (F15).

**Nächste Schritte:** Robins Abnahme 5.7 (M-01 mit eigenen Domains, M-02 für DoH über Rust), danach DoH im Programm auf `doh_abfrage` umstellen und die CSP auf die Brücke zu Rust beschränken (E34). Dann Phase 6 (Probe-Check, Doku, Lizenzliste mit CDLA-Permissive-2.0 für webpki-roots).

**Fallstricke:**
- `npx tauri build` baut `dist` ohne den CSP-Meta-Tag (die Tauri-CLI setzt `TAURI_ENV_PLATFORM`). Vor Browsertests mit einem schon laufenden Vorschau-Server deshalb `npm run build`.
- Der gemeinsame Zielordner `C:/Users/Robin/AppData/Local/cargo-ziel` enthält unter `release/bundle/nsis` auch Installer anderer Apps; den richtigen über den Namen `Sicherheitscheck_*-setup.exe` wählen. `installer-test.ps1` deinstalliert am Ende und läuft nur in der CI.
- `npm run desktop:test` nutzt dieselben Programmdaten wie das installierte Programm (gleiche Kennung). Er benennt sie vorher in `…sicherheitscheck.desktop-test-sicherung` um und danach zurück; läuft das Programm, bricht er ab. Bleibt nach einem harten Abbruch die Sicherung liegen, meldet der nächste Lauf das; dann von Hand zurückbenennen.
- Windows wiederholt Verbindungsversuche zu einem geschlossenen Port rund 2 s lang; Rust-Tests für „keine Verbindung“ brauchen deshalb mehr als 2 s Zeitlimit.
- Playwright nutzt einen schon laufenden Server auf Port 4181 wieder und baut dann nicht neu. Vor `npm run e2e` keinen eigenen `vite preview` laufen lassen oder vorher `npm run build`. `netstat` zeigt den Vorschau-Server in der Git Bash nicht zuverlässig an; prüfen mit `curl -s -o /dev/null -w '%{http_code}' http://localhost:4181/` oder `Get-NetTCPConnection -LocalPort 4181`.
- Die Tests mit vollen Argon2-Parametern brauchen unter Last mehrere Sekunden (Zeitlimit 30 s).
- Optionsfelder sind unsichtbar über die ganze Option gelegt; in Tests `getByRole('radio', { name, exact: true }).check()` nutzen, nicht den Text anklicken.
- Ein von der Agentensitzung gestarteter `vite preview` auf Port 4181 (PID 54340) ließ sich wegen der Berechtigungen nicht beenden. Er liefert immer den aktuellen Inhalt von `dist` aus; vor Browsertests deshalb `npm run build`. Beenden mit `taskkill /PID 54340 /F` oder nach einem Neustart erledigt.
- E-13 macht rund 25 axe-Durchläufe und hat deshalb ein Zeitlimit von 90 s (`test.slow()`); unter Last durch parallel testende Apps braucht es 30 bis 45 s. Dasselbe Zeitlimit haben seit der Durchsicht E-04 (26 Karten per Tastatur), E-05 (26 Bestätigungen), E-10 (PDF), E-11 (dreimal Argon2id) und der axe-Test für Dialoge: Bei rund 140 Edge-Prozessen anderer Apps auf diesem Rechner überschritten E-04, E-10 und E-11 die üblichen 30 s, mit 11 Arbeitern sogar E-13 die 90 s. Deshalb startet Playwright lokal höchstens 4 Browser gleichzeitig (`workers` in `playwright.config.ts`, änderbar mit `SC_WORKERS`); der ganze Lauf dauert damit gut eine Minute.
- Testdaten für DNS stehen in `testdaten/dns`; Unit-Tests laden sie mit `import.meta.glob`, Browsertests mit `readFileSync` (`e2e/hilfen.ts`, `dohNachbilden`).

## Protokoll

| Datum | Schritt | Commit |
|---|---|---|
| 11.11.2026 | 1.1 Gerüst | 2dd51a1 |
| 11.11.2026 | 1.2 Katalog in eigenen Formulierungen | 7e21f2a |
| 11.11.2026 | 1.3, 1.4 Bewertung und Operationen | 8d06ac4 |
| 11.11.2026 | 1.5 Speicher | 40d6bc8 |
| 11.11.2026 | 1.6 Export und Import | c6c0316 |
| 11.11.2026 | 2.1 bis 2.5 Oberfläche | 23f28c5 |
| 11.11.2026 | 2.5, 2.6 Barrierefreiheit, Bilder, README | d1baea2 |
| 11.11.2026 | Durchsicht: Kennung der Fragekarte | 2bb6b6e (Achtung: in diesem Commit lief ein Unit-Test wegen Last in sein Zeitlimit; behoben im nächsten) |
| 11.11.2026 | Zeitlimit für Argon2-Tests | 45d7ece |
| 11.11.2026 | 3.1 Netz-Schnittstelle, DoH, Lauf | 0f1a572 |
| 11.11.2026 | 3.2 MX und SPF, Regeltexte | 163d1ea |
| 11.11.2026 | 3.3 DMARC und DKIM | b1a2999 |
| 11.11.2026 | 3.4 MTA-STS, TLS-RPT, DNSSEC, CAA | a326454 |
| 11.11.2026 | 3.5 Ablauf und Schritt Außenprüfung | 7ae9c9e |
| 11.11.2026 | 4.1 Maßnahmen ableiten und abgleichen | ecc12c8 |
| 11.11.2026 | 4.2 Schritt Maßnahmen, Beispiel mit Außenprüfung | 371144b |
| 11.11.2026 | 4.3 Vergleich | 9dfc141 |
| 11.11.2026 | 4.4, 4.5 Bericht, ISMS-Brücke, Methodik | 31c7b76 |
| 11.11.2026 | 4.6 README, Bilder, Beispielbericht, 0.1.0-web | 9f1a382 |
| 11.11.2026 | Startseite: überfällige Frist | f9028fb |
| 11.11.2026 | Durchsicht Phase 1 bis 4: Prüfung beim Laden, Rückfrage bei Wiederholung, Tests für Lade- und Speicherfehler | de085c5 |
| 11.11.2026 | Doku: Durchsicht im Protokoll | 641dc6e (Achtung: vor diesem Commit liefen E-04, E-10 und E-11 wegen Last in ihr Zeitlimit; derselbe Code war im Lauf davor vollständig grün; behoben im nächsten) |
| 11.11.2026 | Browsertests unter Last: Zeitlimit 90 s für die schweren, lokal 4 Arbeiter | Commit nach 641dc6e |
| 11.11.2026 | 5.1, 5.6 Windows-Programm: Tauri 2, Plattformschicht, Desktop-Test, CI | bfb64b0 |
| 11.11.2026 | CI: Prüfung auf aws-lc in bash | 47d4fbf |
| 11.11.2026 | 5.2 bis 5.5 Netzprüfung in Rust, Website-Regeln, Desktop-Netz | b38b1c4 |
| 11.11.2026 | Doku Phase 5, Installation auf Robins Rechner | Commit nach b38b1c4 |
