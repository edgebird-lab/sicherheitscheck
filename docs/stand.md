# Sicherheitscheck – Stand der Arbeit

Checkliste aller Phasen und Schritte aus [spezifikation.md](spezifikation.md), Abschnitt 11. `[x]` erledigt, `[ ]` offen, `[~]` teilweise. Nach jedem Schritt aktualisieren, damit ein Nachfolger hier weitermachen kann. Annahmen stehen in [entscheidungen.md](entscheidungen.md).

Letzte Aktualisierung: 11.11.2026

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
- [ ] **1.5** Speicher: Prüffunktionen, Migrationsgerüst, IndexedDB-Adapter, Tab-Sperre (T-L01 bis T-L03).
- [ ] **1.6** Export und Import mit Argon2id und AES-GCM im Web Worker (T-E01 bis T-E09).

## Phase 2 – Interview und Auswertung

- [ ] **2.1** Rahmen: Schrittleiste, Hell/Dunkel, Startseite, Einstellungen, Sicherungshinweis, Export/Import (E-01, E-02, E-11, E-12).
- [ ] **2.2** Schritte Betrieb und Vorgespräch (E-03).
- [ ] **2.3** Schritt Interview (E-04).
- [ ] **2.4** Wiederholungsprüfung in der Oberfläche (E-05).
- [ ] **2.5** Schritt Auswertung mit Netzdiagramm (T-G01, T-G02, E-04 mit Statuswert, Bild in `docs/bilder`).
- [ ] **2.6** Barrierefreiheit aller bisherigen Schritte, hell und dunkel (E-13).

## Phase 3 – Außenprüfung DNS

- [ ] **3.1** Domainprüfung, Netz-Schnittstelle, Browser-DoH, TXT, DNS-Status, Zwischenspeicher, Testnetz (T-D01 bis T-D08, T-N01 bis T-N09).
- [ ] **3.2** MX und SPF (T-MX01, T-MX02, T-S01 bis T-S16).
- [ ] **3.3** DMARC und DKIM (T-M01 bis T-M12, T-DK01 bis T-DK05).
- [ ] **3.4** MTA-STS, TLS-RPT, DNSSEC, CAA (T-T01 bis T-T10, T-RP01 bis T-RP03, T-DS01 bis T-DS04, T-CA01 bis T-CA04).
- [ ] **3.5** Ablaufsteuerung und Schritt Außenprüfung (T-A01 bis T-A05, E-06, E-07).

## Phase 4 – Maßnahmen, Vergleich, Bericht

- [ ] **4.1** Maßnahmen ableiten, priorisieren, sortieren, abgleichen (T-P01 bis T-P08).
- [ ] **4.2** Schritt Maßnahmen (E-08).
- [ ] **4.3** Vergleich mit der Vorgängerprüfung (T-V01 bis T-V05, E-09).
- [ ] **4.4** Bericht als Druckansicht (E-10).
- [ ] **4.5** ISMS-Brücke und „Methodik und Grenzen“.
- [ ] **4.6** Beispielbetrieb, README mit Bildern, Stand „0.1.0-web“.

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

## Protokoll

| Datum | Schritt | Commit |
|---|---|---|
| 11.11.2026 | 1.1 Gerüst | 2dd51a1 |
| 11.11.2026 | 1.2 Katalog in eigenen Formulierungen | 7e21f2a |
| 11.11.2026 | 1.3, 1.4 Bewertung und Operationen | Bewertung nach dem Punkteschema, Operationen für Prüfungen |
