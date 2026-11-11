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
- [ ] **3.3** DMARC und DKIM (T-M01 bis T-M12, T-DK01 bis T-DK05).
- [ ] **3.4** MTA-STS, TLS-RPT, DNSSEC, CAA (T-T01 bis T-T10, T-RP01 bis T-RP03, T-DS01 bis T-DS04, T-CA01 bis T-CA04).
- [ ] **3.5** Ablaufsteuerung und Schritt Außenprüfung (T-A01 bis T-A05, E-06, E-07).

## Phase 4 – Maßnahmen, Vergleich, Bericht

- [ ] **4.1** Maßnahmen ableiten, priorisieren, sortieren, abgleichen (T-P01 bis T-P08).
- [ ] **4.2** Schritt Maßnahmen (E-08).
- [ ] **4.3** Vergleich mit der Vorgängerprüfung (T-V01 bis T-V05, E-09).
- [ ] **4.4** Bericht als Druckansicht (E-10).
- [ ] **4.5** ISMS-Brücke und „Methodik und Grenzen“.
- [~] **4.6** Beispielbetrieb, README mit Bildern, Stand „0.1.0-web“. *Beispielbetrieb vorgezogen (`modell/beispiel.ts`, Test sichert 18 von 37); README-Bilder und Stand 0.1.0-web offen.*

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

**Nächste Schritte (Phase 3):** `src/netz/schnittstelle.ts`, `browser.ts` (DoH für Cloudflare und Google nach 6.4), `testnetz.ts` mit Fixtures unter `testdaten/`; Regeln in `src/pruefung/*.ts` nach 6.5 mit `stufen.ts` und `src/katalog/regeltexte.ts`; Ablauf `ablauf.ts` nach 6.7; dann `ui/schritte/AussenSchritt.tsx` (heute ein Platzhalter) mit Bestätigung. Die Domainprüfung `pruefung/domain.ts` (6.3) steht schon.

**Offene Haken für Phase 4:**
- `abschliessen` in `src/modell/operationen.ts` gleicht die Maßnahmen noch nicht ab (6.8); der Abgleich gehört dorthin, nach jeder Außenprüfung und beim Öffnen des Schritts Maßnahmen.
- `ui/schritte/MassnahmenSchritt.tsx` und die Druckansicht in `BerichtSchritt.tsx` sind Platzhalter; der Abschluss mit Fehlerliste steht schon.
- Die Auswertung zeigt statt des Vergleichs (6.9) nur den Statuswert der Vorgängerprüfung.
- `schrittVollstaendig` in `src/modell/fortschritt.ts` hat für „massnahmen“ und „aussen“ vorläufige Regeln.

**Fallstricke:**
- Playwright nutzt einen schon laufenden Server auf Port 4181 wieder und baut dann nicht neu. Vor `npm run e2e` keinen eigenen `vite preview` laufen lassen oder vorher `npm run build`.
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
