# Sicherheitscheck – Hinweise für die Arbeit am Projekt

- Portfolio-Projekt von Robin (Wirtschaftsinformatik, olbricht-digital). Repo `edgebird-lab/sicherheitscheck` ist **privat**; öffentlich erst nach Robins ausdrücklicher Freigabe. Keine GitHub Pages, keine Releases, nichts bereitstellen.
- Gebaut wird nach `docs/spezifikation.md`. Fortschritt mit Häkchen in `docs/stand.md` (nach jedem Schritt aktualisieren), Annahmen bis zu Robins Entscheidung in `docs/entscheidungen.md`, Abgleich des Katalogs mit der Norm in `docs/katalog-abgleich.md`.
- Sprache: Oberfläche, Fachbegriffe im Code, Doku und Commit-Nachrichten auf Deutsch. Keine KI-Funktionen; Kundendaten bleiben auf dem Rechner.
- Fachlogik in `src/katalog`, `src/modell`, `src/pruefung`, `src/speicher` ohne React und vollständig getestet; Oberfläche in `src/ui`.
- Vor jedem Commit: `npm run lint`, `npm test`, `npm run build` und `npm run e2e` (lokal mit Edge auf Port 4181; 4173 gehört dem Prozesslotsen, mehrere Apps laufen parallel). Die CI prüft Lint, Unit-Tests und Build. Läuft schon ein Server auf 4181, nutzt Playwright ihn ohne neuen Build; dann vorher `npm run build`.
- Normtext: Die DIN SPEC 27076 ist urheberrechtlich geschützt. Keine Leitfragen, Anforderungs- oder Empfehlungstexte aus der Norm übernehmen, nur eigene Formulierungen. Die PDF liegt nur lokal in `normen/` (steht in `.gitignore`). „CyberRisikoCheck“ nicht als Namen verwenden.
- Keine Live-Abfragen fremder Domains in Tests: DNS- und Website-Prüfungen nur mit aufgezeichneten oder nachgebildeten Antworten. Ablauf- und Browsertests nutzen `example.com`.
- Windows-Programm (ab Phase 5): Den Installer nie auf Robins Rechner ausführen; das prüft die CI.
- Zahlen in der README zum Beispielbetrieb sind durch Tests abgesichert (`src/modell/beispiel.test.ts`); bei Änderungen am Beispiel beide anpassen.
