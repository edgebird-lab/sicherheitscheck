# Sicherheitscheck – Stand der Arbeit

Checkliste aller Phasen und Schritte aus [spezifikation.md](spezifikation.md), Abschnitt 11. `[x]` erledigt, `[ ]` offen, `[~]` teilweise. Nach jedem Schritt aktualisieren, damit ein Nachfolger hier weitermachen kann. Annahmen stehen in [entscheidungen.md](entscheidungen.md).

Letzte Aktualisierung: 11.11.2026, nach Phase 2 (Stand: Phase 1 und 2 fertig, Phase 0 teilweise)

## Phase 0 – Klären und Katalog

- [ ] **0.1** Robin lädt die DIN SPEC 27076 und legt sie unter `normen/` ab; entscheidet F1 bis F6. *Offen, nur Robin.*
- [ ] **0.2** Katalog- und Berichtsabgleich mit der Norm. *Offen: braucht die Norm.*
- [~] **0.3** Eigene Formulierungen für 27 Anforderungen und alle Vorfragen. *Geschrieben: `src/katalog`, alle Texte in `docs/katalog-texte.md` (aus dem Code erzeugt). Offen: Robins Prüfung gegen die Norm und Freigabe in `docs/katalog-abgleich.md`.*
- [ ] **0.4** Regeln aus 6.5 und 6.6 gegen die nicht geöffneten Standards prüfen. *Offen.*

## Phase 1 – Gerüst, Datenmodell, Bewertung

- [x] **1.1** Projekt wie den Prozesslotsen anlegen. *Vite 8, React 19, TypeScript 7, Vitest 5, oxlint, Playwright mit Edge auf Port 4181, CSP im Build, `normen/` in `.gitignore`. CI nur mit Lint, Test und Build (Vorgabe des Auftrags, siehe entscheidungen.md).*
- [x] **1.2** `typen.ts` nach Abschnitt 4 und Katalog. *T-K01 bis T-K03 grün. Katalog vorläufig (27 Anforderungen, 6/5/4/3/3/6 je Thema, Nummern 1.1–6.6, vier Vorfragen); `KATALOG_ABGEGLICHEN = false` zeigt das in der Oberfläche an. Test hält `docs/katalog-abgleich.md` und `docs/katalog-texte.md` mit dem Code synchron.*
- [x] **1.3** `bewertung.ts`: Punkte, Statuswert, Themen, Relevanz. *T-B01 bis T-B12 grün (T-B06 zusätzlich über eine Vorfrage). Prüfmeldung R1 für „nicht relevant“, wo die Regel es nicht erlaubt.*
- [x] **1.4** Operationen: Betrieb und Prüfung anlegen, Antwort setzen, Vorfragen, abschließen, wieder öffnen, Wiederholungsprüfung. *T-O01 bis T-O06 grün. Der Maßnahmenabgleich beim Abschließen (6.8) fehlt noch und kommt mit 4.1 (Kommentar in `abschliessen`).*
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
- [~] **4.6** Beispielbetrieb, README mit Bildern, Stand „0.1.0-web“. *Beispielbetrieb vorgezogen (`modell/beispiel.ts`, Test sichert 18 von 37), seit 4.2 mit fiktiver Außenprüfung (Tests prüfen sie gegen den Ablauf über `testdaten/dns/beispiel-zone.json`) und 13 Maßnahmen (eine erledigt, eine in Arbeit). README-Bilder und Stand 0.1.0-web offen.*

## Phase 5 – Windows-Programm und Website-Prüfung (später)

- [ ] **5.1** Tauri 2 nach dem Prozesslotsen 0.2.0.
- [ ] **5.2** Crate `netzpruefung`: Freigabe, Zielprüfung, Adresssperre.
- [ ] **5.3** `doh_abfrage` und `http_abruf`.
- [ ] **5.4** `tls_info`.
- [ ] **5.5** TypeScript-Regeln Website und Desktop-Netz.
- [ ] **5.6** Desktop-Test.
- [ ] **5.7** Abnahme im Debug-Build.

## Phase 6 – Abnahme und Portfolio (später)

- [ ] **6.1** Probe-Check mit dem fiktiven Betrieb.
- [ ] **6.2** Mängel beheben, Tastatur, Barrierefreiheit, Druckbild.
- [ ] **6.3** Doku: README, `docs/datenmodell.md`, `docs/regeln.md`, Lizenzliste.
- [ ] **6.4** Version 0.1.0 taggen (Repo bleibt privat).

## Übergabe

**Repo:** lokal unter `main`, nicht auf GitHub. Das Anlegen des privaten Repos (`gh repo create edgebird-lab/sicherheitscheck --private --source . --remote origin`) hat das Berechtigungssystem der Agentensitzung als Upload abgelehnt; deshalb gibt es weder Remote noch Push und noch keinen CI-Lauf. Robin kann es selbst nachholen:

```bash
gh repo create edgebird-lab/sicherheitscheck --private --source . --remote origin
git push -u origin main
```

**Phase 3 ist fertig.** Für Phase 5.5 offen: In `pruefung/ablauf.ts` fehlen im Windows-Programm TLS (Schritt 3 aus 6.7) und die HTTP-Ketten mit den Website-Regeln aus 6.6 (Schritt 4); die Stelle ist im Code markiert. Die MTA-STS-Richtlinie ruft der Ablauf im Windows-Programm schon ab.

**Offene Haken für Phase 4:**

**Fallstricke:**
- Playwright nutzt einen schon laufenden Server auf Port 4181 wieder und baut dann nicht neu. Vor `npm run e2e` keinen eigenen `vite preview` laufen lassen oder vorher `npm run build`. `netstat` zeigt den Vorschau-Server in der Git Bash nicht zuverlässig an; prüfen mit `curl -s -o /dev/null -w '%{http_code}' http://localhost:4181/` oder `Get-NetTCPConnection -LocalPort 4181`.
- Die Tests mit vollen Argon2-Parametern brauchen unter Last mehrere Sekunden (Zeitlimit 30 s).
- Optionsfelder sind unsichtbar über die ganze Option gelegt; in Tests `getByRole('radio', { name, exact: true }).check()` nutzen, nicht den Text anklicken.

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
