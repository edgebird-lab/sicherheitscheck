# Sicherheitscheck – Entscheidungen und Annahmen

Robin hat die offenen Fragen der Spezifikation noch nicht beantwortet. Damit die Arbeit weitergeht, gilt jeweils der Vorschlag der Spezifikation oder die naheliegendste Empfehlung, gekennzeichnet als **Annahme, bis Robin entscheidet**. Jede Annahme lässt sich ändern; die Spalte „Wirkung“ sagt, wo.

## Offene Fragen der Spezifikation (10.2)

| Nr. | Frage | Annahme, bis Robin entscheidet | Wirkung im Code |
|---|---|---|---|
| F1 | Name „Sicherheitscheck“ oder „Sicherheitslotse“? | Der Vorschlag der Spezifikation ist „Sicherheitslotse“. Umgesetzt bleibt vorerst **„Sicherheitscheck“**: Auftrag, Ordner, Repo, Dateiendung `.sicherheitscheck` und Datenbankname heißen so, und eine Umbenennung sollte einmal und vor Version 0.1.0 geschehen, nicht nebenbei. Empfehlung: vor 0.1.0 entscheiden; bis dahin kostet die Umbenennung wenig. „CyberRisikoCheck“ wird nicht als Name verwendet. | Anzeigename an einer Stelle (`src/ui/marke.ts`) |
| F2 | BSI-Schulung machen? Bis dahin „Check nach DIN SPEC 27076“? | ja und ja | Oberfläche und Bericht sagen sachlich „nach DIN SPEC 27076“, kein Logo |
| F3 | Lizenz bei DIN Media anfragen oder eigene Formulierungen? | eigene Formulierungen | `src/katalog`, Abgleich in `docs/katalog-abgleich.md` |
| F4 | DoH-Anbieter Cloudflare oder Google? | Cloudflare als Standard, Google wählbar | `Einstellungen.dohAnbieter` (ab Phase 3 wirksam) |
| F5 | Exportdatei standardmäßig verschlüsseln? | ja, abschaltbar | Exportdialog |
| F6 | Fristen 14 / 90 / 180 Tage für Priorität 1 / 2 / 3? | ja | Phase 4.1 |
| F7 | Reichen Unterschriftsfelder auf dem Ausdruck? | ja für 0.1 | Phase 4.4 |
| F8 | Fördermittel: eigene Liste oder Links und Freitext? | Links und Freitext | Feld `Pruefung.foerderhinweise`, Bericht in Phase 4.4 |
| F9 | Datenschutz mit Kunden (Rechtsgrundlage, AV-Vertrag, Aufbewahrung)? | mit einer Datenschutzberatung klären; im Code nichts | – |
| F10 | Haftungshinweis anwaltlich prüfen lassen? | vor dem ersten bezahlten Auftrag | Text „Methodik und Grenzen“ (Phase 4.5) |
| F11 | Lizenz der App; Repo privat? | Lizenz offen, Repo privat bis zur Freigabe | README |
| F12 | Eigene Domains für Testläufe? | olbricht-digital und VPS-Domains, erst bei der Abnahme M-01 (Phase 5.7) | keine; Tests nutzen nur aufgezeichnete Antworten |
| F13 | Probe-Kunde für einen echten Check? | nach Phase 6 | – |
| F14 | Web-Version nur lokal oder öffentlich? | nur lokal (`npm run dev`, `vite preview`) | keine Bereitstellung |
| F15 | Angebot nennt Außenprüfung mit Domain und Zeitraum? | ja, Mustersatz fürs Angebot folgt mit Phase 3 | – |

## Eigene Entscheidungen bei der Umsetzung

| Nr. | Entscheidung | Grund |
|---|---|---|
| E1 | Die CI (`.github/workflows/ci.yml`) prüft nur Lint, Unit-Tests und Build. Die Browsertests laufen lokal vor jedem Commit. | Vorgabe des Auftrags („CI nur mit lint, test und build“); weicht von Spezifikation 7.9 ab, die Playwright auch in der CI vorsieht. Nachrüsten heißt: eine Zeile `npx playwright test` in `ci.yml`. |
